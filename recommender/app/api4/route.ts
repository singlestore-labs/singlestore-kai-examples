import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";

//
// This API demonstrates how a query over a very large data set can be
// performed very quickly using SingleStore.
//

export async function POST(req: NextRequest) {
  const input: any = await req.json();
  let cart: any[] = input.cart.slice(-1);
  if (cart.length < 1) {
    return NextResponse.json([]);
  }

  const wrappedIds = cart.map((x) => `"${x._id}"`);

  // Our query finds the most common products out of our 200M-row analytics
  // data that to the last item in the user's cart.
  //
  let query = `
    SELECT $from AS pid, COUNT(*) AS c 
    FROM now.analytics 
    INNER JOIN now.products ON $from = products._id 
    WHERE $pid = '${wrappedIds[0]}' AND $from != '${wrappedIds[0]}' 
    GROUP BY $from 
    ORDER BY c DESC
    LIMIT 3
  `;

  const mongoClient = await mongoClientPromise;
  const db = mongoClient.db("now");

  // Perform the query
  //
  const res = await db.command({ sql: query });

  const col = db.collection<Document>("products");

  // Retrieve the results
  //
  let top = await col
    .aggregate([
      {
        $match: {
          _id: {
            $in: res.cursor.firstBatch.map((x: any) => x.pid.slice(1, -1)),
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          price: 1,
          vegan: 1,
          department: 1,
        },
      },
    ])
    .toArray();

  try {
    return NextResponse.json(top);
  } catch {
    return NextResponse.json([]);
  }
}
