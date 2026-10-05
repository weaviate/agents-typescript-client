<p align="center">
    <a href="https://github.com/weaviate/agents-typescript-client">
        <img src="./assets/banner.png" alt="Weaviate Agents">
    </a>
</p>

<p align="center">
  <a href="https://docs.weaviate.io/query-agent">Docs</a> •
  <a href="https://weaviate.github.io/agents-typescript-client/">Reference Guide</a> •
  <a href="https://weaviate.io">Weaviate</a>
</p>

<p align="center">
  <a href="https://github.com/weaviate/agents-typescript-client/actions"><img src="https://github.com/weaviate/agents-typescript-client/actions/workflows/main.yaml/badge.svg?branch=main" alt="Main Branch"></a>
  <a href="https://www.npmjs.com/package/weaviate-agents"><img src="https://img.shields.io/npm/v/weaviate-agents" alt="npm version"></a>
</p>

Weaviate Agents allow you to automatically interface with your Weaviate collections without writing any complex code.

# Installation

This package is to be used in conjunction with the [Weaviate TypeScript Client](https://github.com/weaviate/typescript-client), which is a peer dependency.

```bash
npm install weaviate-client weaviate-agents
```
Or with yarn / pnpm:

```bash
yarn add weaviate-client weaviate-agents
```

```bash
pnpm add weaviate-client weaviate-agents
```

Requires Node 20+ and a [Weaviate Cloud](https://console.weaviate.cloud) cluster.

# Query Agent

The Query Agent turns natural-language questions into precise database operations, making full use of:

- dynamic filters
- cross-collection routing
- query optimization
- aggregations

It returns accurate and relevant results with source citations. It replaces manual query construction and ad-hoc logic with runtime, context-aware planning that optimizes and executes queries across user collections.

## Ask Mode

**Ask mode** is natural-language in and natural-language out. It searches or aggregates your data, depending on the user's query, and then answers the question with respect to the retrieved data. This can be accessed using the `ask()` or `askStream()` methods, depending on whether your application needs streaming tokens and progress messages.

```ts
import weaviate from "weaviate-client";
import { QueryAgent } from "weaviate-agents";

const client = await weaviate.connectToWeaviateCloud(clusterUrl, {
  authCredentials,
});

const qa = new QueryAgent(client, {
  collections: ["FinancialContracts"],
});

const res = await qa.ask("Find all contracts signed in 2025");
```

Ask mode can be optionally customized with:

- Output formats for structured outputs
- LLM-based evaluation of retrieved sources

[Learn more about ask mode in the official documentation.](https://docs.weaviate.io/query-agent/guides/ask_mode)

## Search Mode

**Search mode** is designed for high quality information retrieval with strong recall and controlled precision, without the final-answer generation. This can be accessed using the `search()` method.

```ts
import { QueryAgent } from "weaviate-agents";

const qa = new QueryAgent(client, {
  collections: ["ECommerce"],
});

const searchResponse = await qa.search("Find me some vintage shoes under $70", {
  limit: 10,
  effort: "medium",
});
```

Search mode can be optionally customized with:

- Different filtering strategies for recall or precision based search priorities
- Effort level to control search quality versus latency
- Diversity weights to improve diversity amongst results

[Learn more about search mode in the official documentation.](https://docs.weaviate.io/query-agent/guides/search_mode)

# Documentation

- [Full documentation](https://docs.weaviate.io/query-agent) for quickstarts, walkthroughs and overviews of how to use the Query Agent

- [Tutorials & Guides](https://docs.weaviate.io/query-agent/recipes) for getting started quickly with the Query Agent

- [API reference manual](https://weaviate.github.io/agents-typescript-client/index.html) for specific documentation on this client as well as examples

# Support

- [GitHub issues](https://github.com/weaviate/agents-typescript-client/issues) for bug reports and feature requests
- [Community forum](https://forum.weaviate.io) for questions and discussion

# Citation

If you use the Query Agent in your research, please consider citing our paper:

```tex
@article{query-agent,
  title={Querying databases with function calling},
  author={Shorten, Connor and Pierse, Charles and Smith, Thomas Benjamin and D'Oosterlinck, Karel and Celik, Tuana and Cardenas, Erika and Monigatti, Leonie and Hasan, Mohd Shukri and Schmuhl, Edward and Williams, Daniel and others},
  journal={arXiv preprint arXiv:2502.00032},
  year={2025}
}
```

# License

[BSD 3-Clause](./LICENSE)
