import { WeaviateClient } from "weaviate-client";
import { QueryAgentResponse } from "./response/response.js";
import { mapResponse } from "./response/response-mapping.js";

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
  private systemPrompt?: string;
  private agentsHost: string;

  /**
   * Creates a new QueryAgent instance.
   *
   * @param client - The Weaviate client instance.
   * @param collections - The collections to query.
   * @param options - Additional options for the QueryAgent.
   */
  constructor(
    private client: WeaviateClient,
    private collections: string[],
    {
      systemPrompt,
      agentsHost = "https://api.agents.weaviate.io",
    }: QueryAgentOptions = {}
  ) {
    this.systemPrompt = systemPrompt;
    this.agentsHost = agentsHost;
  }

  /**
   * Run the query agent.
   *
   * @param query - The natural language query string for the agent.
   * @param options - Additional options for the run.
   * @returns The response from the query agent.
   */
  async run(
    query: string,
    { viewProperties }: QueryAgentRunOptions = {}
  ): Promise<QueryAgentResponse> {
    const { host, bearerToken, headers } =
      await this.client.getConnectionDetails();

    const response = await fetch(`${this.agentsHost}/agent/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearerToken!,
        "X-Weaviate-Cluster-Url": host,
      },
      body: JSON.stringify({
        headers,
        query,
        collection_names: this.collections,
        collection_view_properties: viewProperties,
        system_prompt: this.systemPrompt,
      }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      throw Error(`Query agent failed. ${JSON.stringify(responseBody)}`);
    }

    return mapResponse(responseBody);
  }
}

/** Options for the QueryAgent. */
export type QueryAgentOptions = {
  /** System prompt to guide the agent's behavior. */
  systemPrompt?: string;
  /** Host of the agents service. */
  agentsHost?: string;
};

/** Options for the QueryAgent run. */
export type QueryAgentRunOptions = {
  /** List of of property names the agent has the ability to view across all collections. */
  viewProperties?: string[];
};
