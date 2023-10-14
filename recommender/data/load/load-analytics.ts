import fs from "fs";
import { faker } from "@faker-js/faker";
import { Collection, MongoClient, ObjectId } from "mongodb";

interface DemoDocument {}

const help = "npm --items=items-dict.json run load-analytics";

const uri = process.env.SINGLESTORE_KAI_URI;
if (uri === undefined) {
  console.log("must set SINGLESTORE_KAI_URI");
  process.exit(1);
}

const items = process.env.npm_config_items;
if (items === undefined) {
  console.log(help);
  process.exit(1);
}

const itemsFull = fs.readFileSync(items, "utf8");
const itemsLines = itemsFull.split("\n");

const itemsDict: { [key: string]: string[] } = {};

for (const ll of itemsLines) {
  if (ll == "") {
    continue;
  }
  const parsed = JSON.parse(ll.trim().toLowerCase());
  itemsDict[parsed.item] = parsed.products;
}

const maxConcurrentBatches = 16;
const numItemsPerBatch = 1000;
const dbn = "now";
const collection = "analytics";

const loadResult = load(uri);

loadResult.then(() => {
  console.log("done");
  process.exit(0);
});

async function load(uri: string): Promise<void> {
  const numBatches = 10000000;

  console.log("connecting to " + uri);
  const mc = new MongoClient(uri);
  const db = mc.db(dbn);
  const col = db.collection<DemoDocument>(collection);

  await mc.connect();
  try {
    await col.drop();
  } catch {}

  await db.createCollection(collection, {
    timeseries: { timeField: "ts" },
    indexes: [
      { name: "pid_1", key: { pid: 1 } },
      { name: "from_1", key: { from: 1 } },
    ],
  } as any);

  console.log("connected");
  console.log("loading documents");

  const start = new Date();
  let lastCountTime = start;
  let lastCount = await col.estimatedDocumentCount();

  const checker = (async function () {
    while (true) {
      const now = new Date();
      const count = await col.estimatedDocumentCount();
      const elapsed = now.getTime() - start.getTime();
      const elapsedSeconds = (elapsed / 1000).toFixed(3);
      const docsPerSecond = (
        (count - lastCount) /
        ((now.getTime() - lastCountTime.getTime()) / 1000)
      ).toFixed(0);
      console.log(
        elapsedSeconds.padStart(10) +
          " " +
          count +
          " (" +
          docsPerSecond +
          " docs/sec)"
      );
      lastCountTime = now;
      lastCount = count;
      await delay(10000);
    }
  })();

  await runLoad(col, [], maxConcurrentBatches, numBatches, numItemsPerBatch);

  const elapsedSeconds = (
    (new Date().getTime() - start.getTime()) /
    1000
  ).toFixed(3);
  console.log(
    elapsedSeconds.padStart(10) + " " + (await col.estimatedDocumentCount())
  );
}

async function runLoad(
  col: Collection<DemoDocument>,
  outstanding: Promise<number>[],
  maxConcurrentBatches: number,
  numBatches: number,
  numItemsPerBatch: number
) {
  for (let i = 0; i < maxConcurrentBatches; ++i) {
    let index = outstanding.length;
    outstanding.push(
      loadBatch(i, col, numItemsPerBatch).then(() => {
        return index;
      })
    );
  }

  for (let i = maxConcurrentBatches; i < numBatches; ++i) {
    let index = await Promise.any(outstanding);
    outstanding[index] = loadBatch(i, col, numItemsPerBatch).then(() => {
      return index;
    });
  }

  await Promise.all(outstanding);
}

const itemsDictKeys = Object.keys(itemsDict);

async function loadBatch(
  batchNumber: number,
  col: Collection<DemoDocument>,
  numItemsPerBatch: number
) {
  const bulk = col.initializeUnorderedBulkOp();
  for (let i = 0; i < numItemsPerBatch; ++i) {
    const ts = new Date();
    const itemsKey =
      itemsDictKeys[Math.floor(Math.random() * itemsDictKeys.length)];
    const maxProduct = Math.floor(Math.random() * itemsDict[itemsKey].length);
    const pid = itemsDict[itemsKey][Math.floor(Math.random() * maxProduct)];
    const maxProduct2 = Math.floor(Math.random() * maxProduct);
    const from = itemsDict[itemsKey][Math.floor(Math.random() * maxProduct2)];
    const item = {
      _id: new ObjectId(faker.database.mongodbObjectId()),
      ts: ts,
      pid: pid,
      from: from,
      page: {
        url: faker.internet.url(),
        referrer: faker.internet.url(),
        duration: Math.random() * 1000,
      },
      browser: {
        name: faker.internet.userAgent(),
        version: Math.random() * 1000,
      },
      location: {
        country: faker.location.country(),
      },
    };
    bulk.insert(item);
  }
  await bulk.execute();
}

function delay(v: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, v);
  });
}
