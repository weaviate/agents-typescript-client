import { z } from "zod";
import { WeaviateClient } from "weaviate-client";
import { QueryAgent } from "./agent.js";
import { ApiQueryAgentResponse } from "./response/api-response.js";
import {
  QueryAgentResponse,
  ComparisonOperator,
  AskModeResponse,
  SuggestQueryResponse,
  ParsedAskModeResponse,
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
  const first = await agent.search("test query", {
    collections: ["test_collection"],
    diversityWeight: 0.5,
  });
  expect(capturedBodies[0].diversity_weight).toBe(0.5);

  // Paginated request should also include diversity_weight
  await first.next({ limit: 20, offset: 1 });
  expect(capturedBodies[1].diversity_weight).toBe(0.5);

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

it("search-only mode sends filtering and persists through pagination", async () => {
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

  const first = await agent.search("test query", {
    collections: ["test_collection"],
    filtering: "precision",
  });

  // First request should include filtering
  expect(capturedBodies[0].filtering).toBe("precision");

  // Paginated request should also include filtering
  await first.next({ limit: 20, offset: 1 });
  expect(capturedBodies[1].filtering).toBe("precision");
});

it("search-only mode defaults filtering to recall", async () => {
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

  await agent.search("test query", {
    collections: ["test_collection"],
  });

  // When no filtering is specified, it should not be sent (server-side default)
  expect(capturedBodies[0].filtering).toBeUndefined();
});

it("search-only mode sends effort and persists through pagination", async () => {
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

  const first = await agent.search("test query", {
    collections: ["test_collection"],
    effort: "high",
  });

  // First request should include effort
  expect(capturedBodies[0].effort).toBe("high");

  // Paginated request should also include effort
  await first.next({ limit: 20, offset: 1 });
  expect(capturedBodies[1].effort).toBe("high");
});

it("search-only mode omits effort when not provided", async () => {
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

  await agent.search("test query", {
    collections: ["test_collection"],
  });

  // When no effort is specified, it should not be sent (server-side default)
  expect(capturedBodies[0].effort).toBeUndefined();
});

it("search-only mode caches empty searches array for precision mode pagination", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  // Precision mode can return an empty searches array
  const apiSuccess: ApiSearchModeResponse = {
    searches: [],
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

  const first = await agent.search("test query", {
    collections: ["test_collection"],
    filtering: "precision",
  });

  // First request should have searches: null (generation request)
  expect(capturedBodies[0].searches).toBeNull();
  expect(capturedBodies[0].system_prompt).not.toBeUndefined();

  // Second request should use the cached empty array, not re-send as generation request
  await first.next({ limit: 20, offset: 1 });
  expect(capturedBodies[1].searches).toEqual([]);
  // Should NOT have system_prompt — that's only on the initial generation request
  expect(capturedBodies[1].system_prompt).toBeUndefined();
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

  expect(capturedBodies[0].collections).toEqual(["test_collection"]);
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
    "collection_a",
    "collection_b",
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

it("suggest queries with conversation includes conversation_context in request body", async () => {
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
    queries: [{ query: "Follow-up question?" }],
    collection_count: 1,
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 10,
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

  const agent = new QueryAgent(mockClient);

  const conversation = [
    { role: "user" as const, content: "What topics are covered?" },
    {
      role: "assistant" as const,
      content: "The collection covers ML and economics.",
    },
  ];

  await agent.suggestQueries({
    collections: ["test_collection"],
    conversation,
  });

  expect(capturedBodies[0].conversation_context).toEqual({
    messages: conversation,
  });
});

it("suggest queries without conversation omits conversation_context from request body", async () => {
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
    queries: [{ query: "Some query?" }],
    collection_count: 1,
    usage: {
      model_units: 1,
      usage_in_plan: true,
      remaining_plan_requests: 10,
    },
    total_time: 0.2,
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
  });

  expect(capturedBodies[0].conversation_context).toBeUndefined();
});

const mockClient = () =>
  ({
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  }) as unknown as WeaviateClient;

const askApiResponse = (finalAnswer: string): ApiAskModeResponse => ({
  searches: [],
  aggregations: [],
  usage: {
    model_units: 1,
    usage_in_plan: true,
    remaining_plan_requests: 2,
  },
  total_time: 1.5,
  is_partial_answer: false,
  missing_information: [],
  final_answer: finalAnswer,
  sources: [],
});

it("ask with a Zod output format parses and validates the final answer", async () => {
  const Answer = z.object({
    answer: z.string(),
    score: z.number(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  const finalAnswer = JSON.stringify({ answer: "Paris", score: 0.9 });
  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(JSON.parse(init.body as string));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(askApiResponse(finalAnswer)),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient());

  const response = await agent.ask("What is the capital of France?", {
    collections: ["test-collection"],
    outputFormat: Answer,
  });

  // The request carries the schema serialised to a Draft 2020-12 JSON Schema.
  expect(capturedBodies[0].output_format).toEqual(
    z.toJSONSchema(Answer, { target: "draft-2020-12" }),
  );

  // The raw string is still available, plus the parsed (and validated) object.
  expect(response.finalAnswer).toBe(finalAnswer);
  expect(response.finalAnswerParsed).toEqual({ answer: "Paris", score: 0.9 });

  // Compile-time: the parsed type is inferred from the schema.
  const parsed: ParsedAskModeResponse<z.infer<typeof Answer>> = response;
  const score: number = parsed.finalAnswerParsed.score;
  expect(score).toBe(0.9);
});

it("ask with a Zod output format throws when the answer violates the schema", async () => {
  const Answer = z.object({ answer: z.string(), score: z.number() });

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      // `score` is missing -> Zod validation must reject it.
      json: () => Promise.resolve(askApiResponse('{"answer":"Paris"}')),
    } as Response),
  ) as jest.Mock;

  const agent = new QueryAgent(mockClient());

  await expect(
    agent.ask("What is the capital of France?", {
      collections: ["test-collection"],
      outputFormat: Answer,
    }),
  ).rejects.toThrow();
});

it("ask with a raw JSON Schema output format parses the final answer as JSON", async () => {
  const jsonSchema: Record<string, unknown> = {
    type: "object",
    properties: { answer: { type: "string" } },
    required: ["answer"],
    additionalProperties: false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  const finalAnswer = JSON.stringify({ answer: "Paris" });
  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(JSON.parse(init.body as string));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(askApiResponse(finalAnswer)),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient());

  const response = await agent.ask("What is the capital of France?", {
    collections: ["test-collection"],
    outputFormat: jsonSchema,
  });

  // A raw JSON Schema is forwarded verbatim.
  expect(capturedBodies[0].output_format).toEqual(jsonSchema);
  expect(response.finalAnswer).toBe(finalAnswer);
  expect(response.finalAnswerParsed).toEqual({ answer: "Paris" });
});

it("ask without an output format omits output_format and returns plain text", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capturedBodies: any[] = [];

  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(JSON.parse(init.body as string));
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(askApiResponse("Plain text answer")),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient());

  const response = await agent.ask("What is the capital of France?", {
    collections: ["test-collection"],
  });

  expect(capturedBodies[0].output_format).toBeUndefined();
  expect(response.finalAnswer).toBe("Plain text answer");
  expect("finalAnswerParsed" in response).toBe(false);
});
