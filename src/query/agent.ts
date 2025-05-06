import { WeaviateClient } from "weaviate-client";
import { QueryAgentResponse } from "./response/response.js";
import { mapResponse } from "./response/response-mapping.js";

export class QueryAgent {
  private systemPrompt?: string;
  private agentsHost: string;

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

export type QueryAgentOptions = {
  systemPrompt?: string;
  agentsHost?: string;
};

export type QueryAgentRunOptions = {
  viewProperties?: string[];
};
