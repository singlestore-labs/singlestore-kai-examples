import fs from "fs";
import { faker } from "@faker-js/faker";
import readline from "readline";
import { MongoClient } from "mongodb";
import { EJSON } from "bson";

interface DemoDocument {}

const help = "npm --input=input.json run load-products";

const uri = process.env.SINGLESTORE_KAI_URI;
if (uri === undefined) {
  console.log("must set SINGLESTORE_KAI_URI");
  process.exit(1);
}

const input = process.env.npm_config_input;

if (input === undefined) {
  console.log(help);
  process.exit(1);
}

const dbn = "now";
const collection = "products";

const mc = new MongoClient(uri);
const db = mc.db(dbn);
const col = db.collection<DemoDocument>(collection);

async function load(input: string, collection: string) {
  await mc.connect();
  try {
    await col.drop();
  } catch {}

  await db.createCollection(collection, {
    // must create the collection with a LONGBLOB NOT NULL column for the embedding
    columns: [{ id: "embedding", type: "LONGBLOB NOT NULL" }],
  } as any);

  const fileStream = fs.createReadStream(input);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let inserted = 0;
  let items: any[] = [];
  let index = 0;
  for await (const line of rl) {
    const item = EJSON.parse(line);
    item._id = index.toString().padStart(4, "0");
    index++;
    items.push(item);

    // push in batches of 1000
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

load(input, collection);
