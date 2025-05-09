import {
  AggregationResult,
  PropertyAggregation,
  PropertyFilter,
  QueryAgentResponse,
  SearchResult,
  Source,
  Usage,
} from "./response.js";

import {
  ApiAggregationResult,
  ApiPropertyAggregation,
  ApiPropertyFilter,
  ApiQueryAgentResponse,
  ApiSearchResult,
  ApiSource,
  ApiUsage,
} from "./api-response.js";

export const mapApiResponse = (
  response: QueryAgentResponse
): ApiQueryAgentResponse => ({
  original_query: response.originalQuery,
  collection_names: response.collectionNames,
  searches: mapApiSearches(response.searches),
  aggregations: mapApiAggregations(response.aggregations),
  usage: mapApiUsage(response.usage),
  total_time: response.totalTime,
  aggregation_answer: response.aggregationAnswer,
  has_aggregation_answer: response.hasAggregationAnswer,
  has_search_answer: response.hasSearchAnswer,
  is_partial_answer: response.isPartialAnswer,
  missing_information: response.missingInformation,
  final_answer: response.finalAnswer,
  sources: mapApiSources(response.sources),
});

const mapApiSearches = (searches: SearchResult[][]): ApiSearchResult[][] =>
  searches.map((searchGroup) =>
    searchGroup.map((result) => ({
      collection: result.collection,
      queries: result.queries,
      filters: result.filters.map(mapApiPropertyFilters),
      filter_operators: result.filterOperators,
    }))
  );

const mapApiPropertyFilters = (
  filters: PropertyFilter[]
): ApiPropertyFilter[] =>
  filters.map((filter) => ({
    property_name: filter.propertyName,
    operator: filter.operator,
    value: filter.value,
  }));

const mapApiAggregations = (
  aggregations: AggregationResult[][]
): ApiAggregationResult[][] =>
  aggregations.map((aggregationGroup) =>
    aggregationGroup.map((result) => ({
      collection: result.collection,
      search_query: result.searchQuery,
      groupby_property: result.groupbyProperty,
      aggregations: result.aggregations.map(mapApiPropertyAggregation),
      filters: mapApiPropertyFilters(result.filters),
    }))
  );

const mapApiPropertyAggregation = (
  aggregation: PropertyAggregation
): ApiPropertyAggregation => ({
  property_name: aggregation.propertyName,
  metrics: aggregation.metrics,
  top_occurrences_limit:
    "topOccurrencesLimit" in aggregation
      ? aggregation.topOccurrencesLimit
      : undefined,
});

const mapApiUsage = (usage: Usage): ApiUsage => ({
  requests: usage.requests,
  request_tokens: usage.requestTokens,
  response_tokens: usage.responseTokens,
  total_tokens: usage.totalTokens,
  details: usage.details,
});

const mapApiSources = (sources: Source[]): ApiSource[] =>
  sources.map((source) => ({
    object_id: source.objectId,
    collection: source.collection,
  }));
