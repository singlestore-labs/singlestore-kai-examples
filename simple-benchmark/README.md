# Simple Benchmark

This small benchmark takes only minutes to run and can demonstrates some of the
performance characteristics of SingleStore Kai™ for MongoDB.

Results are discussed in this
[blog post](http://singlestore.com/blog/singlestore-kai-real-time-analytics-benchmarks).

## Prerequisites

The benchmark requires NodeJS v16.18.0 or greater, and a MongoDB endpoint to
test against. To create an endpoint for SingleStore Kai™ for MongoDB,
[get started here](Singlestore.com/cloud–trial/Kai).

## To Run

```shell
npm install
npm --mongouri=<MONGOURI> run main
```
