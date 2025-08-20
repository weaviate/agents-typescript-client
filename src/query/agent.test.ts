import { WeaviateClient } from "weaviate-client";
import { QueryAgent } from "./agent.js";
import { ApiQueryAgentResponse } from "./response/api-response.js";
import {
  QueryAgentResponse,
  ComparisonOperator,
  SearchModeResponse,
} from "./response/response.js";
import { QueryAgentSearcher } from "./search.js";
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

it("prepareSearch returns a QueryAgentSearcher", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  const agent = new QueryAgent(mockClient, {
    systemPrompt: "test system prompt",
  });

  const searcher = agent.configureSearch("test query");
  expect(searcher).toBeInstanceOf(QueryAgentSearcher);
});

it("search-only mode success: caches searches and sends on subsequent request", async () => {
  const mockClient = {
    getConnectionDetails: jest.fn().mockResolvedValue({
      host: "test-cluster",
      bearerToken: "test-token",
      headers: { "X-Provider": "test-key" },
    }),
  } as unknown as WeaviateClient;

  const capturedBodies: ApiSearchModeResponse<undefined>[] = [];

  const apiSuccess: ApiSearchModeResponse<undefined> = {
    original_query: "Test this search only mode!",
    searches: [
      {
        queries: ["search query"],
        filters: [
          [
            {
              filter_type: "integer",
              property_name: "test_property",
              operator: ComparisonOperator.GreaterThan,
              value: 0,
            },
          ],
        ],
        filter_operators: "AND",
        collection: "test_collection",
      },
    ],
    usage: {
      requests: 0,
      request_tokens: undefined,
      response_tokens: undefined,
      total_tokens: undefined,
      details: undefined,
    },
    total_time: 1.5,
    search_results: {
      objects: [
        {
          uuid: "e6dc0a31-76f8-4bd3-b563-677ced6eb557",
          metadata: {},
          references: {},
          vectors: {},
          properties: {
            test_property: 1.0,
            text: "hello",
          },
        },
        {
          uuid: "cf5401cc-f4f1-4eb9-a6a1-173d34f94339",
          metadata: {},
          references: {},
          vectors: {},
          properties: {
            test_property: 2.0,
            text: "world!",
          },
        },
      ],
    },
  };

  // Mock the API response, and capture the request body to assert later
  global.fetch = jest.fn((url, init?: RequestInit) => {
    if (init && init.body) {
      capturedBodies.push(
        JSON.parse(init.body as string) as ApiSearchModeResponse<undefined>,
      );
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(apiSuccess),
    } as Response);
  }) as jest.Mock;

  const agent = new QueryAgent(mockClient);
  const searcher = agent.configureSearch("test query", {
    collections: ["test_collection"],
  });

  const first = await searcher.run({ limit: 2, offset: 0 });

  expect(first).toEqual<SearchModeResponse<undefined>>({
    originalQuery: apiSuccess.original_query,
    searches: [
      {
        collection: "test_collection",
        queries: ["search query"],
        filters: [
          [
            {
              filterType: "integer",
              propertyName: "test_property",
              operator: ComparisonOperator.GreaterThan,
              value: 0,
            },
          ],
        ],
        filterOperators: "AND",
      },
    ],
    usage: {
      requests: 0,
      requestTokens: undefined,
      responseTokens: undefined,
      totalTokens: undefined,
      details: undefined,
    },
    totalTime: 1.5,
    searchResults: apiSuccess.search_results,
  });

  // First request should have searches: null (generation request)
  expect(capturedBodies[0].searches).toBeNull();
  const second = await searcher.run({ limit: 2, offset: 1 });
  // Second request should include the original searches (execution request)
  expect(capturedBodies[1].searches).toEqual(apiSuccess.searches);
  // Response mapping should be the same (because response is mocked)
  expect(second).toEqual(first);
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
  const searcher = agent.configureSearch("test query", {
    collections: ["test_collection"],
  });

  try {
    await searcher.run({ limit: 2, offset: 0 });
  } catch (err) {
    expect(err).toBeInstanceOf(QueryAgentError);
    expect(err).toMatchObject({
      message: "Test error message",
      code: "test_error_code",
      details: { info: "test detail" },
    });
  }
});
