import { WeaviateClient } from "weaviate-client";
import { QueryAgent } from "./agent.js";
import { ApiQueryAgentResponse } from "./response/api-response.js";
import { QueryAgentResponse, ComparisonOperator } from "./response/response.js";
import { ApiSearchModeResponse } from "./response/api-response.js";
import { QueryAgentError } from "./response/error.js";

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
    }),
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

it("search-only mode success: caches searches and sends on subsequent request", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  const capturedBodies: ApiSearchModeResponse[] = [];

  const apiSuccess: ApiSearchModeResponse = {
    searches: [
      {
        query: "search query",
        filters: {
          filter_type: "integer",
          property_name: "test_property",
          operator: ComparisonOperator.GreaterThan,
          value: 0,
        },
        collection: "test_collection",
      },
    ],
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 2,
    },
    total_time: 1.5,
    search_results: {
      objects: [
        {
          uuid: "e6dc0a31-76f8-4bd3-b563-677ced6eb557",
          metadata: {
            creation_time: null,
            update_time: null,
            distance: null,
            certainty: null,
            score: 0.8,
            explain_score: null,
            rerank_score: null,
            is_consistent: null,
          },
          references: null,
          vector: {},
          properties: {
            test_property: 1.0,
            text: "hello",
          },
          collection: "test_collection",
        },
        {
          uuid: "cf5401cc-f4f1-4eb9-a6a1-173d34f94339",
          metadata: {
            creation_time: null,
            update_time: null,
            distance: null,
            certainty: null,
            score: 0.5,
            explain_score: null,
            rerank_score: null,
            is_consistent: null,
          },
          references: null,
          vector: {},
          properties: {
            test_property: 2.0,
            text: "world!",
          },
          collection: "test_collection",
        },
      ],
    },
  };

  // Mock the API response, and capture the request body to assert later
  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(
        JSON.parse(init.body as string) as ApiSearchModeResponse,
      );
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(apiSuccess),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient);

  const first = await agent.search("test query", {
    limit: 2,
    collections: ["test_collection"],
  });
  expect(first).toMatchObject({
    searches: [
      {
        collection: "test_collection",
        query: "search query",
        filters: {
          filterType: "integer",
          propertyName: "test_property",
          operator: ComparisonOperator.GreaterThan,
          value: 0,
        },
      },
    ],
    usage: {
      modelUnits: 1,
      usageInPlan: true,
      remainingPlanRequests: 2,
    },
    totalTime: 1.5,
    searchResults: {
      objects: [
        {
          uuid: "e6dc0a31-76f8-4bd3-b563-677ced6eb557",
          metadata: {
            score: 0.8,
          },
          vectors: {},
          properties: {
            test_property: 1.0,
            text: "hello",
          },
          collection: "test_collection",
        },
        {
          uuid: "cf5401cc-f4f1-4eb9-a6a1-173d34f94339",
          metadata: {
            score: 0.5,
          },
          vectors: {},
          properties: {
            test_property: 2.0,
            text: "world!",
          },
          collection: "test_collection",
        },
      ],
    },
  });
  expect(typeof first.next).toBe("function");

  // First request should have searches: null (generation request)
  expect(capturedBodies[0].searches).toBeNull();

  // Second request uses the next method on the first response
  const second = await first.next({ limit: 2, offset: 1 });
  // Second request should include the original searches (execution request)
  expect(capturedBodies[1].searches).toEqual(apiSuccess.searches);
  // Response mapping should be the same (because response is mocked)
  expect(second).toMatchObject({
    searches: first.searches,
    usage: first.usage,
    totalTime: first.totalTime,
    searchResults: first.searchResults,
  });
  expect(typeof second.next).toBe("function");
});

it("search-only mode failure propagates QueryAgentError", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  const errorJson = {
    error: {
      message: "Test error message",
      code: "test_error_code",
      details: { info: "test detail" },
    },
  };

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      text: () => Promise.resolve(JSON.stringify(errorJson)),
    } as Response),
  ) as jest.Mock;

  const agent = new QueryAgent(mockClient);
  try {
    await agent.search("test query", {
      limit: 2,
      collections: ["test_collection"],
    });
  } catch (err) {
    expect(err).toBeInstanceOf(QueryAgentError);
    expect(err).toMatchObject({
      message: "Test error message",
      code: "test_error_code",
      details: { info: "test detail" },
    });
  }
});
