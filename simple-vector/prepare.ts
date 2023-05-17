import fs from "fs";
import readline from "readline";
import { Configuration, OpenAIApi } from "openai";

const help = "npm --input=input.json --output=output.json run prepare";

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

// This takes about 15 minutes for the ~15000 science fiction novels in the demo
// It costs about 6 million tokens, or ~$3.00 at the time this comment was written.
async function transform(input: string) {
  const fileStream = fs.createReadStream(input);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let i = 0;
  let t = 0;

  let buffer: string[] = [];

  let contentLength = 0;

  for await (const line of rl) {
    let from = JSON.parse(line);
    if (!from.title || !from.description || !from.subjects) {
      continue;
    }

    contentLength += line.length;
    buffer.push(line);

    if (contentLength < 20000) {
      continue;
    }

    contentLength = 0;

    // Use the whole input for the embedding
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
      // skip these; who knows
      buffer = [];
      contentLength = 0;
      continue;
    }

    t += response.data.usage.total_tokens;

    for (let j = 0; j < buffer.length; ++j) {
      let from = JSON.parse(buffer[j]);
      const embedding = new Float32Array(response.data.data[j].embedding);
      const embeddingBase64 = Buffer.from(
        new Uint8Array(embedding.buffer)
      ).toString("base64");

      const to = {
        title: from.title,
        description: from.description.value,
        subjects: from.subjects,
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
    console.log(i + " " + t);
  }

  outputStream.close();
}

transform(input);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
