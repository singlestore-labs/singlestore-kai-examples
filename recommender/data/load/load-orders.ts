import fs from "fs";
import { Collection, MongoClient, Long } from "mongodb";

interface DemoDocument {}

const help = "npm --items=items-dict.json --orders=orders.json run load-orders";

const uri = process.env.SINGLESTORE_KAI_URI;
if (uri === undefined) {
  console.log("must set SINGLESTORE_KAI_URI");
  process.exit(1);
}

const items = process.env.npm_config_items;
const orders = process.env.npm_config_orders;
if (items === undefined || orders === undefined) {
  console.log(help);
  process.exit(1);
}

const itemsFull = fs.readFileSync(items, "utf8");
const itemsLines = itemsFull.split("\n");

const ordersFull = fs.readFileSync(orders, "utf8");
const ordersLines = ordersFull.split("\n");

const itemsDict: { [key: string]: string[] } = {};

for (const ll of itemsLines) {
  if (ll == "") {
    continue;
  }
  const parsed = JSON.parse(ll.trim().toLowerCase());
  itemsDict[parsed.item] = parsed.products;
}

const ordersArray: string[][] = [];

for (const ll of ordersLines) {
  if (ll == "") {
    continue;
  }
  const parsed = JSON.parse(ll.trim().toLowerCase());
  ordersArray.push(parsed.items);
}

const maxConcurrentBatches = 16;
const numOrdersPerBatch = 200;
const dbn = "now";
const collection = "orders";

const loadResult = load(uri);

loadResult.then(() => {
  console.log("done");
  process.exit(0);
});

async function load(uri: string): Promise<void> {
  const numBatches = 10000000;

  console.log("connecting to " + uri);
  const mc = new MongoClient(uri);
  await mc.connect();
  console.log("connected");
  console.log("loading documents");

  const db = mc.db(dbn);

  db.command({
    sql: `DROP TABLE IF EXISTS ${dbn}.${collection}`,
  });

  db.command({
    sql: `CREATE TABLE IF NOT EXISTS ${dbn}.${collection}(_id BIGINT NOT NULL, oid BIGINT NOT NULL, pid LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, PRIMARY KEY (pid, oid), SHARD KEY (pid), KEY (pid))`,
  });

  await delay(1000);

  const col = db.collection<DemoDocument>(collection);

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
      console.log(elapsedSeconds.padStart(10) + " " + count + " (" + docsPerSecond + " docs/sec)");
      lastCountTime = now;
      lastCount = count;
      await delay(10000);
    }
  })();

  await runLoad(col, [], maxConcurrentBatches, numBatches, numOrdersPerBatch);

  const elapsedSeconds = ((new Date().getTime() - start.getTime()) / 1000).toFixed(3);
  console.log(elapsedSeconds.padStart(10) + " " + (await col.estimatedDocumentCount()));
}

async function runLoad(
  col: Collection<DemoDocument>,
  outstanding: Promise<number>[],
  maxConcurrentBatches: number,
  numBatches: number,
  numOrdersPerBatch: number
) {
  for (let i = 0; i < maxConcurrentBatches; ++i) {
    let index = outstanding.length;
    outstanding.push(
      loadBatch(i, col, numOrdersPerBatch).then(() => {
        return index;
      })
    );
  }

  for (let i = maxConcurrentBatches; i < numBatches; ++i) {
    let index = await Promise.any(outstanding);
    outstanding[index] = loadBatch(i, col, numOrdersPerBatch).then(() => {
      return index;
    });
  }

  await Promise.all(outstanding);
}

let _id = 0;
let oid = 0;

async function loadBatch(
  batchNumber: number,
  col: Collection<DemoDocument>,
  numOrdersPerBatch: number
) {
  const bulk = col.initializeUnorderedBulkOp();
  for (let i = 0; i < numOrdersPerBatch; ++i) {
    oid++;
    const items = ordersArray[Math.floor(Math.random() * ordersArray.length)];
    const order: { [key: string]: number } = {};
    for (const item of items) {
      if (!itemsDict.hasOwnProperty(item)) {
        continue;
      }
      // simple skew towards best-matching products
      const maxProduct = Math.floor(Math.random() * itemsDict[item].length);
      const product = itemsDict[item][Math.floor(Math.random() * maxProduct)];
      if (order.hasOwnProperty(product)) {
        continue;
      }
      order[product] = 1;
      bulk.insert({
        _id: _id++,
        oid: oid,
        pid: `"${product}"`,
      });
    }
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
