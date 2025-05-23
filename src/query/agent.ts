import { WeaviateClient } from "weaviate-client";
import { QueryAgentResponse } from "./response/response.js";
import { mapResponse } from "./response/response-mapping.js";
import { mapApiResponse } from "./response/api-response-mapping.js";
import { mapCollections, QueryAgentCollectionConfig } from "./collection.js";

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
    }: QueryAgentOptions = {}
  ) {
    this.collections = collections;
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
    { collections, context }: QueryAgentRunOptions = {}
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
      throw Error(`Query agent failed. ${await response.text()}`);
    }

    return mapResponse(await response.json());
  }
}

/** Options for the QueryAgent. */
export type QueryAgentOptions = {
  /** List of collections to query. Will be overriden if passed in the `run` method. */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** System prompt to guide the agent's behavior. */
  systemPrompt?: string;
  /** Host of the agents service. */
  agentsHost?: string;
};

/** Options for the QueryAgent run. */
export type QueryAgentRunOptions = {
  /** List of collections to query. Will override any collections if passed in the constructor. */
  collections?: (string | QueryAgentCollectionConfig)[];
  /** Previous response from the agent. */
  context?: QueryAgentResponse;
};
