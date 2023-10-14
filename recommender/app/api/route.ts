import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";
import { Configuration, OpenAIApi } from "openai";

//
// This API demonstrates how to use OpenAI's text-embedding API to perform
// vector search on a collection in SingleStore Kai
//

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  const input: { inputOne: string } = await req.json();

  // First, create an embedding for the user's search query
  //
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

  const emb = Buffer.from(
    new Uint8Array(new Float32Array(or.data.data[0].embedding).buffer)
  );

  // Next, use the $dotProduct operator with other MongoDB query operators
  // to find the top 6 closest matches to the user's query
  //
  const mongoClient = await mongoClientPromise;
  const db = mongoClient.db("now");
  const col = db.collection<Document>("products");
  let top = await col
    .aggregate([
      { $addFields: { z: { $dotProduct: ["$embedding", emb] } } },
      {
        $project: {
          _id: 1,
          z: 1,
          title: 1,
          description: 1,
          price: 1,
          vegan: 1,
          department: 1,
        },
      },
      { $sort: { z: -1 } },
      { $limit: 6 },
    ])
    .toArray();

  return NextResponse.json(top);
}
