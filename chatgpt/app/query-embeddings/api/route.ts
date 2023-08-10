import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  const input: { inputOne: string } = await req.json();

  let or = await openai.createEmbedding(
    {
      model: "text-embedding-ada-002",
      input: [input.inputOne],
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

  const mongoClient = await mongoClientPromise;
  const db = mongoClient.db("test");
  const col = db.collection<Document>("works");
  let topFive = await col
    .aggregate([
      { $addFields: { z: { $dotProduct: ["$embedding", emb] } } },
      { $match: { z: { $gt: 0.78 } } },
      {
        $project: {
          _id: 1,
          title: 1,
          covers: 1,
          description: 1,
          key: 1,
          subjects: 1,
          stars: 1,
          z: 1,
          subtitle: 1,
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
          subtitle: 1,
          description: 1,
          key: 1,
          subjects: 1,
          cover: 1,
          stars: 1,
          z: 1,
          author: 1,
        },
      },
    ])
    .toArray();

  return NextResponse.json(topFive);
}
