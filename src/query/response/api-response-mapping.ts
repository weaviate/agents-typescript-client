import {
  AggregationResult,
  PropertyAggregation,
  PropertyFilter,
  QueryAgentResponse,
  SearchResult,
  Source,
  Usage,
  DateFilterValue,
} from "./response.js";

import {
  ApiAggregationResult,
  ApiPropertyAggregation,
  ApiPropertyFilter,
  ApiQueryAgentResponse,
  ApiSearchResult,
  ApiSource,
  ApiUsage,
  ApiDateFilterValue,
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

const mapDateFilterValue = (value: DateFilterValue): ApiDateFilterValue | undefined => {
  if ("exactTimestamp" in value) {
    return {
      exact_timestamp: value.exactTimestamp,
      operator: value.operator,
    };
  } else if (
    "dateFrom" in value
    && "dateTo" in value
    && value.dateFrom != null
    && value.dateTo != null
  ) {
    return {
      date_from: value.dateFrom,
      date_to: value.dateTo,
      inclusive_from: value.inclusiveFrom,
      inclusive_to: value.inclusiveTo,
    };
  } else if ("dateFrom" in value && value.dateFrom != null) {
    return {
      date_from: value.dateFrom,
      inclusive_from: value.inclusiveFrom,
    };
  } else if ("dateTo" in value && value.dateTo != null) {
    return {
      date_to: value.dateTo,
      inclusive_to: value.inclusiveTo,
    };
  }
  else {
    return undefined
  }
};

const mapApiPropertyFilters = (
  filters: PropertyFilter[]
): ApiPropertyFilter[] =>
  filters.map((filter) => {
    switch (filter.filterType) {
      case "integer":
        return {
          filter_type: "integer",
          property_name: filter.propertyName,
          operator: filter.operator,
          value: filter.value,
        };
      case "integerArray":
        return {
          filter_type: "integer_array",
          property_name: filter.propertyName,
          operator: filter.operator,
          value: filter.value,
        };
      case "text":
        return {
          filter_type: "text",
          property_name: filter.propertyName,
          operator: filter.operator,
          value: filter.value,
        };
      case "textArray":
        return {
          filter_type: "text_array",
          property_name: filter.propertyName,
          operator: filter.operator,
          value: filter.value,
        };
      case "boolean":
        return {
          filter_type: "boolean",
          property_name: filter.propertyName,
          operator: filter.operator,
          value: filter.value,
        };
      case "booleanArray":
        return {
          filter_type: "boolean_array",
          property_name: filter.propertyName,
          operator: filter.operator,
          value: filter.value,
        };
      case "dateRange":
        const value = mapDateFilterValue(filter.value);
        if (!value) {
          return undefined;
        }
        return {
          filter_type: "date_range",
          property_name: filter.propertyName,
          value,
        };
      case "dateArray":
        return {
          filter_type: "date_array",
          property_name: filter.propertyName,
          operator: filter.operator,
          value: filter.value,
        };
      case "geo":
        return {
          filter_type: "geo",
          property_name: filter.propertyName,
          latitude: filter.latitude,
          longitude: filter.longitude,
          max_distance_meters: filter.maxDistanceMeters,
        };
      case "isNull":
        return {
          filter_type: "is_null",
          property_name: filter.propertyName,
          is_null: filter.isNull,
        };
      default:
        return undefined
    }
  }).filter((filter): filter is ApiPropertyFilter => filter !== undefined);

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
