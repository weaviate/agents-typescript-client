import {
  QueryAgentResponse,
  SearchResult,
  PropertyFilter,
  AggregationResult,
  PropertyAggregation,
  Usage,
  Source,
  StreamedTokens,
  ProgressMessage,
} from "./response.js";

import {
  ApiQueryAgentResponse,
  ApiSearchResult,
  ApiPropertyFilter,
  ApiAggregationResult,
  ApiPropertyAggregation,
  ApiUsage,
  ApiSource,
} from "./api-response.js";

import { ServerSentEvent } from "./server-sent-events.js";

export const mapResponse = (
  response: ApiQueryAgentResponse
): QueryAgentResponse => {
  const properties: ResponseProperties = {
    outputType: "finalState",
    originalQuery: response.original_query,
    collectionNames: response.collection_names,
    searches: mapSearches(response.searches),
    aggregations: mapAggregations(response.aggregations),
    usage: mapUsage(response.usage),
    totalTime: response.total_time,
    isPartialAnswer: response.is_partial_answer,
    missingInformation: response.missing_information,
    finalAnswer: response.final_answer,
    sources: mapSources(response.sources),
  };

  return {
    ...properties,
    display: () => display(properties),
  };
};

const mapSearches = (searches: ApiSearchResult[][]): SearchResult[][] =>
  searches.map((searchGroup) =>
    searchGroup.map((result) => ({
      collection: result.collection,
      queries: result.queries,
      filters: result.filters.map(mapPropertyFilters),
      filterOperators: result.filter_operators,
    }))
  );

const mapPropertyFilters = (filters: ApiPropertyFilter[]): PropertyFilter[] =>
  filters.map((filter) => ({
    propertyName: filter.property_name,
    operator: filter.operator,
    value: filter.value,
  }));

const mapAggregations = (
  aggregations: ApiAggregationResult[][]
): AggregationResult[][] =>
  aggregations.map((aggregationGroup) =>
    aggregationGroup.map((result) => ({
      collection: result.collection,
      searchQuery: result.search_query,
      groupbyProperty: result.groupby_property,
      aggregations: result.aggregations.map(mapPropertyAggregation),
      filters: mapPropertyFilters(result.filters),
    }))
  );

const mapPropertyAggregation = (
  aggregation: ApiPropertyAggregation
): PropertyAggregation => ({
  propertyName: aggregation.property_name,
  metrics: aggregation.metrics,
  topOccurrencesLimit:
    "top_occurrences_limit" in aggregation
      ? aggregation.top_occurrences_limit
      : undefined,
});

const mapUsage = (usage: ApiUsage): Usage => ({
  requests: usage.requests,
  requestTokens: usage.request_tokens,
  responseTokens: usage.response_tokens,
  totalTokens: usage.total_tokens,
  details: usage.details,
});

const mapSources = (sources: ApiSource[]): Source[] =>
  sources.map((source) => ({
    objectId: source.object_id,
    collection: source.collection,
  }));

const display = (response: ResponseProperties) => {
  console.log(JSON.stringify(response, undefined, 2));
};

type ResponseProperties = Omit<QueryAgentResponse, "display">;

type ProgressMessageJSON = Omit<ProgressMessage, "outputType"> & {
  output_type: "progress_message";
};

export const mapProgressMessageFromSSE = (sse: ServerSentEvent): ProgressMessage => {
  const data: ProgressMessageJSON = JSON.parse(sse.data);
  if (data.output_type !== "progress_message") {
    throw new Error(`Expected output_type "progress_message", got ${data.output_type}`);
  }

  return {
    outputType: "progressMessage",
    stage: data.stage,
    message: data.message,
    details: data.details,
  };
};

type StreamedTokensJSON = Omit<StreamedTokens, "outputType"> & {
  output_type: "streamed_tokens";
};

export const mapStreamedTokensFromSSE = (sse: ServerSentEvent): StreamedTokens => {
  const data: StreamedTokensJSON = JSON.parse(sse.data);
  if (data.output_type !== "streamed_tokens") {
    throw new Error(`Expected output_type "streamed_tokens", got ${data.output_type}`);
  }

  return {
    outputType: "streamedTokens",
    delta: data.delta,
  };
};


export const mapResponseFromSSE = (sse: ServerSentEvent): QueryAgentResponse => {
  const data: ApiQueryAgentResponse = JSON.parse(sse.data);

  const properties: ResponseProperties = {
    outputType: "finalState",
    originalQuery: data.original_query,
    collectionNames: data.collection_names,
    searches: mapSearches(data.searches),
    aggregations: mapAggregations(data.aggregations),
    usage: mapUsage(data.usage),
    totalTime: data.total_time,
    isPartialAnswer: data.is_partial_answer,
    missingInformation: data.missing_information,
    finalAnswer: data.final_answer,
    sources: mapSources(data.sources),
  };

  return {
    ...properties,
    display: () => display(properties),
  };
};
