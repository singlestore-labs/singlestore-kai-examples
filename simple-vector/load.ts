import fs from "fs";
import { faker } from "@faker-js/faker";
import readline from "readline";
import { MongoClient } from "mongodb";
import { EJSON } from "bson";

interface DemoDocument {}

const help = "npm --input=processed.json run load";

const uri = process.env.MONGOURI;
if (uri === undefined) {
  console.log("must set MONGOURI");
  process.exit(1);
}

const input = process.env.npm_config_input;
if (input === undefined) {
  console.log(help);
  process.exit(1);
}

const mc = new MongoClient(uri);
const db = mc.db("test");
const col = db.collection<DemoDocument>("processed");

async function load(input: string) {
  await mc.connect();
  try {
    await col.drop();
  } catch {}

  // must create the collection with a LONGBLOB NOT NULL column for the embedding
  await db.createCollection("processed", {
    columns: [{ id: "embedding", type: "LONGBLOB NOT NULL" }],
  } as any);

  const fileStream = fs.createReadStream(input);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let inserted = 0;
  let items: any[] = [];
  for await (const line of rl) {
    // add some pretend metadata to the record
    const item = EJSON.parse(line);
    item.price = Math.random() * 100;
    item.type = faker.helpers.arrayElements([
      "HARDCOVER",
      "PAPERBACK",
      "AUDIO",
    ]);
    item.inventoryRemaining = Math.floor(Math.random() * 100);
    item.topSeller = Math.random() > 0.95 ? "TOP" : "NOT_TOP";

    items.push(item);

    if (items.length >= 1000) {
      await col.insertMany(items);
      inserted += items.length;
      console.log(inserted);
      items = [];
    }
  }

  if (items.length > 0) {
    await col.insertMany(items);
    inserted += items.length;
    console.log(inserted);
    items = [];
  }

  await rl.close();
  process.exit(0);
}

load(input);
