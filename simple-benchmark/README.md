# Simple Benchmark

This small benchmark takes only minutes to run and can demonstrates some of the
performance characteristics of SingleStore Kai™ for MongoDB.

Results are discussed in this
[blog post](https://singlestore.com/blog/singlestore-kai-real-time-analytics-benchmarks).

## Prerequisites

The benchmark requires NodeJS v16.18.0 or greater, and a MongoDB endpoint to
test against. To create an endpoint for SingleStore Kai™ for MongoDB,
[get started here](https://singlestore.com/cloud–trial/kai).

## To Run

```shell
npm install
npm --mongouri=<MONGOURI> run main
```
