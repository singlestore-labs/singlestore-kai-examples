import fs from "fs";
import process from "process";
import readline from "readline";
import { Configuration, OpenAIApi } from "openai";

const help = "npm --input=input.json --output=output.json run prepare-works";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!configuration.apiKey) {
  console.log("must set OPENAI_API_KEY");
  process.exit(1);
}

const openai = new OpenAIApi(configuration);

const input = process.env.npm_config_input;
const output = process.env.npm_config_output;
if (input === undefined || output === undefined) {
  console.log(help);
  process.exit(1);
}

var outputStream = fs.createWriteStream(output);

async function transform(input: string) {
  const fileStream = fs.createReadStream(input);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let i = 0;
  let t = 0;

  let buffer: string[] = [];
  let parsed: { [key: string]: any }[] = [];

  let contentLength = 0;

  for await (const line of rl) {
    let from = JSON.parse(line);

    const structured = `title: ${from.title ?? from.title?.value ?? "UNKNOWN"} description: ${
      from.description?.value ?? from.description ?? "NONE"
    }`;
    contentLength += structured.length;
    buffer.push(structured);
    parsed.push(from);

    if (contentLength < 20000) {
      continue;
    }

    contentLength = 0;

    let response = await openai.createEmbedding(
      {
        model: "text-embedding-ada-002",
        input: buffer,
      },
      {
        validateStatus: function (status) {
          return status < 500;
        },
      }
    );

    let sleepTime = 1000;
    while (response.status == 429) {
      console.log("backing off...");
      await sleep(sleepTime);
      sleepTime *= 2;
      response = await openai.createEmbedding(
        {
          model: "text-embedding-ada-002",
          input: buffer,
        },
        {
          validateStatus: function (status) {
            return status < 500;
          },
        }
      );
    }

    if (response.status != 200) {
      console.log(response.statusText);
      buffer = [];
      parsed = [];
      contentLength = 0;
      continue;
    }

    t += response.data.usage.total_tokens;

    for (let j = 0; j < buffer.length; ++j) {
      let from = parsed[j];
      const embedding = new Float32Array(response.data.data[j].embedding);
      const embeddingBase64 = Buffer.from(new Uint8Array(embedding.buffer)).toString("base64");

      const to = {
        ...from,
        embedding: {
          $binary: {
            base64: embeddingBase64,
            subType: "0",
          },
        },
      };

      outputStream.write(JSON.stringify(to));
      outputStream.write("\n");
    }

    i += buffer.length;
    buffer = [];
    parsed = [];
    console.log(i + " " + t);
  }

  outputStream.close();
}

transform(input);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
