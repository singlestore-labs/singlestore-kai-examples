# Simple Vector

This is a simple demonstration of how SingleStore Kai™ for MongoDB can enable
MongoDB applications with AI-powered features.

In this demo, semantic search is used to find interesting science fiction
novels.

SingleStore Kai™ for MongoDB extends the MongoDB API with the $dotProduct
operator that enables SIMD-accelerated vector matching. This enables
applications to perform semantic search using embeddings generated by OpenAI and
other models.

Search powered by embeddings enables searching by meaning, rather than exact or
fuzzy word match. This type of search can deliver more meaningful results to a
user which can translate into more business value for the company.

## Prerequisites

This demo uses OpenAI's
[text-embedding-ada-002](https://platform.openai.com/docs/guides/embeddings) API
to generate the embeddings, so you will need an OpenAI key. Following the demo
through to completion uses about $3 USD of tokens.

The demo requires NodeJS v16.18.0 or greater.

The demo requires a SingleStore Kai™ for MongoDB endpoint to run against since
it needs the $dotProduct operator. To create an endpoint for SingleStore Kai™
for MongoDB, [get started here](https://www.singlestore.com/cloud-trial/kai/).

The shell scripts in this demo require Linux/Bash (they were run on Debian
Bullseye).

## Data Preparation

The data comes from the [Open Library](https://openlibrary.org/help/faq/using)
dump of their [Works](https://openlibrary.org/data/ol_dump_works_latest.txt.gz).

```
wget https://openlibrary.org/data/ol_dump_works_latest.txt.gz
gunzip ol_dump_works_latest.txt.gz
```

The data is pre-processed to roughly just the science fiction novels that have a
description with the following:

```
cat ol_dump_works_2023-04-30.txt | grep -i "science fiction" | grep -i "description" | cut -f5 > raw.json
wc -l raw.json
```

This results in about 15000 works.

## Generate Embeddings

The data is cleaned and embeddings generated using [prepare.ts](./prepare.ts):

```
export OPENAI_API_KEY=<YOUR KEY>
npm run --input=raw.json --output=processed.json prepare
```

## Load the Data

The data is loaded using [load.ts](./load.ts) which uses a regular MongoDB
NodeJS driver to send the data to SingleStoreDB through SingleStore Kai™ for
MongoDB.

```
export MONGOURI=<YOUR URI>
npm run --input=processed.json load
```

## Query the Data with Curl

To query this data set using semantic search, run a simple web serer

```
export OPENAI_API_KEY=<YOUR KEY>
export MONGOURI=<YOUR URI>
npm run test
```

Example queries

```shell
curl -G http://localhost:3000/search --data-urlencode "q=hard science fiction moon vs. earth"

curl -G http://localhost:3000/search --data-urlencode "q=some guy rides along with a submarine captain classic french"

curl -G http://localhost:3000/search --data-urlencode "q=funny astronaut stranded on mars has to survive, movie"

curl -G http://localhost:3000/search --data-urlencode "q=hard science fiction classic nebula hugo near-future
```

Sample output from that last query

```javascript
[
  {
    _id: "64646f6b0311a0b7a3078db3",
    title: "Rendezvous with Rama",
    z: 0.8501186370849609,
  },
  {
    _id: "64646f710311a0b7a3079db2",
    title: "City at the End of Time",
    z: 0.846441388130188,
  },
  {
    _id: "64646f710311a0b7a3079da0",
    title: "Gravity dreams",
    z: 0.8422247767448425,
  },
  {
    _id: "64646f690311a0b7a307874b",
    title: "Noumenon",
    z: 0.841902494430542,
  },
  {
    _id: "64646f5d0311a0b7a3076a6c",
    title: "Heaven's reach",
    z: 0.8418927192687988,
  },
];
```

## Query with Mongo Shell

You can find similar works using the embedding from one to query others. For
example, to find the top works matching "The Martian":

```javascript
var emb = db.processed.findOne({
  _id: ObjectId("6465608961adfddeceb51024"),
}).embedding;

db.processed.aggregate([
  { $match: {} },
  { $addFields: { z: { $dotProduct: ["$embedding", emb] } } },
  { $project: { title: 1, z: -1, price: 1 } },
  { $sort: { z: -1 } },
  { $limit: 5 },
]);
```