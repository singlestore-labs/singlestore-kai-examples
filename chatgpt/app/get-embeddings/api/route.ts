import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  const input: { inputOne: string; inputTwo: string } = await req.json();

  let or = await openai.createEmbedding(
    {
      model: "text-embedding-ada-002",
      input: [input.inputOne, input.inputTwo],
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

  const a64 = Buffer.from(
    new Uint8Array(new Float32Array(or.data.data[0].embedding).buffer)
  ).toString("base64");

  const b64 = Buffer.from(
    new Uint8Array(new Float32Array(or.data.data[1].embedding).buffer)
  ).toString("base64");

  const mongoClient = await mongoClientPromise;
  const db = mongoClient.db("test");
  const response = await db.command({
    sql: `SELECT ROUND(DOT_PRODUCT(FROM_BASE64('${a64}'),FROM_BASE64('${b64}')):>DOUBLE,2):>DECIMAL(4,2):>LONGTEXT AS score;`,
  });
  return NextResponse.json({ score: response?.cursor?.firstBatch[0]?.score });
}
