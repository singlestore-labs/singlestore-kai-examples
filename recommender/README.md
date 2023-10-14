## SingleStore Recommender Example

This is a simple application created with create-next-app. It demonstrates
various recommendation techniques using SingleStore.

## Preparing the database

The data powering this demo was produced using generative AI. Prior to running
the demo, the data must be loaded into an instance of SingleStore through
SingleStore Kai. You must load the full set of products, but you can let
load-orders and load-analytics run as long as you want to get the amount of data
you desire.

```
export SINGLESTORE_KAI_URI="mongodb://..."
npm run load-products --input=data/files/products-embed.json
npm run load-orders --items=data/files/items-dict.json --orders=data/files/orders.json
npm run load-analytics --items=data/files/items-dict.json
```

## Running the app

Create a .env.local file with your OPENAI key and SingleStore Kai URI.

```
OPENAI_API_KEY="sk-..."
SINGLESTORE_KAI_URI="mongodb://..."
```

Run `next dev` to start the application on http://localhost:3000 and try it out!
