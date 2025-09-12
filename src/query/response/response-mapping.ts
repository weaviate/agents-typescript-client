import { ReturnMetadata } from "weaviate-client";

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
  WeaviateObjectWithCollection,
  WeaviateReturnWithCollection,
  SearchModeResponse,
  FilterAndOr,
  AskModeResponse,
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
  ApiWeaviateObject,
  ApiWeaviateReturn,
  ApiFilterAndOr,
  ApiAskModeResponse,
} from "./api-response.js";

import { ServerSentEvent } from "./server-sent-events.js";

export const mapAskModeResponse = (
  response: ApiAskModeResponse,
): AskModeResponse => {
  const properties: AskModeResponseProperties = {
    outputType: "finalState",
    searches: response.searches.map((search) => ({
      query: search.query,
      filters: search.filters ? mapFilter(search.filters) : undefined,
      collection: search.collection,
    })),
    aggregations: response.aggregations.map((aggregation) => ({
      groupbyProperty: aggregation.groupby_property,
      aggregation: mapPropertyAggregation(aggregation.aggregation),
      filters: aggregation.filters ? mapFilter(aggregation.filters) : undefined,
      collection: aggregation.collection,
    })),
    usage: {
      modelUnits: response.usage.model_units,
      usageInPlan: response.usage.usage_in_plan,
      remainingPlanRequests: response.usage.remaining_plan_requests,
    },
    totalTime: response.total_time,
    isPartialAnswer: response.is_partial_answer,
    missingInformation: response.missing_information,
    finalAnswer: response.final_answer,
    sources: response.sources ? mapSources(response.sources) : undefined,
  };

  return {
    ...properties,
    display: () => display(properties),
  };
};

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
    filters: result.filters.map((filter) => filter.map(mapPropertyFilter)),
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

const mapFilter = (
  filter: ApiPropertyFilter | ApiFilterAndOr,
): PropertyFilter | FilterAndOr =>
  multiFilter(filter)
    ? { combine: filter.combine, filters: filter.filters.map(mapFilter) }
    : mapPropertyFilter(filter);

const mapPropertyFilter = (filter: ApiPropertyFilter): PropertyFilter => {
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
};

const multiFilter = (
  filter: ApiPropertyFilter | ApiFilterAndOr,
): filter is ApiFilterAndOr => "combine" in filter;

const mapAggregations = (
  aggregations: ApiAggregationResult[][],
): AggregationResult[][] =>
  aggregations.map((aggregationGroup) =>
    aggregationGroup.map((result) => ({
      collection: result.collection,
      searchQuery: result.search_query,
      groupbyProperty: result.groupby_property,
      aggregations: result.aggregations.map(mapPropertyAggregation),
      filters: result.filters.map(mapPropertyFilter),
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

const display = (response: AskModeResponseProperties | ResponseProperties) => {
  console.log(JSON.stringify(response, undefined, 2));
};

type AskModeResponseProperties = Omit<AskModeResponse, "display">;
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

const mapWeaviateObject = (
  object: ApiWeaviateObject,
): WeaviateObjectWithCollection => {
  const metadata: ReturnMetadata = {
    creationTime:
      object.metadata.creation_time !== null
        ? object.metadata.creation_time
        : undefined,
    updateTime:
      object.metadata.update_time !== null
        ? object.metadata.update_time
        : undefined,
    distance:
      object.metadata.distance !== null ? object.metadata.distance : undefined,
    certainty:
      object.metadata.certainty !== null
        ? object.metadata.certainty
        : undefined,
    score: object.metadata.score !== null ? object.metadata.score : undefined,
    explainScore:
      object.metadata.explain_score !== null
        ? object.metadata.explain_score
        : undefined,
    rerankScore:
      object.metadata.rerank_score !== null
        ? object.metadata.rerank_score
        : undefined,
    isConsistent:
      object.metadata.is_consistent !== null
        ? object.metadata.is_consistent
        : undefined,
  };

  return {
    properties: object.properties,
    metadata,
    references: undefined,
    uuid: object.uuid,
    vectors: object.vector,
    collection: object.collection,
  };
};

export const mapWeviateSearchResults = (
  response: ApiWeaviateReturn,
): WeaviateReturnWithCollection => ({
  objects: response.objects.map(mapWeaviateObject),
});

export const mapSearchOnlyResponse = (
  response: ApiSearchModeResponse,
): {
  mappedResponse: Omit<SearchModeResponse, "next">;
  apiSearches: ApiSearchResult[] | undefined;
} => {
  const apiSearches = response.searches;
  const mappedResponse: Omit<SearchModeResponse, "next"> = {
    originalQuery: response.original_query,
    searches: apiSearches ? mapInnerSearches(apiSearches) : undefined,
    usage: mapUsage(response.usage),
    totalTime: response.total_time,
    searchResults: mapWeviateSearchResults(response.search_results),
  };
  return { mappedResponse, apiSearches };
};
