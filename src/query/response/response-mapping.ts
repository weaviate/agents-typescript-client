import {
  QueryAgentResponse,
  SearchResult,
  PropertyFilter,
  AggregationResult,
  PropertyAggregation,
  Usage,
  Source,
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

export const mapResponse = (
  response: ApiQueryAgentResponse
): QueryAgentResponse => {
  const properties: ResponseProperties = {
    originalQuery: response.original_query,
    collectionNames: response.collection_names,
    searches: mapSearches(response.searches),
    aggregations: mapAggregations(response.aggregations),
    usage: mapUsage(response.usage),
    totalTime: response.total_time,
    aggregationAnswer: response.aggregation_answer,
    hasAggregationAnswer: response.has_aggregation_answer,
    hasSearchAnswer: response.has_search_answer,
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
      filters: result.filters.map(mapPropertyFilter),
      filterOperators: result.filter_operators,
    }))
  );

const mapPropertyFilter = (filter: ApiPropertyFilter): PropertyFilter => ({
  propertyName: filter.property_name,
  operator: filter.operator,
  value: filter.value,
});

const mapAggregations = (
  aggregations: ApiAggregationResult[][]
): AggregationResult[][] =>
  aggregations.map((aggGroup) =>
    aggGroup.map((result) => ({
      collection: result.collection,
      searchQuery: result.search_query,
      groupbyProperty: result.groupby_property,
      aggregations: result.aggregations.map(mapPropertyAggregation),
      filters: result.filters.map(mapPropertyFilter),
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
