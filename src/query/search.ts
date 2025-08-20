import { WeaviateClient } from "weaviate-client";
import { SearchModeResponse } from "./response/response.js";
import { mapSearchOnlyResponse } from "./response/response-mapping.js";
import { mapCollections, QueryAgentCollectionConfig } from "./collection.js";
import { handleError } from "./response/error.js";
import {
  ApiSearchModeResponse,
  ApiSearchResult,
} from "./response/api-response.js";

/**
 * A configured searcher for the QueryAgent.
 *
 * Warning:
 * Weaviate Agents - Query Agent is an early stage alpha product.
 * The API is subject to breaking changes. Please ensure you are using the latest version of the client.
 *
 * For more information, see the [Weaviate Query Agent Docs](https://weaviate.io/developers/agents/query)
 */
export class QueryAgentSearcher<T> {
  private agentsHost: string;
  private query: string;
  private collections: (string | QueryAgentCollectionConfig)[];
  private systemPrompt?: string;
  private cachedSearches?: ApiSearchResult[];

  constructor(
    private client: WeaviateClient,
    query: string,
    {
      collections = [],
      systemPrompt,
      agentsHost = "https://api.agents.weaviate.io",
    }: {
      collections?: (string | QueryAgentCollectionConfig)[];
      systemPrompt?: string;
      agentsHost?: string;
    } = {},
  ) {
    this.query = query;
    this.collections = collections;
    this.systemPrompt = systemPrompt;
    this.agentsHost = agentsHost;
    this.cachedSearches = undefined;
  }

  private async getHeaders() {
    const { host, bearerToken, headers } =
      await this.client.getConnectionDetails();
    const requestHeaders = {
      "Content-Type": "application/json",
      Authorization: bearerToken!,
      "X-Weaviate-Cluster-Url": host,
      "X-Agent-Request-Origin": "typescript-client",
    };
    const connectionHeaders = headers;
    return { requestHeaders, connectionHeaders };
  }

  private buildRequestBody(
    limit: number,
    offset: number,
    connectionHeaders: HeadersInit | undefined,
  ) {
    const base = {
      headers: connectionHeaders,
      original_query: this.query,
      collections: mapCollections(this.collections),
      limit,
      offset,
    } as const;
    if (this.cachedSearches === undefined) {
      return {
        ...base,
        searches: null,
        system_prompt: this.systemPrompt || null,
      };
    }
    return {
      ...base,
      searches: this.cachedSearches,
    };
  }

  async execute(
    options: SearchExecutionOptions,
  ): Promise<SearchModeResponse<T>> {
    if (!this.collections || this.collections.length === 0) {
      throw Error("No collections provided to the query agent.");
    }
    const { requestHeaders, connectionHeaders } = await this.getHeaders();

    const { limit = 20, offset = 0 } = options;
    const response = await fetch(`${this.agentsHost}/agent/search_only`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(
        this.buildRequestBody(limit, offset, connectionHeaders),
      ),
    });
    if (!response.ok) {
      await handleError(await response.text());
    }
    const parsedResponse = (await response.json()) as ApiSearchModeResponse<T>;
    const { mappedResponse, apiSearches } =
      mapSearchOnlyResponse<T>(parsedResponse);
    // If we successfully mapped the searches, cache them for the next request.
    // Since this cache is a private internal value, there's not point in mapping
    // back and forth between the exported and API types, so we cache apiSearches
    if (mappedResponse.searches) {
      this.cachedSearches = apiSearches;
    }
    return mappedResponse;
  }
}

/** Options for the executing a prepared QueryAgent search. */
export type SearchExecutionOptions = {
  /** The maximum number of results to return. */
  limit?: number;
  /** The offset of the results to return, for paginating through query result sets. */
  offset?: number;
};
