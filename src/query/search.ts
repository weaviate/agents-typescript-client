import { WeaviateClient } from "weaviate-client";
import {
  SearchExecutionOptions,
  SearchModeResponse,
} from "./response/response.js";
import { mapSearchOnlyResponse } from "./response/response-mapping.js";
import { mapCollections } from "./collection.js";
import { handleError } from "./response/error.js";
import { ApiSearch, ApiSearchModeResponse } from "./response/api-response.js";
import { QueryAgentQuery } from "./agent.js";
import { QueryAgentCollection } from "./collection.js";
import { getHeaders } from "./connection.js";

/**
 * A configured searcher for the QueryAgent.
 *
 * This is used internally by the QueryAgent class to run search-mode queries.
 * After the first request is made, the underlying searches are cached and can
 * be reused for paginating through the a consistent set of results.
 */
export class QueryAgentSearcher {
  private cachedSearches?: ApiSearch[];

  constructor(
    private client: WeaviateClient,
    private query: QueryAgentQuery,
    private collections: QueryAgentCollection[],
    private systemPrompt: string | undefined,
    private agentsHost: string,
  ) {}

  private buildRequestBody(
    limit: number,
    offset: number,
    connectionHeaders: HeadersInit | undefined,
  ) {
    const base = {
      headers: connectionHeaders,
      original_query:
        typeof this.query === "string" ? this.query : { messages: this.query },
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

  /**
   * Run the search-only agent with the given limit and offset values.
   *
   * Calling this method multiple times on the same QueryAgentSearcher instance will result
   * in the same underlying searches being performed each time, allowing you to paginate
   * over a consistent results set.
   *
   * @param [options] - Options for executing the search
   * @param [options.limit] - The maximum number of results to return. Defaults to 20 if not specified.
   * @param [options.offset] - The offset to start from.
   * @returns A SearchModeResponse object containing the results, usage, and underlying searches performed.
   */
  async run({
    limit = 20,
    offset,
  }: SearchExecutionOptions): Promise<SearchModeResponse> {
    if (!this.collections || this.collections.length === 0) {
      throw Error("No collections provided to the query agent.");
    }
    const { requestHeaders, connectionHeaders } = await getHeaders(this.client);

    const response = await fetch(`${this.agentsHost}/query/search_only`, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(
        this.buildRequestBody(limit, offset, connectionHeaders),
      ),
    });
    if (!response.ok) {
      await handleError(await response.text());
    }
    const parsedResponse = (await response.json()) as ApiSearchModeResponse;
    const { mappedResponse, apiSearches } =
      mapSearchOnlyResponse(parsedResponse);
    // If we successfully mapped the searches, cache them for the next request.
    // Since this cache is a private internal value, there's not point in mapping
    // back and forth between the exported and API types, so we cache apiSearches
    if (mappedResponse.searches) {
      this.cachedSearches = apiSearches;
    }
    return {
      ...mappedResponse,
      next: async (options: SearchExecutionOptions) => this.run(options),
    };
  }
}
