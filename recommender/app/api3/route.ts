import { NextRequest, NextResponse } from "next/server";
import mongoClientPromise from "lib/mongo";

//
// This API demonstrates how to use a SQL query through SingleStore Kai to find
// products from orders similar to the customer's cart. This does not require
// the use of any OpenAI APIs.
//

export async function POST(req: NextRequest) {
  // First parse the items in the user's cart to get their product identifiers
  //
  const input: any = await req.json();
  let cart: any[] = input.cart.slice(-3);
  if (cart.length < 1) {
    return NextResponse.json([]);
  }
  while (cart.length < 3) {
    cart.push(cart[0]);
  }

  const wrappedIds = cart.map((x) => `"${x._id}"`);

  // The SQL query takes three items from the user's cart and finds the other
  // products from orders containing those items. Then out of that set it finds
  // other products similar to the provided products and suggests them.
  //
  // There are other ways this could be done; the intent of this example is to
  // show how SQL queries can easily be used through SingleStore Kai. This
  // query would be difficult to write using MongoDB query operators.
  //
  let query = `
    WITH zz AS (SELECT pid, SUM(c) AS c FROM (
        SELECT pid, COUNT(*) AS c FROM now.orders WHERE oid IN (SELECT oid FROM now.orders WHERE pid = '${wrappedIds[0]}' GROUP BY oid) GROUP BY pid ORDER BY c DESC LIMIT 30
        UNION ALL 
        SELECT pid, COUNT(*) AS c FROM now.orders WHERE oid IN (SELECT oid FROM now.orders WHERE pid = '${wrappedIds[1]}' GROUP BY oid) GROUP BY pid ORDER BY c DESC LIMIT 30
        UNION ALL 
        SELECT pid, COUNT(*) AS c FROM now.orders WHERE oid IN (SELECT oid FROM now.orders WHERE pid = '${wrappedIds[2]}' GROUP BY oid) GROUP BY pid ORDER BY c DESC LIMIT 30)
        GROUP BY pid ORDER BY c DESC LIMIT 30),
        zzz AS 
        (SELECT
            DOT_PRODUCT((SELECT embedding FROM now.products WHERE _id = '${wrappedIds[0]}'), embedding) AS p0,
            DOT_PRODUCT((SELECT embedding FROM now.products WHERE _id = '${wrappedIds[1]}'), embedding) AS p1,
            DOT_PRODUCT((SELECT embedding FROM now.products WHERE _id = '${wrappedIds[2]}'), embedding) AS p2,
            p0 + p1 + p2 AS score,
            pid
        FROM now.products INNER JOIN zz ON now.products.$_id = zz.pid)
        SELECT pid FROM zzz WHERE pid NOT IN ('${wrappedIds[0]}', '${wrappedIds[1]}', '${wrappedIds[2]}') ORDER BY score DESC LIMIT 3`;

  const mongoClient = await mongoClientPromise;
  const db = mongoClient.db("now");
  const res = await db.command({ sql: query });

  const col = db.collection<Document>("products");

  // Retrieve the product information from the results of our query.
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
