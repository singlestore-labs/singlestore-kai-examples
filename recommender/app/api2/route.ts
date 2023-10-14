import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";
import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from "openai";

//
// This API demonstrates how to use OpenAI's chat and text-embedding APIs to
// get cart completion suggestions.
//

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = "gpt-3.5-turbo";

const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  // First, send the user's cart to the LLM and ask it how to complete the cart
  //
  const input: any = await req.json();

  // This is the chat API so we need a prompt. The prompt also provides
  // instructions regarding the output format (a simple one-per-line) so we
  // can parse it easily.
  //
  const instructions = `a user has added some items to their cart. They want 5
    MORE item suggestions! Guess what they are making, and what they need to 
    complete the meal. Omit any headings or categories and answer in the form
    of one suggestion per line. Here are the existing items, please get 
    creative and suggest some more. : ${input.cart
      .map((x: any) => x.title)
      .join(", ")}`;

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
    return NextResponse.json([]);
  }

  let response_text = response.data?.choices[0].message?.content?.trim();

  try {
    const res = response_text?.split("\n");
    if (!Array.isArray(res) || res.length < 1) {
      return NextResponse.json([]);
    }

    // Now, we have to get embeddings for the LLM-suggested items so that we
    // can match them with items in the database.
    //
    let or = await openai.createEmbedding(
      {
        model: "text-embedding-ada-002",
        input: res,
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

    const mongoClient = await mongoClientPromise;
    const db = mongoClient.db("now");
    const col = db.collection<Document>("products");

    const results: any[] = [];

    for (let i = 0; i < or.data.data.length && i < 3; i++) {
      const emb = Buffer.from(
        new Uint8Array(new Float32Array(or.data.data[i].embedding).buffer)
      );

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
          { $limit: 2 },
          { $skip: 1 },
        ])
        .toArray();

      results.push(top[0]);
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
