import { WeaviateClient } from "weaviate-client";
import { QueryAgent } from "./agent.js";
import { ApiQueryAgentResponse } from "./response/api-response.js";
import {
  QueryAgentResponse,
  ComparisonOperator,
  AskModeResponse,
  SuggestQueryResponse,
} from "./response/response.js";
import {
  ApiSearchModeResponse,
  ApiAskModeResponse,
  ApiSuggestQueryResponse,
} from "./response/api-response.js";
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

it("runs the query agent ask", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  const apiSuccess: ApiAskModeResponse = {
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
        sort_property: undefined,
        uuid_value: undefined,
      },
      {
        query: undefined,
        filters: {
          filter_type: "integer",
          property_name: "test_property",
          operator: ComparisonOperator.GreaterThan,
          value: 0,
        },
        collection: "test_collection",
        sort_property: {
          property_name: "test_property",
          order: "ascending",
          tie_break: {
            property_name: "test_property_2",
            order: "descending",
            tie_break: undefined,
          },
        },
        uuid_value: "e6dc0a31-76f8-4bd3-b563-677ced6eb557",
      },
    ],
    aggregations: [],
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 2,
    },
    total_time: 1.5,
    is_partial_answer: false,
    missing_information: [],
    final_answer: "Test answer",
    sources: [
      {
        object_id: "123",
        collection: "test-collection",
      },
    ],
  };

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(apiSuccess),
    } as Response),
  ) as jest.Mock;

  const agent = new QueryAgent(mockClient, {
    systemPrompt: "test system prompt",
  });

  const response = await agent.ask("What is the capital of France?", {
    collections: ["test-collection"],
  });

  expect(response).toEqual<AskModeResponse>({
    outputType: "finalState",
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
        sortProperty: undefined,
        uuidValue: undefined,
      },
      {
        collection: "test_collection",
        query: undefined,
        filters: {
          filterType: "integer",
          propertyName: "test_property",
          operator: ComparisonOperator.GreaterThan,
          value: 0,
        },
        sortProperty: {
          propertyName: "test_property",
          order: "ascending",
          tieBreak: {
            propertyName: "test_property_2",
            order: "descending",
          },
        },
        uuidValue: "e6dc0a31-76f8-4bd3-b563-677ced6eb557",
      },
    ],
    aggregations: [],
    usage: {
      modelUnits: 1,
      usageInPlan: true,
      remainingPlanRequests: 2,
    },
    totalTime: 1.5,
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
        sort_property: undefined,
        uuid_value: undefined,
      },
      {
        query: undefined,
        filters: {
          filter_type: "integer",
          property_name: "test_property",
          operator: ComparisonOperator.GreaterThan,
          value: 0,
        },
        collection: "test_collection",
        sort_property: {
          property_name: "test_property",
          order: "ascending",
          tie_break: {
            property_name: "test_property_2",
            order: "descending",
            tie_break: undefined,
          },
        },
        uuid_value: undefined,
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
        sortProperty: undefined,
        uuidValue: undefined,
      },
      {
        collection: "test_collection",
        query: undefined,
        filters: {
          filterType: "integer",
          propertyName: "test_property",
          operator: ComparisonOperator.GreaterThan,
          value: 0,
        },
        sortProperty: {
          propertyName: "test_property",
          order: "ascending",
          tieBreak: {
            propertyName: "test_property_2",
            order: "descending",
          },
        },
        uuidValue: undefined,
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

it("search-only mode sends diversity_weight when provided", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  const apiSuccess: ApiSearchModeResponse = {
    searches: [
      {
        query: "search query",
        collection: "test_collection",
      },
    ],
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 2,
    },
    total_time: 1.0,
    search_results: { objects: [] },
  };

  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(JSON.parse(init.body as string));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(apiSuccess),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient);

  // With diversityWeight provided
  await agent.search("test query", {
    collections: ["test_collection"],
    diversityWeight: 0.5,
  });
  expect(capturedBodies[0].diversity_weight).toBe(0.5);

  // Without diversityWeight provided
  capturedBodies.length = 0;
  await agent.search("test query", {
    collections: ["test_collection"],
  });
  expect(capturedBodies[0].diversity_weight).toBeNull();
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

it("suggest queries mode success", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  const apiSuccess: ApiSuggestQueryResponse = {
    queries: [
      { query: "What are the most popular items?" },
      { query: "How many records exist?" },
      { query: "Show me recent entries" },
    ],
    collection_count: 1,
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 10,
    },
    total_time: 0.5,
  };

  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(JSON.parse(init.body as string));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(apiSuccess),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient);

  const response = await agent.suggestQueries({
    collections: ["test_collection"],
  });

  expect(response).toEqual<SuggestQueryResponse>({
    queries: [
      { query: "What are the most popular items?" },
      { query: "How many records exist?" },
      { query: "Show me recent entries" },
    ],
    collectionCount: 1,
    usage: {
      modelUnits: 1,
      usageInPlan: true,
      remainingPlanRequests: 10,
    },
    totalTime: 0.5,
  });

  expect(capturedBodies[0].collections).toEqual([{ name: "test_collection" }]);
  expect(capturedBodies[0].num_queries).toBe(3);
  expect(capturedBodies[0].instructions).toBeUndefined();
});

it("suggest queries mode passes custom num_queries and instructions", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  const apiSuccess: ApiSuggestQueryResponse = {
    queries: [
      { query: "First query" },
      { query: "Second query" },
      { query: "Third query" },
      { query: "Fourth query" },
      { query: "Fifth query" },
    ],
    collection_count: 1,
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 9,
    },
    total_time: 0.8,
  };

  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(JSON.parse(init.body as string));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(apiSuccess),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient);

  await agent.suggestQueries({
    collections: ["test_collection"],
    numQueries: 5,
    instructions: "Focus on aggregation queries",
  });

  expect(capturedBodies[0].num_queries).toBe(5);
  expect(capturedBodies[0].instructions).toBe("Focus on aggregation queries");
});

it("suggest queries mode uses constructor collections", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  const apiSuccess: ApiSuggestQueryResponse = {
    queries: [{ query: "Test query" }],
    collection_count: 2,
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 8,
    },
    total_time: 0.3,
  };

  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(JSON.parse(init.body as string));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(apiSuccess),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient, {
    collections: ["collection_a", "collection_b"],
  });

  await agent.suggestQueries();

  expect(capturedBodies[0].collections).toEqual([
    { name: "collection_a" },
    { name: "collection_b" },
  ]);
});

it("suggest queries mode failure propagates QueryAgentError", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  const errorJson = {
    error: {
      message: "Suggest queries failed",
      code: "suggest_error",
      details: { info: "bad request" },
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
    await agent.suggestQueries({
      collections: ["test_collection"],
    });
  } catch (err) {
    expect(err).toBeInstanceOf(QueryAgentError);
    expect(err).toMatchObject({
      message: "Suggest queries failed",
      code: "suggest_error",
      details: { info: "bad request" },
    });
  }
});
