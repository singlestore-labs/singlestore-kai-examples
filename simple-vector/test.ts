import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import { Configuration, OpenAIApi } from "openai";

interface DemoDocument {}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!configuration.apiKey) {
  console.log("must set OPENAI_API_KEY");
  process.exit(1);
}

const openai = new OpenAIApi(configuration);

const uri = process.env.MONGOURI;
if (uri === undefined) {
  console.log("must set MONGOURI");
  process.exit(1);
}

async function getEmbedding(input: string) {
  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: input,
  });
  const embedding = new Float32Array(response.data.data[0].embedding);
  return Buffer.from(new Uint8Array(embedding.buffer));
}

const mc = new MongoClient(uri);
const db = mc.db("test");
const col = db.collection<DemoDocument>("processed");

async function start() {
  await mc.connect();
}

start();

const app = express();
app.set("json spaces", 2);

// Use SingleStore Kai for MongoDB's $dotProduct extension to the MongoDB
// API to power an app with semantic search
app.use("/search", async function (req: any, res: any) {
  const q = req.query["q"];
  if (q === undefined) {
    res.status(400).send("Bad Request\n");
    return;
  }
  let emb = await getEmbedding(q);
  let topFive = await col
    .aggregate([
      { $addFields: { z: { $dotProduct: ["$embedding", emb] } } },
      { $project: { _id: 1, title: 1, z: 1 } },
      { $sort: { z: -1 } },
      { $limit: 5 },
    ])
    .toArray();
  res.json(topFive);
});

app.use("/similar", async function (req: any, res: any) {
  const q = req.query["q"];
  if (q === undefined) {
    res.status(400).send("Bad Request\n");
    return;
  }

  const item: any = await col.findOne({ _id: new ObjectId(q) });
  if (item == null) {
    res.status(404).send("Not Found\n");
    return;
  }

  let topFive = await col
    .aggregate([
      { $addFields: { z: { $dotProduct: ["$embedding", item.embedding] } } },
      { $project: { title: 1 } },
      { $sort: { z: -1 } },
      { $limit: 5 },
    ])
    .toArray();
  res.json(topFive);
});

app.listen(3000, () => {
  console.log(`Sample listening on port ${3000}`);
});
