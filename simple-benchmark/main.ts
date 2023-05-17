import { faker } from "@faker-js/faker";
import { Collection, MongoClient } from "mongodb";

const database = "test";
const collection = "devd";
const maxConcurrentBatches = 16;
const numItemsPerBatch = 1000;
const numBatches = 40000;

interface DemoDocument {}

const uri = process.env.npm_config_mongouri;

if (uri === undefined) {
  console.log("npm --mongouri=<MONGOURI> run main");
  process.exit(1);
}

// Run a simple benchmark loading 40M documents while executing queries at the same time.
const result = benchmark(uri);
result.then(() => {
  console.log("done");
  process.exit(0);
});

// Time a function and return the formatted time in seconds
async function time(q: () => Promise<any>): Promise<string> {
  const start = new Date();
  await q();
  const elapsed = new Date().getTime() - start.getTime();
  const elapsedSeconds = (elapsed / 1000).toFixed(3);
  return elapsedSeconds;
}

// Run a query in a loop, delaying 10 seconds between executions.
// Prints the estimated document count at the start of each execution, the query number, and the execution time.
async function queryInLoop(
  col: Collection<DemoDocument>,
  n: string,
  q: () => Promise<any>
): Promise<void> {
  while (true) {
    await delay(10000);
    const c = await col.estimatedDocumentCount();
    const qr = await time(q);
    console.log(`${c},${n},${qr}`);
  }
}

// Run the data load while queries are executing
async function benchmark(uri: string): Promise<void> {
  const mc = new MongoClient(uri);
  await mc.connect();
  const db = mc.db(database);
  const col = db.collection<DemoDocument>(collection);

  // drop any existing collection
  try {
    await col.drop();
  } catch {}

  // collection created as a time-series collection
  await db.createCollection(collection, {
    timeseries: { timeField: "eventTime" },
  } as any);

  // What is the most recent event sent by any device?
  queryInLoop(col, "q1", () =>
    col
      .aggregate([{ $group: { _id: null, max: { $max: "$eventTime" } } }])
      .toArray()
  );

  // Which five devices have sent the most events?
  queryInLoop(col, "q2", () =>
    col
      .aggregate([
        { $group: { _id: "$deviceId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray()
  );

  // What is the latest status reported for each version 2 device?
  queryInLoop(col, "q3", () =>
    col
      .aggregate([
        { $match: { deviceVersion: 2 } },
        { $sort: { eventTime: -1 } },
        { $group: { _id: "$deviceId", latest: { $first: "$status" } } },
        { $group: { _id: "$latest", count: { $sum: 1 } } },
      ])
      .toArray()
  );

  // What devices have not sent an event in the last hour?
  queryInLoop(col, "q4", () =>
    col
      .aggregate([
        { $sort: { eventTime: -1 } },
        { $group: { _id: "$deviceId", eventTime: { $first: "$eventTime" } } },
        {
          $match: {
            eventTime: { $lt: new Date(new Date().getTime() - 1 * 1000 * 60) },
          },
        },
        { $sort: { eventTime: -1 } },
      ])
      .toArray()
  );

  // What is the average value reported for each location in an ONLINE event?
  queryInLoop(col, "q5", () =>
    col
      .aggregate([
        { $match: { status: "ONLINE" } },
        { $group: { _id: "$deviceLocation", avg: { $avg: "$value" } } },
        { $sort: { avg: 1 } },
      ])
      .toArray()
  );

  // What is the total number of events with either the ADD08 or LOW07 tag?
  queryInLoop(col, "q6", () =>
    col
      .aggregate([
        { $match: { codes: { $in: ["ADD08", "LOW07"] } } },
        { $count: "count" },
      ])
      .toArray()
  );

  // Run the data load while the queries execute in the background
  const start = new Date();
  await runLoad(col);
  const elapsed = new Date().getTime() - start.getTime();
  const elapsedSeconds = (elapsed / 1000).toFixed(3);
  console.log("done loading");
  console.log(elapsedSeconds);

  // wait a bit at the end to ensure some executions at the 40M mark after the data load is complete
  await delay(180000);
}

// Run the data load
async function runLoad(col: Collection<DemoDocument>) {
  const outstanding: Promise<number>[] = [];
  for (let i = 0; i < maxConcurrentBatches; ++i) {
    let index = outstanding.length;
    outstanding.push(
      loadBatch(col).then(() => {
        return index;
      })
    );
  }
  for (let i = maxConcurrentBatches; i < numBatches; ++i) {
    let index = await Promise.any(outstanding);
    outstanding[index] = loadBatch(col).then(() => {
      return index;
    });
  }
}

let c = 0;

// Load a single batch of generated fake data
async function loadBatch(col: Collection<DemoDocument>) {
  const bulk = col.initializeUnorderedBulkOp();
  for (let i = 0; i < numItemsPerBatch; ++i) {
    const item = {
      _id: "e" + c++,
      deviceVersion: Math.ceil(Math.random() * 10),
      deviceLocation: faker.helpers.arrayElement([
        "SEA",
        "SFO",
        "JFK",
        "ATL",
        "BOS",
      ]),
      deviceId: Math.ceil(Math.random() * 10000),
      eventTime: new Date(),
      value: Math.random() * 100,
      status: Math.random() > 0.95 ? "ERROR" : "ONLINE",
      history: Array.from({ length: 5 }, () => Math.random() * 10),
      codes: faker.helpers.arrayElements([
        "LOW01",
        "RST02",
        "FRE03",
        "CST04",
        "ERR05",
        "ERR06",
        "LOW07",
        "ADD08",
        "BAT10",
      ]),
    };
    bulk.insert(item);
  }
  await bulk.execute();
}

// Delay for a time in milliseconds
function delay(v: number) {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, v);
  });
}
