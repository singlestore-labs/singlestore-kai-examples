import Link from "next/link";

export default function Home() {
  return (
    <main className="prose prose-invert max-w-5xl">
      <h1>SingleStore Kai ChatGPT App Examples</h1>
      <h2>1 - Text Embeddings</h2>
      <p>
        A <Link href="/get-embeddings">first example</Link> demonstrates fetching and comparing
        embeddings.
      </p>
      <h2>2 - Querying Embeddings</h2>
      <p>
        The <Link href="/query-embeddings">next example</Link> demonstrates querying embeddings.
      </p>
      <h2>3 - Querying Embeddings with ChatGPT</h2>
      <p>
        Finally, <Link href="/query-embeddings-chat">this page</Link> demonstrates querying
        embeddings with the assistance of ChatGPT.
      </p>
    </main>
  );
}
