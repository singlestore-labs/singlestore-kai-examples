"use client";
import { useState } from "react";
import Link from "next/link";
import { QueryResponse } from "./api/schema";

export default function Home() {
  const [inputOne, setInputOne] = useState("");
  const [results, setResults] = useState(
    undefined as { query: QueryResponse; results: any } | undefined
  );

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/query-embeddings-chat/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputOne,
      }),
    });

    const results: { query: QueryResponse; results: any } = await res.json();
    setResults(results);
  };

  return (
    <main className="prose prose-invert max-w-5xl">
      <h1>Query Embeddings Chat</h1>
      <div className="-mt-8">
        <Link href="/">Back Home</Link>
      </div>
      <p>
        Enter a text string and click "Submit". The embedding will be generated from OpenAI, then
        the database will be queried.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col mb-8">
        <input
          type="text"
          value={inputOne}
          onChange={(e) => setInputOne(e.target.value)}
          className="px-4 py-2 my-2 border border-gray-300 bg-black rounded"
          placeholder="Input 1"
          required
        />

        <button
          type="submit"
          className="px-4 py-2 my-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </form>

      {results && (
        <div className="grid grid-cols-[200px_minmax(600px,_1fr)] gap-4 mr-8 mb-8">
          <span className="font-bold">Description:</span>
          <span className="">{results.query.book}</span>
          <span className="font-bold">Subjects:</span>
          <div>
            {results.query.subjects && (
              <div className="not-prose">
                <ul className="flex flex-wrap">
                  {results.query.subjects.map((tag: string, tagIndex: number) => (
                    <li
                      key={tagIndex}
                      className="px-2 py-1 m-1 text-sm text-white bg-purple-800 rounded-full"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <span className="font-bold">Stars Condition:</span>
          <span className="">{results.query.starsCondition?.op}</span>

          <span className="font-bold">Stars:</span>
          <span className="">{results.query.starsCondition?.value}</span>
        </div>
      )}

      {results?.results &&
        results?.results.map((item: any, index: any) => (
          <div
            key={index}
            className="my-2 grid grid-cols-[200px_minmax(600px,_1fr)] items-start divide-y divide-gray-500"
          >
            <div>
              <img
                className="object-fill mx-0 my-0 w-full"
                src={`https://covers.openlibrary.org/b/id/${item.cover}-M.jpg`}
              ></img>
            </div>
            <div className="mx-2">
              <h2 className="text-xl mt-0">
                {item.title + (item.subtitle ? " " + item.subtitle : "")}
              </h2>
              <h3 className="text-sm -mt-4">{item.author?.personal_name}</h3>
              <p>{"⭐".repeat(item.stars)}</p>
              <p>{item.description?.value ?? item.description}</p>
              {item.subjects && (
                <div className="not-prose">
                  <ul className="flex flex-wrap">
                    {item.subjects.map((tag: string, tagIndex: number) => (
                      <li
                        key={tagIndex}
                        className="px-2 py-1 m-1 text-sm text-white bg-purple-800 rounded-full"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
    </main>
  );
}
