import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";

//
// This API demonstrates how to use an LLM as a personal shopper over
// our product catalog.
//

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = "gpt-4";

const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  const input: any = await req.json();

  // This is the chat API so we need a prompt. The prompt also provides
  // instructions regarding the output format so we can parse it easily.
  //
  const instructions = `a user has added some items to their cart for a purpose.
  I want you to review the items and output four lines. The first line should 
  be your guess about what the purpose is, in the form of a question, like 
  "Are you planning... ?". The second line should be a suggested product to add
  to the cart - just the name of the product, no preamble or punctuation. The 
  third line should be the reason for adding that product to the cart, and 
  start with the exact words "Try these". Be very brief. Here are the items: 
  ${input.cart.map((x: any) => x.title).join(", ")}`;

  let messages: ChatCompletionRequestMessage[] = [
    { role: "system", content: instructions },
    { role: "user", content: "" },
  ];

  let response = await openai.createChatCompletion(
    {
      model: model,
      messages: messages,
    },
    { timeout: 60000 }
  );

  if (response === undefined || response.status != 200) {
    return NextResponse.json({});
  }

  let response_text = response.data?.choices[0].message?.content?.trim();

  const lines = response_text?.split("\n").filter((x) => x.length > 0);
  if (lines === undefined || lines.length != 3 || lines[1] === undefined) {
    return NextResponse.json({});
  }

  // Now, we have to get embeddings for the LLM-suggested items so that we
  // can match them with items in the database.
  //
  let or = await openai.createEmbedding(
    {
      model: "text-embedding-ada-002",
      input: [lines[1]],
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

  const mongoClient = await mongoClientPromise;
  const db = mongoClient.db("now");
  const col = db.collection<Document>("products");

  // Finally for each suggestion we find the closest matching item using
  // the $dotProduct operator with other MongoDB query operators
  //
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
      { $limit: 3 },
    ])
    .toArray();

  try {
    return NextResponse.json({ a: lines[0], b: top, c: lines[2] });
  } catch {
    console.log(response_text);
    return NextResponse.json([]);
  }
}
