import { WeaviateClient } from "weaviate-client";
import {
  QueryAgentResponse,
  ProgressMessage,
  StreamedTokens,
  AskModeResponse,
} from "./response/response.js";
import {
  mapResponse,
  mapProgressMessageFromSSE,
  mapStreamedTokensFromSSE,
  mapResponseFromSSE,
  mapAskModeResponse,
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
 * Warning:
 * Weaviate Agents - Query Agent is an early stage alpha product.
 * The API is subject to breaking changes. Please ensure you are using the latest version of the client.
 *
 * For more information, see the [Weaviate Query Agent Docs](https://weaviate.io/developers/agents/query)
 */
export class QueryAgent {
  private collections?: (string | QueryAgentCollectionConfig)[];
  private systemPrompt?: string;
  private agentsHost: string;

  /**
   * Creates a new QueryAgent instance.
   *
   * @param client - The Weaviate client instance.
   * @param options - Additional options for the QueryAgent.
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
   * @deprecated Use {@link ask} instead.
   * @param query - The natural language query string for the agent.
   * @param options - Additional options for the run.
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
      }),
    });

    if (!response.ok) {
      await handleError(await response.text());
    }

    return mapResponse(await response.json());
  }

  /**
   * Ask query agent a question.
   *
   * @param query - The natural language query string or conversation context for the agent.
   * @param options - Additional options for the run.
   * @returns The response from the query agent.
   */
  async ask(
    query: QueryAgentQuery,
    { collections }: QueryAgentAskOptions = {},
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
   * @deprecated Use {@link askStream} instead.
   * @param query - The natural language query string for the agent.
   * @param options - Additional options for the run.
   * @returns The response from the query agent.
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
        output = mapResponseFromSSE(event);
      } else {
        throw new Error(`Unexpected event type: ${event.event}: ${event.data}`);
      }

      yield output;
    }
  }

  /**
   * Ask query agent a question and stream the response.
   *
   * @param query - The natural language query string or conversation context for the agent.
   * @param options - Additional options for the run.
   * @returns The response from the query agent.
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
  ): AsyncGenerator<StreamedTokens | QueryAgentResponse>;
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
  ): AsyncGenerator<ProgressMessage | StreamedTokens | QueryAgentResponse>;
  async *askStream(
    query: QueryAgentQuery,
    {
      collections,
      includeProgress,
      includeFinalState,
    }: QueryAgentAskStreamOptions = {},
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
          query: typeof query === "string" ? query : { messages: query },
          collections: mapCollections(targetCollections),
          system_prompt: this.systemPrompt,
          include_progress: includeProgress ?? true,
          include_final_state: includeFinalState ?? true,
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
        output = mapResponseFromSSE(event);
      } else {
        throw new Error(`Unexpected event type: ${event.event}: ${event.data}`);
      }

      yield output;
    }
  }

  /**
   * Run the Query Agent search-only mode.
   *
   * Sends the initial search request and returns the first page of results.
   * The returned response includes a `next` method for pagination which
   * reuses the same underlying searches to ensure consistency across pages.
   */
  async search(
    query: QueryAgentQuery,
    { limit = 20, collections }: QueryAgentSearchOnlyOptions = {},
  ): Promise<SearchModeResponse> {
    const searcher = new QueryAgentSearcher(
      this.client,
      query,
      this.validateCollections(collections),
      this.systemPrompt,
      this.agentsHost,
    );

    return searcher.run({ limit, offset: 0 });
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

/** Options for the QueryAgent. */
export type QueryAgentOptions = {
  /** List of collections to query. Will be overriden if passed in the `run` method. */
  collections?: QueryAgentCollection[];
  /** System prompt to guide the agent's behavior. */
  systemPrompt?: string;
  /** Host of the agents service. */
  agentsHost?: string;
};

export type QueryAgentQuery = string | ChatMessage[];

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Options for the QueryAgent run. */
export type QueryAgentRunOptions = {
  /** List of collections to query. Will override any collections if passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** Previous response from the agent. */
  context?: QueryAgentResponse;
};

/** Options for the QueryAgent ask. */
export type QueryAgentAskOptions = {
  /** List of collections to query. Will override any collections if passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
};

/** Options for the QueryAgent stream. */
export type QueryAgentStreamOptions = {
  /** List of collections to query. Will override any collections if passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** Previous response from the agent. */
  context?: QueryAgentResponse;
  /** Include progress messages in the stream. */
  includeProgress?: boolean;
  /** Include final state in the stream. */
  includeFinalState?: boolean;
};

/** Options for the QueryAgent askStream. */
export type QueryAgentAskStreamOptions = {
  /** List of collections to query. Will override any collections if passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** Include progress messages in the stream. */
  includeProgress?: boolean;
  /** Include final state in the stream. */
  includeFinalState?: boolean;
};

/** Options for the QueryAgent search-only run. */
export type QueryAgentSearchOnlyOptions = {
  /** The maximum number of results to return. */
  limit?: number;
  /** List of collections to query. Will override any collections if passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
};
