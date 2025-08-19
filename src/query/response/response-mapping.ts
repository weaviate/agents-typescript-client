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
  DateFilterValue,
  SearchModeResponse,
} from "./response.js";

import {
  ApiQueryAgentResponse,
  ApiSearchResult,
  ApiPropertyFilter,
  ApiAggregationResult,
  ApiPropertyAggregation,
  ApiUsage,
  ApiSource,
  ApiDateFilterValue,
  ApiSearchModeResponse,
} from "./api-response.js";

import { ServerSentEvent } from "./server-sent-events.js";

export const mapResponse = (
  response: ApiQueryAgentResponse,
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

const mapInnerSearches = (searches: ApiSearchResult[]): SearchResult[] =>
  searches.map((result) => ({
    collection: result.collection,
    queries: result.queries,
    filters: result.filters.map(mapPropertyFilters),
    filterOperators: result.filter_operators,
  }));

const mapSearches = (searches: ApiSearchResult[][]): SearchResult[][] =>
  searches.map((searchGroup) => mapInnerSearches(searchGroup));

const mapDatePropertyFilter = (
  filterValue: ApiDateFilterValue,
): DateFilterValue | undefined => {
  if ("exact_timestamp" in filterValue) {
    return {
      exactTimestamp: filterValue.exact_timestamp,
      operator: filterValue.operator,
    };
  } else if (
    "date_from" in filterValue &&
    "date_to" in filterValue &&
    filterValue.date_from != null &&
    filterValue.date_to != null
  ) {
    return {
      dateFrom: filterValue.date_from,
      dateTo: filterValue.date_to,
      inclusiveFrom: filterValue.inclusive_from,
      inclusiveTo: filterValue.inclusive_to,
    };
  } else if ("date_from" in filterValue && filterValue.date_from != null) {
    return {
      dateFrom: filterValue.date_from,
      inclusiveFrom: filterValue.inclusive_from,
    };
  } else if ("date_to" in filterValue && filterValue.date_to != null) {
    return {
      dateTo: filterValue.date_to,
      inclusiveTo: filterValue.inclusive_to,
    };
  }
  return undefined;
};

const mapPropertyFilters = (filters: ApiPropertyFilter[]): PropertyFilter[] =>
  filters.map((filter) => {
    switch (filter.filter_type) {
      case "integer":
        return {
          filterType: "integer",
          propertyName: filter.property_name,
          operator: filter.operator,
          value: filter.value,
        };

      case "integer_array":
        return {
          filterType: "integerArray",
          propertyName: filter.property_name,
          operator: filter.operator,
          value: filter.value,
        };

      case "text":
        return {
          filterType: "text",
          propertyName: filter.property_name,
          operator: filter.operator,
          value: filter.value,
        };

      case "text_array":
        return {
          filterType: "textArray",
          propertyName: filter.property_name,
          operator: filter.operator,
          value: filter.value,
        };

      case "boolean":
        return {
          filterType: "boolean",
          propertyName: filter.property_name,
          operator: filter.operator,
          value: filter.value,
        };

      case "boolean_array":
        return {
          filterType: "booleanArray",
          propertyName: filter.property_name,
          operator: filter.operator,
          value: filter.value,
        };

      case "date_range":
        const value = mapDatePropertyFilter(filter.value);
        if (!value) {
          return {
            filterType: "unknown",
            propertyName: (filter as ApiPropertyFilter).property_name,
          };
        }
        return {
          filterType: "dateRange",
          propertyName: filter.property_name,
          value,
        };

      case "date_array":
        return {
          filterType: "dateArray",
          propertyName: filter.property_name,
          operator: filter.operator,
          value: filter.value,
        };

      case "geo":
        return {
          filterType: "geo",
          propertyName: filter.property_name,
          latitude: filter.latitude,
          longitude: filter.longitude,
          maxDistanceMeters: filter.max_distance_meters,
        };

      case "is_null":
        return {
          filterType: "isNull",
          propertyName: filter.property_name,
          isNull: filter.is_null,
        };

      default:
        return {
          filterType: "unknown",
          propertyName: (filter as ApiPropertyFilter).property_name,
        };
    }
  });

const mapAggregations = (
  aggregations: ApiAggregationResult[][],
): AggregationResult[][] =>
  aggregations.map((aggregationGroup) =>
    aggregationGroup.map((result) => ({
      collection: result.collection,
      searchQuery: result.search_query,
      groupbyProperty: result.groupby_property,
      aggregations: result.aggregations.map(mapPropertyAggregation),
      filters: mapPropertyFilters(result.filters),
    })),
  );

const mapPropertyAggregation = (
  aggregation: ApiPropertyAggregation,
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

export const mapProgressMessageFromSSE = (
  sse: ServerSentEvent,
): ProgressMessage => {
  const data: ProgressMessageJSON = JSON.parse(sse.data);
  if (data.output_type !== "progress_message") {
    throw new Error(
      `Expected output_type "progress_message", got ${data.output_type}`,
    );
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

export const mapStreamedTokensFromSSE = (
  sse: ServerSentEvent,
): StreamedTokens => {
  const data: StreamedTokensJSON = JSON.parse(sse.data);
  if (data.output_type !== "streamed_tokens") {
    throw new Error(
      `Expected output_type "streamed_tokens", got ${data.output_type}`,
    );
  }

  return {
    outputType: "streamedTokens",
    delta: data.delta,
  };
};

export const mapResponseFromSSE = (
  sse: ServerSentEvent,
): QueryAgentResponse => {
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

export const mapSearchOnlyResponse = <T>(
  response: ApiSearchModeResponse<T>,
): {
  mappedResponse: SearchModeResponse<T>;
  apiSearches: ApiSearchResult[] | undefined;
} => {
  const apiSearches = response.searches;
  const mappedResponse: SearchModeResponse<T> = {
    originalQuery: response.original_query,
    searches: apiSearches ? mapInnerSearches(apiSearches) : undefined,
    usage: mapUsage(response.usage),
    totalTime: response.total_time,
    searchResults: response.search_results,
  };
  return { mappedResponse, apiSearches };
};
