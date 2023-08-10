import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";
import { Configuration, OpenAIApi } from "openai";
import * as fs from "fs";
import * as path from "path";
import * as typechat from "typechat";
import { QueryResponse } from "./schema";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = typechat.createLanguageModel(process.env);
const schema = fs.readFileSync(
  path.join(process.cwd(), "app/query-embeddings-chat/api/schema.ts"),
  "utf8"
);
const translator = typechat.createJsonTranslator<QueryResponse>(model, schema, "QueryResponse");

const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  // Use ChatGPT to get structured information from the query

  const input: { inputOne: string } = await req.json();

  const res = await translator.translate(input.inputOne);
  if (!res.success) {
    console.log(res);
    return new Response(null, { status: 500 });
  }

  // construct the query

  let pipeline: any[] = [];

  if (res.data.subjects != null && res.data.subjects.length > 0) {
    pipeline.push({ $match: { subjects: { $in: res.data.subjects } } });
  }

  if (res.data.starsCondition != null) {
    const condition: any = {};
    condition[res.data.starsCondition.op] = res.data.starsCondition.value;
    pipeline.push({ $match: { stars: condition } });
  }

  if (res.data.book != null && res.data.book != "") {
    // get the embedding
    let or = await openai.createEmbedding(
      {
        model: "text-embedding-ada-002",
        input: [res.data.book],
      },
      {
        validateStatus: function (status) {
          return status < 500;
        },
      }
    );

    if (or.status != 200) {
      return new Response(null, { status: or.status });
    }

    const emb = Buffer.from(new Uint8Array(new Float32Array(or.data.data[0].embedding).buffer));
    pipeline.push({ $addFields: { z: { $dotProduct: ["$embedding", emb] } } });
    pipeline.push({ $match: { z: { $gt: 0.78 } } });
  }

  const mongoClient = await mongoClientPromise;
  const db = mongoClient.db("test");
  const col = db.collection<Document>("works");

  // finish the pipeline
  pipeline = pipeline.concat([
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        key: 1,
        subjects: 1,
        covers: 1,
        stars: 1,
        subtitle: 1,
        z: 1,
        authorKey: 1,
      },
    },
    { $sort: { z: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "authors",
        localField: "authorKey",
        foreignField: "_id",
        as: "author",
      },
    },
    { $addFields: { author: { $first: "$author" }, cover: { $first: "$covers" } } },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        key: 1,
        subjects: 1,
        cover: 1,
        subtitle: 1,
        stars: 1,
        z: 1,
        author: 1,
      },
    },
  ]);

  let topFive = await col.aggregate(pipeline).toArray();

  return NextResponse.json({ query: res.data, results: topFive });
}
