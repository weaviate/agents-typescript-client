import { WeaviateClient } from "weaviate-client";
import {
  QueryAgentResponse,
  ProgressMessage,
  StreamedTokens,
  AskModeResponse,
  SuggestQueryResponse,
} from "./response/response.js";
import {
  mapResponse,
  mapProgressMessageFromSSE,
  mapStreamedTokensFromSSE,
  mapAskModeResponse,
  mapSuggestQueryResponse,
} from "./response/response-mapping.js";
import { mapApiResponse } from "./response/api-response-mapping.js";
import { fetchServerSentEvents } from "./response/server-sent-events.js";
import {
  mapCollections,
  QueryAgentCollection,
  QueryAgentCollectionConfig,
} from "./collection.js";
import { handleError } from "./response/error.js";
import { QueryAgentSearcher } from "./search.js";
import { SearchModeResponse } from "./response/response.js";
import { getHeaders } from "./connection.js";

/**
 * An agent for executing agentic queries against Weaviate.
 *
 * For more information, see the [Weaviate Agents - Query Agent Docs](https://weaviate.io/developers/agents).
 */
export class QueryAgent {
  private collections?: (string | QueryAgentCollectionConfig)[];
  private systemPrompt?: string;
  private agentsHost: string;

  /**
   * Initialize the Query Agent.
   *
   * @param client - The Weaviate client connected to a Weaviate Cloud cluster.
   * @param options - Configuration for the agent.
   * @param options.collections - The collections to query. Either a list of strings, or a list of
   *   {@link QueryAgentCollectionConfig} objects. Will be overridden if passed in any of the agent's
   *   methods that support it.
   * @param options.systemPrompt - Optional prompt to control the tone, format, and style of the
   *   agent's final response. This prompt is both passed to the query writer agent, and applied
   *   when generating the answer after all research and data retrieval is complete.
   * @param options.agentsHost - Optional host of the agents service.
   */
  constructor(
    private client: WeaviateClient,
    {
      collections,
      systemPrompt,
      agentsHost = "https://api.agents.weaviate.io",
    }: QueryAgentOptions = {},
  ) {
    this.collections = collections;
    this.systemPrompt = systemPrompt;
    this.agentsHost = agentsHost;
  }

  /**
   * Run the query agent.
   *
   * @deprecated The `run` method is deprecated; use {@link ask} instead.
   * @param query - The natural language query string for the agent.
   * @param options - Options for this run.
   * @param options.collections - The collections to query. Will override any collections passed in the constructor.
   * @param options.context - Optional previous response from the agent.
   * @returns The response from the query agent.
   */
  async run(
    query: string,
    { collections, context }: QueryAgentRunOptions = {},
  ): Promise<QueryAgentResponse> {
    const targetCollections = collections ?? this.collections;
    if (!targetCollections) {
      throw Error("No collections provided to the query agent.");
    }

    const { host, bearerToken, headers } =
      await this.client.getConnectionDetails();

    const response = await fetch(`${this.agentsHost}/agent/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearerToken!,
        "X-Weaviate-Cluster-Url": host,
        "X-Agent-Request-Origin": "typescript-client",
      },
      body: JSON.stringify({
        headers,
        query,
        collections: mapCollections(targetCollections),
        system_prompt: this.systemPrompt,
        previous_response: context ? mapApiResponse(context) : undefined,
        result_evaluation: "none",
      }),
    });

    if (!response.ok) {
      await handleError(await response.text());
    }

    return mapResponse(await response.json());
  }

  /**
   * Run the Query Agent ask mode.
   *
   * Performs an agentic search on the collections and returns a natural language answer to the query.
   *
   * @param query - The natural language query string, or a list of chat messages, for the agent.
   * @param options - Options for this ask invocation.
   * @param options.collections - The collections to query. Either a list of strings, or a list of
   *   {@link QueryAgentCollectionConfig} objects. Will override any collections passed in the constructor.
   * @param options.resultEvaluation - One of `"llm"` or `"none"`.
   *   If `"llm"`, the final answer will be cross-compared to the sources, and those sources will be
   *   filtered to only those in the answer. Also populates the `missingInformation` and
   *   `isPartialAnswer` fields of the response.
   *   If `"none"`, the result will not be evaluated, and the sources will not be filtered.
   *   Defaults to `"none"`.
   * @returns An {@link AskModeResponse} which contains the final answer, sources, and other
   *   metadata such as the searches performed, usage and total time.
   *
   * @example
   * ```ts
   * const agent = new QueryAgent(client, { collections: ["FinancialContracts"] });
   * const response = await agent.ask(
   *   "What are the terms of the contract signed by John Smith in May 2025?",
   * );
   * ```
   */
  async ask(
    query: QueryAgentQuery,
    { collections, resultEvaluation }: QueryAgentAskOptions = {},
  ): Promise<AskModeResponse> {
    const targetCollections = this.validateCollections(collections);
    const { requestHeaders, connectionHeaders } = await getHeaders(this.client);

    const response = await fetch(`${this.agentsHost}/query/ask`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({
        headers: connectionHeaders,
        query: typeof query === "string" ? query : { messages: query },
        collections: mapCollections(targetCollections),
        system_prompt: this.systemPrompt,
        result_evaluation: resultEvaluation ?? "none",
      }),
    });

    if (!response.ok) {
      await handleError(await response.text());
    }

    return mapAskModeResponse(await response.json());
  }

  /**
   * Stream responses from the query agent.
   *
   * @deprecated The `stream` method is deprecated; use {@link askStream} instead.
   * @param query - The natural language query string for the agent.
   * @param options - Options for the stream.
   * @param options.collections - The collections to query. Will override any collections passed in the constructor.
   * @param options.context - Optional previous response from the agent.
   * @param options.includeProgress - Whether to include progress messages in the stream. These are
   *   informational messages about the progress of the agent's search.
   * @param options.includeFinalState - Whether to include the final state in the stream. This is
   *   the final {@link QueryAgentResponse}, yielded as the last item in the stream.
   * @returns An async generator yielding {@link ProgressMessage}, {@link StreamedTokens}, and a
   *   final {@link QueryAgentResponse}, depending on the include flags.
   */
  stream(
    query: string,
    options: QueryAgentStreamOptions & {
      includeProgress: false;
      includeFinalState: false;
    },
  ): AsyncGenerator<StreamedTokens>;
  /** @deprecated Use {@link askStream} instead. */
  stream(
    query: string,
    options: QueryAgentStreamOptions & {
      includeProgress: false;
      includeFinalState?: true;
    },
  ): AsyncGenerator<StreamedTokens | QueryAgentResponse>;
  /** @deprecated Use {@link askStream} instead. */
  stream(
    query: string,
    options: QueryAgentStreamOptions & {
      includeProgress?: true;
      includeFinalState: false;
    },
  ): AsyncGenerator<ProgressMessage | StreamedTokens>;
  /** @deprecated Use {@link askStream} instead. */
  stream(
    query: string,
    options?: QueryAgentStreamOptions & {
      includeProgress?: true;
      includeFinalState?: true;
    },
  ): AsyncGenerator<ProgressMessage | StreamedTokens | QueryAgentResponse>;
  async *stream(
    query: string,
    {
      collections,
      context,
      includeProgress,
      includeFinalState,
    }: QueryAgentStreamOptions = {},
  ): AsyncGenerator<ProgressMessage | StreamedTokens | QueryAgentResponse> {
    const targetCollections = collections ?? this.collections;

    if (!targetCollections) {
      throw Error("No collections provided to the query agent.");
    }

    const { host, bearerToken, headers } =
      await this.client.getConnectionDetails();

    const sseStream = fetchServerSentEvents(
      `${this.agentsHost}/agent/stream_query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearerToken!,
          "X-Weaviate-Cluster-Url": host,
          "X-Agent-Request-Origin": "typescript-client",
        },
        body: JSON.stringify({
          headers,
          query,
          collections: mapCollections(targetCollections),
          system_prompt: this.systemPrompt,
          previous_response: context ? mapApiResponse(context) : undefined,
          include_progress: includeProgress ?? true,
          include_final_state: includeFinalState ?? true,
          result_evaluation: "none",
        }),
      },
    );

    for await (const event of sseStream) {
      if (event.event === "error") {
        await handleError(event.data);
      }

      let output: ProgressMessage | StreamedTokens | QueryAgentResponse;
      if (event.event === "progress_message") {
        output = mapProgressMessageFromSSE(event);
      } else if (event.event === "streamed_tokens") {
        output = mapStreamedTokensFromSSE(event);
      } else if (event.event === "final_state") {
        output = mapResponse(JSON.parse(event.data));
      } else {
        throw new Error(`Unexpected event type: ${event.event}: ${event.data}`);
      }

      yield output;
    }
  }

  /**
   * Run the Query Agent ask mode and stream the response.
   *
   * @param query - The natural language query string, or a list of chat messages, for the agent.
   * @param options - Options for the ask stream.
   * @param options.collections - The collections to query. Either a list of strings, or a list of
   *   {@link QueryAgentCollectionConfig} objects. Will override any collections passed in the constructor.
   * @param options.includeProgress - Whether to include progress messages in the stream. These are
   *   informational messages about the progress of the agent's search.
   * @param options.includeFinalState - Whether to include the final state in the stream. This is
   *   the final {@link AskModeResponse}, yielded as the last item in the stream.
   * @param options.resultEvaluation - One of `"llm"` or `"none"`.
   *   If `"llm"`, the final answer will be cross-compared to the sources, and those sources will be
   *   filtered to only those in the answer. Also populates the `missingInformation` and
   *   `isPartialAnswer` fields of the response.
   *   If `"none"`, the result will not be evaluated, and the sources will not be filtered.
   *   Defaults to `"none"`.
   * @returns An async generator yielding any of the following:
   *
   * - {@link ProgressMessage}: informational messages about the progress of the agent's search
   *   (if `includeProgress` is `true`).
   * - {@link StreamedTokens}: token deltas from the agent's response.
   * - {@link AskModeResponse}: the final response, yielded as the last item in the stream
   *   (if `includeFinalState` is `true`).
   *
   * @example
   * ```ts
   * const agent = new QueryAgent(client, { collections: ["FinancialContracts"] });
   * for await (const event of agent.askStream(
   *   "What are the terms of the contract signed by John Smith in May 2025?",
   * )) {
   *   if ("finalAnswer" in event) {
   *     // AskModeResponse
   *     console.log(event.finalAnswer);
   *   } else if ("delta" in event) {
   *     // StreamedTokens
   *     process.stdout.write(event.delta);
   *   } else {
   *     // ProgressMessage
   *     console.log(event.message);
   *   }
   * }
   * ```
   */
  askStream(
    query: QueryAgentQuery,
    options: QueryAgentAskStreamOptions & {
      includeProgress: false;
      includeFinalState: false;
    },
  ): AsyncGenerator<StreamedTokens>;
  askStream(
    query: QueryAgentQuery,
    options: QueryAgentAskStreamOptions & {
      includeProgress: false;
      includeFinalState?: true;
    },
  ): AsyncGenerator<StreamedTokens | AskModeResponse>;
  askStream(
    query: QueryAgentQuery,
    options: QueryAgentAskStreamOptions & {
      includeProgress?: true;
      includeFinalState: false;
    },
  ): AsyncGenerator<ProgressMessage | StreamedTokens>;
  askStream(
    query: QueryAgentQuery,
    options?: QueryAgentAskStreamOptions & {
      includeProgress?: true;
      includeFinalState?: true;
    },
  ): AsyncGenerator<ProgressMessage | StreamedTokens | AskModeResponse>;
  async *askStream(
    query: QueryAgentQuery,
    {
      collections,
      includeProgress,
      includeFinalState,
      resultEvaluation,
    }: QueryAgentAskStreamOptions = {},
  ): AsyncGenerator<ProgressMessage | StreamedTokens | AskModeResponse> {
    const targetCollections = collections ?? this.collections;

    if (!targetCollections) {
      throw Error("No collections provided to the query agent.");
    }

    const { host, bearerToken, headers } =
      await this.client.getConnectionDetails();

    const sseStream = fetchServerSentEvents(
      `${this.agentsHost}/query/stream_ask`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: bearerToken!,
          "X-Weaviate-Cluster-Url": host,
          "X-Agent-Request-Origin": "typescript-client",
        },
        body: JSON.stringify({
          headers,
          query: typeof query === "string" ? query : { messages: query },
          collections: mapCollections(targetCollections),
          system_prompt: this.systemPrompt,
          include_progress: includeProgress ?? true,
          include_final_state: includeFinalState ?? true,
          result_evaluation: resultEvaluation ?? "none",
        }),
      },
    );

    for await (const event of sseStream) {
      if (event.event === "error") {
        await handleError(event.data);
      }

      let output: ProgressMessage | StreamedTokens | AskModeResponse;
      if (event.event === "progress_message") {
        output = mapProgressMessageFromSSE(event);
      } else if (event.event === "streamed_tokens") {
        output = mapStreamedTokensFromSSE(event);
      } else if (event.event === "final_state") {
        output = mapAskModeResponse(JSON.parse(event.data));
      } else {
        throw new Error(`Unexpected event type: ${event.event}: ${event.data}`);
      }

      yield output;
    }
  }

  /**
   * Run the Query Agent search-only mode.
   *
   * Sends the initial search request and returns a {@link SearchModeResponse} containing the
   * first page of results. To paginate, call `response.next({ limit, offset })` on the returned
   * response. This reuses the same underlying searches to ensure a consistent result set across
   * pages.
   *
   * @param query - The natural language query string, or a list of chat messages, for the agent.
   * @param options - Options for this search invocation.
   * @param options.limit - The maximum number of results to return for the first page. Defaults to 20.
   * @param options.collections - The collections to query. Either a list of strings, or a list of
   *   {@link QueryAgentCollectionConfig} objects. Will override any collections passed in the constructor.
   * @param options.diversityWeight - Optional number between `0.0` and `1.0` to diversify results
   *   with MMR reranking. Higher values push for more topical variety at the cost of relevance.
   *   Defaults to no diversity.
   * @returns A {@link SearchModeResponse} for the first page of results. Use
   *   `response.next({ limit, offset })` to paginate.
   *
   * @example
   * ```ts
   * const agent = new QueryAgent(client, { collections: ["FinancialContracts"] });
   * const page1 = await agent.search("Find all NDAs signed by Jane Doe in 2024.", { limit: 5 });
   * const page2 = await page1.next({ limit: 5, offset: 5 });
   * const page3 = await page2.next({ limit: 5, offset: 10 });
   * ```
   */
  async search(
    query: QueryAgentQuery,
    {
      limit = 20,
      collections,
      diversityWeight,
    }: QueryAgentSearchOnlyOptions = {},
  ): Promise<SearchModeResponse> {
    const searcher = new QueryAgentSearcher(
      this.client,
      query,
      this.validateCollections(collections),
      this.systemPrompt,
      this.agentsHost,
      diversityWeight,
    );

    return searcher.run({ limit, offset: 0 });
  }

  /**
   * Suggest queries for the data in your collections.
   *
   * Uses the agent to generate example queries that can be run against the given collections.
   * This can help users discover what kinds of questions they can ask, or generate example prompts
   * for a dataset.
   *
   * @param options - Options for the suggest-queries request.
   * @param options.collections - Optional override for the collections configured at instantiation.
   *   Either a list of strings, or a list of {@link QueryAgentCollectionConfig} objects.
   * @param options.numQueries - The number of queries to suggest. Defaults to 3.
   * @param options.instructions - Optional natural language guidance for the style, topic, or
   *   language of the suggested queries. Supplied in addition to the agent's system instructions.
   * @returns A {@link SuggestQueryResponse} containing the list of suggested queries, along with
   *   additional metadata if present.
   *
   * @example
   * ```ts
   * const agent = new QueryAgent(client, { collections: ["FinancialContracts"] });
   * const suggestions = await agent.suggestQueries({
   *   collections: ["Products"],
   *   numQueries: 5,
   *   instructions: "Focus on questions about eco-friendly features.",
   * });
   * ```
   */
  async suggestQueries({
    collections,
    numQueries,
    instructions,
  }: QueryAgentSuggestQueriesOptions = {}): Promise<SuggestQueryResponse> {
    const targetCollections = this.validateCollections(collections);
    const { requestHeaders, connectionHeaders } = await getHeaders(this.client);

    const body: Record<string, unknown> = {
      headers: connectionHeaders,
      collections: mapCollections(targetCollections),
      num_queries: numQueries ?? 3,
    };
    if (instructions !== undefined) {
      body.instructions = instructions;
    }

    const response = await fetch(`${this.agentsHost}/query/suggest_queries`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleError(await response.text());
    }

    return mapSuggestQueryResponse(await response.json());
  }

  private validateCollections = (
    collections?: QueryAgentCollection[],
  ): QueryAgentCollection[] => {
    const targetCollections = collections ?? this.collections;

    if (!targetCollections) {
      throw Error("No collections provided to the query agent.");
    }

    return targetCollections;
  };
}

/** Options for constructing a {@link QueryAgent}. */
export type QueryAgentOptions = {
  /**
   * The collections to query. Either a list of strings, or a list of
   * {@link QueryAgentCollectionConfig} objects. Will be overridden if passed in any of the
   * agent's methods that support it.
   */
  collections?: QueryAgentCollection[];
  /**
   * Optional prompt to control the tone, format, and style of the agent's final response. This
   * prompt is both passed to the query writer agent, and applied when generating the answer
   * after all research and data retrieval is complete.
   */
  systemPrompt?: string;
  /** Optional host of the agents service. */
  agentsHost?: string;
};

/** The query for a Query Agent invocation. Either a natural language string or a list of chat messages. */
export type QueryAgentQuery = string | ChatMessage[];

/** A single chat message in a conversation context passed to the Query Agent. */
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Options for {@link QueryAgent.run}.
 *
 * @deprecated `run` is deprecated; use {@link QueryAgent.ask} with {@link QueryAgentAskOptions} instead.
 */
export type QueryAgentRunOptions = {
  /** The collections to query. Will override any collections passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** Optional previous response from the agent. */
  context?: QueryAgentResponse;
};

/**
 * Controls how the agent evaluates the final result.
 *
 * - `"llm"`: cross-compares the final answer to the sources, filters those sources to only the
 *   ones used in the answer, and populates `missingInformation` and `isPartialAnswer`.
 * - `"none"`: the result is not evaluated and sources are not filtered.
 */
export type ResultEvaluation = "llm" | "none";

/** Options for {@link QueryAgent.ask}. */
export type QueryAgentAskOptions = {
  /**
   * The collections to query. Either a list of strings, or a list of
   * {@link QueryAgentCollectionConfig} objects. Will override any collections passed in the constructor.
   */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** How the agent should evaluate the final result. See {@link ResultEvaluation}. Defaults to `"none"`. */
  resultEvaluation?: ResultEvaluation;
};

/**
 * Options for {@link QueryAgent.stream}.
 *
 * @deprecated `stream` is deprecated; use {@link QueryAgent.askStream} with {@link QueryAgentAskStreamOptions} instead.
 */
export type QueryAgentStreamOptions = {
  /** The collections to query. Will override any collections passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** Optional previous response from the agent. */
  context?: QueryAgentResponse;
  /**
   * Whether to include progress messages in the stream. These are informational messages about the
   * progress of the agent's search.
   */
  includeProgress?: boolean;
  /**
   * Whether to include the final state in the stream. This is the final {@link QueryAgentResponse},
   * yielded as the last item in the stream.
   */
  includeFinalState?: boolean;
};

/** Options for {@link QueryAgent.askStream}. */
export type QueryAgentAskStreamOptions = {
  /**
   * The collections to query. Either a list of strings, or a list of
   * {@link QueryAgentCollectionConfig} objects. Will override any collections passed in the constructor.
   */
  collections?: (string | QueryAgentCollectionConfig)[];
  /**
   * Whether to include progress messages in the stream. These are informational messages about the
   * progress of the agent's search.
   */
  includeProgress?: boolean;
  /**
   * Whether to include the final state in the stream. This is the final {@link AskModeResponse},
   * yielded as the last item in the stream.
   */
  includeFinalState?: boolean;
  /** How the agent should evaluate the final result. See {@link ResultEvaluation}. Defaults to `"none"`. */
  resultEvaluation?: ResultEvaluation;
};

/** Options for {@link QueryAgent.search}. */
export type QueryAgentSearchOnlyOptions = {
  /** The maximum number of results to return for the first page. Defaults to 20. */
  limit?: number;
  /**
   * The collections to query. Either a list of strings, or a list of
   * {@link QueryAgentCollectionConfig} objects. Will override any collections passed in the constructor.
   */
  collections?: (string | QueryAgentCollectionConfig)[];
  /**
   * Optional number between `0.0` and `1.0` to diversify results with MMR reranking. Higher values
   * push for more topical variety at the cost of relevance. Defaults to no diversity.
   */
  diversityWeight?: number;
};

/** Options for {@link QueryAgent.suggestQueries}. */
export type QueryAgentSuggestQueriesOptions = {
  /**
   * Optional override for the collections configured at instantiation. Either a list of strings,
   * or a list of {@link QueryAgentCollectionConfig} objects.
   */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** The number of queries to suggest. Defaults to 3. */
  numQueries?: number;
  /**
   * Optional natural language guidance for the style, topic, or language of the suggested queries.
   * Supplied in addition to the agent's system instructions.
   */
  instructions?: string;
};
