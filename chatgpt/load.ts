import fs from "fs";
import { faker } from "@faker-js/faker";
import readline from "readline";
import { MongoClient } from "mongodb";
import { EJSON } from "bson";

interface DemoDocument {}

const help = "npm --input=processed.json --collection=works run load";

const uri = process.env.SINGLESTORE_KAI_URI;
if (uri === undefined) {
  console.log("must set SINGLESTORE_KAI_URI");
  process.exit(1);
}

const input = process.env.npm_config_input;
const collection = process.env.npm_config_collection;
if (input === undefined || collection === undefined) {
  console.log(help);
  process.exit(1);
}

const mc = new MongoClient(uri);
const db = mc.db("test");
const col = db.collection<DemoDocument>(collection);

async function load(input: string, collection: string) {
  await mc.connect();
  try {
    await col.drop();
  } catch {}

  await db.createCollection(
    collection,
    collection === "works"
      ? ({
          // must create the collection with a LONGBLOB NOT NULL column for the embedding
          columns: [{ id: "embedding", type: "LONGBLOB NOT NULL" }],
        } as any)
      : {}
  );

  const fileStream = fs.createReadStream(input);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let inserted = 0;
  let items: any[] = [];
  for await (const line of rl) {
    const item = EJSON.parse(line);
    item._id = item.key;

    // add some pretend metadata to the record
    if (collection === "works") {
      item.stars = Math.floor(Math.random() * 5) + 1;
      // pull out the first author
      item.authorKey =
        item.authors != null && item.authors.length > 0 ? item.authors[0].author.key : "";
    }

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
