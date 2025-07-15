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
  ApiIntegerPropertyFilter,
  ApiIntegerArrayPropertyFilter,
  ApiTextPropertyFilter,
  ApiTextArrayPropertyFilter,
  ApiBooleanPropertyFilter,
  ApiBooleanArrayPropertyFilter,
  ApiDatePropertyFilter,
  ApiDateArrayPropertyFilter,
  ApiGeoPropertyFilter,
  ApiIsNullPropertyFilter,
  ApiUnknownPropertyFilter,
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



const mapDatePropertyFilter = (filterValue: ApiDateFilterValue): DateFilterValue | undefined => {
  if ("exact_timestamp" in filterValue) {
    return {
      exactTimestamp: filterValue.exact_timestamp,
      operator: filterValue.operator,
    };
  } else if (
    "date_from" in filterValue
    && "date_to" in filterValue
    && filterValue.date_from != null
    && filterValue.date_to != null
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
}

const mapPropertyFilters = (filters: ApiPropertyFilter[]): PropertyFilter[] =>
  filters.map((filter) => {
    switch (filter.filter_type) {
      case "integer": {
        const intFilter = filter as ApiIntegerPropertyFilter;
        return {
          filterType: "integer",
          propertyName: intFilter.property_name,
          operator: intFilter.operator,
          value: intFilter.value,
        };
      }
      case "integer_array": {
        const intArrayFilter = filter as ApiIntegerArrayPropertyFilter;
        return {
          filterType: "integerArray",
          propertyName: intArrayFilter.property_name,
          operator: intArrayFilter.operator,
          value: intArrayFilter.value,
        };
      }
      case "text": {
        const textFilter = filter as ApiTextPropertyFilter;
        return {
          filterType: "text",
          propertyName: textFilter.property_name,
          operator: textFilter.operator,
          value: textFilter.value,
        };
      }
      case "text_array": {
        const textArrayFilter = filter as ApiTextArrayPropertyFilter;
        return {
          filterType: "textArray",
          propertyName: textArrayFilter.property_name,
          operator: textArrayFilter.operator,
          value: textArrayFilter.value,
        };
      }
      case "boolean": {
        const boolFilter = filter as ApiBooleanPropertyFilter;
        return {
          filterType: "boolean",
          propertyName: boolFilter.property_name,
          operator: boolFilter.operator,
          value: boolFilter.value,
        };
      }
      case "boolean_array": {
        const boolArrayFilter = filter as ApiBooleanArrayPropertyFilter;
        return {
          filterType: "booleanArray",
          propertyName: boolArrayFilter.property_name,
          operator: boolArrayFilter.operator,
          value: boolArrayFilter.value,
        };
      }
      case "date_range": {
        const dateFilter = filter as ApiDatePropertyFilter;
        const value = mapDatePropertyFilter(dateFilter.value);
        if (!value) {
          return {
            filterType: "unknown",
            propertyName: dateFilter.property_name,
            value: dateFilter.value,
          };
        }
        return {
          filterType: "dateRange",
          propertyName: dateFilter.property_name,
          value: value,
        };
      }
      case "date_array": {
        const dateArrayFilter = filter as ApiDateArrayPropertyFilter;
        return {
          filterType: "dateArray",
          propertyName: dateArrayFilter.property_name,
          operator: dateArrayFilter.operator,
          value: dateArrayFilter.value,
        };
      }
      case "geo": {
        const geoFilter = filter as ApiGeoPropertyFilter;
        return {
          filterType: "geo",
          propertyName: geoFilter.property_name,
          latitude: geoFilter.latitude,
          longitude: geoFilter.longitude,
          maxDistanceMeters: geoFilter.max_distance_meters,
        };
      }
      case "is_null": {
        const nullFilter = filter as ApiIsNullPropertyFilter;
        return {
          filterType: "isNull",
          propertyName: nullFilter.property_name,
          isNull: nullFilter.is_null,
        };
      }
      default: {
        const unknownFilter = filter as ApiUnknownPropertyFilter;
        return {
          filterType: "unknown",
          propertyName: unknownFilter.property_name,
          value: unknownFilter.value,
        };
      }
    }
  });

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
