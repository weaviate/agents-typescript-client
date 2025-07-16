import { WeaviateClient } from "weaviate-client";
import { QueryAgent } from "./agent.js";
import { ApiQueryAgentResponse } from "./response/api-response.js";
import { QueryAgentResponse } from "./response/response.js";

it("runs the query agent", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve<ApiQueryAgentResponse>({
          original_query: "Test query",
          collection_names: ["test-collection"],
          searches: [
            [
              {
                collection: "test-collection",
                queries: ["Test search"],
                filters: [],
                filter_operators: "AND",
              },
            ],
          ],
          aggregations: [],
          usage: {
            requests: 1,
            request_tokens: 128,
            response_tokens: 256,
            total_tokens: 384,
          },
          total_time: 10,
          is_partial_answer: false,
          missing_information: [],
          final_answer: "Test answer",
          sources: [
            {
              object_id: "123",
              collection: "test-collection",
            },
          ],
        }),
    })
  ) as jest.Mock;

  const agent = new QueryAgent(mockClient, {
    systemPrompt: "test system prompt",
  });

  const response = await agent.run("What is the capital of France?", {
    collections: ["test-collection"],
  });

  expect(response).toEqual<QueryAgentResponse>({
    outputType: "finalState",
    originalQuery: "Test query",
    collectionNames: ["test-collection"],
    searches: [
      [
        {
          collection: "test-collection",
          queries: ["Test search"],
          filters: [],
          filterOperators: "AND",
        },
      ],
    ],
    aggregations: [],
    usage: {
      requests: 1,
      requestTokens: 128,
      responseTokens: 256,
      totalTokens: 384,
      details: undefined,
    },
    totalTime: 10,
    isPartialAnswer: false,
    missingInformation: [],
    finalAnswer: "Test answer",
    sources: [
      {
        objectId: "123",
        collection: "test-collection",
      },
    ],
    display: expect.any(Function),
  });
});
