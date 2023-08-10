"use client";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [inputOne, setInputOne] = useState("");
  const [inputTwo, setInputTwo] = useState("");
  const [score, setScore] = useState(null);

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const res = await fetch("/get-embeddings/api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputOne,
        inputTwo,
      }),
    });

    const { score } = await res.json();

    setScore(score);
  };

  return (
    <main className="prose prose-invert max-w-5xl">
      <h1>Get Embeddings</h1>
      <div className="-mt-8">
        <Link href="/">Back Home</Link>
      </div>
      <p>
        Enter two text strings and click "Submit". The embeddings will be generated from OpenAI,
        then the distance will be computed using the SingleStore DOT_PRODUCT function.
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

        <input
          type="text"
          value={inputTwo}
          onChange={(e) => setInputTwo(e.target.value)}
          className="px-4 py-2 my-2 border border-gray-300 bg-black rounded"
          placeholder="Input 2"
          required
        />

        <button
          type="submit"
          className="px-4 py-2 my-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </form>

      {score && <div className="text-4xl">Distance: {score}</div>}
    </main>
  );
}
