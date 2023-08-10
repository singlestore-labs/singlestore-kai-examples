## SingleStore ChatGPT Example

This is a simple application created with create-next-app. It demonstrates connecting to OpenAI
using it through SingleStore.

The data used here is taken from a data set by the Open Library, a project of the Internet Archive.

## Getting the data

This requires some flavor of Linux, WSL, or equivalent tools.

Get the files

```
wget https://openlibrary.org/data/ol_dump_works_latest.txt.gz
gunzip ol_dump_works_latest.txt.gz
wget https://openlibrary.org/data/ol_dump_authors_latest.txt.gz
gunzip ol_dump_authors_latest.txt.gz
```

You might want to prune to a smaller data set (just science fiction/fantasy); about 30K records:

```
cat ol_dump_works_latest.txt | grep -i -E "science fiction|fantasy" | grep -i "title" | grep -i "description" | grep -i "subjects" | cut -f5 > raw_works.json
jq -s '[.[].authors[]?.author.key] | unique' raw_works.json | jq -r '.[]' > author_keys.txt
cat ol_dump_authors_latest.txt | grep -i "name" | grep -f author_keys.txt | cut -f5 > raw_authors.json
```

Or, a larger data set (all fiction/nonfiction), about 340K records:

```
cat ol_dump_works_latest.txt | grep -i -E "fiction" | grep -i "title" | grep -i "description" | grep -i "subjects" | cut -f5 > raw_works.json
jq -s '[.[].authors[]?.author.key] | unique' raw_works.json | jq -r '.[]' > author_keys.txt
cat ol_dump_authors_latest.txt | grep -i "name" | grep -f author_keys.txt | cut -f5 > raw_authors.json
```

Get the embeddings:

```
npm run --input=raw_works.json --output=processed_works.json prepare-works
```

Load the data:

```
npm run --input=raw_authors.json --collection=authors load
npm run --input=processed_works.json --collection=works load
```

## Running the app

Edit .env.local to contain your OpenAI Key and SingleStore Kai connection string and use `next dev`
