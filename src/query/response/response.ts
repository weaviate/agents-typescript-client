import { WeaviateReturn, WeaviateObject } from "weaviate-client";

export type QueryAgentResponse = {
  outputType: "finalState";
  originalQuery: string;
  collectionNames: string[];
  searches: SearchResult[][];
  aggregations: AggregationResult[][];
  usage: Usage;
  totalTime: number;
  isPartialAnswer: boolean;
  missingInformation: string[];
  finalAnswer: string;
  sources: Source[];
  display(): void;
};

export type SearchResult = {
  collection: string;
  queries: (string | null)[];
  filters: PropertyFilter[][];
  filterOperators: "AND" | "OR";
};

export type PropertyFilter =
  | IntegerPropertyFilter
  | IntegerArrayPropertyFilter
  | TextPropertyFilter
  | TextArrayPropertyFilter
  | BooleanPropertyFilter
  | BooleanArrayPropertyFilter
  | DatePropertyFilter
  | DateArrayPropertyFilter
  | GeoPropertyFilter
  | IsNullPropertyFilter
  | UnknownPropertyFilter;

type PropertyFilterBase = {
  filterType: string;
  propertyName: string;
};

/** Filter numeric properties using comparison operators */
export type IntegerPropertyFilter = PropertyFilterBase & {
  filterType: "integer";
  operator: ComparisonOperator;
  value: number;
};

/** Filter numeric array properties using comparison operators */
export type IntegerArrayPropertyFilter = PropertyFilterBase & {
  filterType: "integerArray";
  operator: ComparisonOperator;
  value: number[];
};

/** Filter text properties using equality or LIKE operators */
export type TextPropertyFilter = PropertyFilterBase & {
  filterType: "text";
  operator: ComparisonOperator;
  value: string;
};

/** Filter text array properties using equality or LIKE operators */
export type TextArrayPropertyFilter = PropertyFilterBase & {
  filterType: "textArray";
  operator: ComparisonOperator;
  value: string[];
};

/** Filter boolean properties using equality operators */
export type BooleanPropertyFilter = PropertyFilterBase & {
  filterType: "boolean";
  operator: ComparisonOperator;
  value: boolean;
};

/** Filter boolean array properties using equality operators */
export type BooleanArrayPropertyFilter = PropertyFilterBase & {
  filterType: "booleanArray";
  operator: ComparisonOperator;
  value: boolean[];
};

/** Filter date properties using equality / range operators */
export type DateExact = {
  exactTimestamp: string;
  operator: ComparisonOperator;
};

export type DateRangeFrom = {
  dateFrom: string;
  inclusiveFrom: boolean;
};

export type DateRangeTo = {
  dateTo: string;
  inclusiveTo: boolean;
};

export type DateRangeBetween = {
  dateFrom: string;
  dateTo: string;
  inclusiveFrom: boolean;
  inclusiveTo: boolean;
};

export type DateFilterValue =
  | DateExact
  | DateRangeFrom
  | DateRangeTo
  | DateRangeBetween;

export type DatePropertyFilter = PropertyFilterBase & {
  filterType: "dateRange";
  value: DateFilterValue;
};

export type DateArrayPropertyFilter = PropertyFilterBase & {
  filterType: "dateArray";
  operator: ComparisonOperator;
  value: string[];
};

/** Filter geo-coordinates properties. */
export type GeoPropertyFilter = PropertyFilterBase & {
  filterType: "geo";
  latitude: number;
  longitude: number;
  maxDistanceMeters: number;
};

/** Filter properties by their null state. */
export type IsNullPropertyFilter = PropertyFilterBase & {
  filterType: "isNull";
  isNull: boolean;
};

export type UnknownPropertyFilter = PropertyFilterBase & {
  filterType: "unknown";
};

export enum ComparisonOperator {
  Equals = "=",
  LessThan = "<",
  GreaterThan = ">",
  LessEqual = "<=",
  GreaterEqual = ">=",
  NotEquals = "!=",
  Like = "LIKE",
}

/**
 * The aggregations performed on a collection in a vector database.
 *
 * They should be based on the original user query and can include multiple
 * aggregations across different properties and metrics.
 */
export type AggregationResult = {
  collection: string;
  searchQuery?: string;
  groupbyProperty?: string;
  aggregations: PropertyAggregation[];
  filters: PropertyFilter[];
};

export type PropertyAggregation =
  | IntegerPropertyAggregation
  | TextPropertyAggregation
  | BooleanPropertyAggregation
  | DatePropertyAggregation;

type PropertyAggregationBase = {
  propertyName: string;
};

/** Aggregate numeric properties using statistical functions */
export type IntegerPropertyAggregation = PropertyAggregationBase & {
  metrics: NumericMetrics;
};

/** Aggregate text properties using frequency analysis */
export type TextPropertyAggregation = PropertyAggregationBase & {
  metrics: TextMetrics;
  topOccurrencesLimit?: number;
};

/** Aggregate boolean properties using statistical functions */
export type BooleanPropertyAggregation = PropertyAggregationBase & {
  metrics: BooleanMetrics;
};

/** Aggregate date properties using statistical functions */
export type DatePropertyAggregation = PropertyAggregationBase & {
  metrics: DateMetrics;
};

export enum NumericMetrics {
  Count = "COUNT",
  Maximum = "MAXIMUM",
  Mean = "MEAN",
  Median = "MEDIAN",
  Minimum = "MINIMUM",
  Mode = "MODE",
  Sum = "SUM",
  Type = "TYPE",
}

export enum TextMetrics {
  Count = "COUNT",
  Type = "TYPE",
  TopOccurrences = "TOP_OCCURRENCES",
}

export enum BooleanMetrics {
  Count = "COUNT",
  Type = "TYPE",
  TotalTrue = "TOTAL_TRUE",
  TotalFalse = "TOTAL_FALSE",
  PercentageTrue = "PERCENTAGE_TRUE",
  PercentageFalse = "PERCENTAGE_FALSE",
}

export enum DateMetrics {
  Count = "COUNT",
  Maximum = "MAXIMUM",
  Median = "MEDIAN",
  Minimum = "MINIMUM",
  Mode = "MODE",
}

export type Usage = {
  requests: number;
  requestTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  details?: Record<string, number>;
};

export type Source = {
  objectId: string;
  collection: string;
};

export type QueryWithCollection = {
  query: string;
  collection: string;
};

export type ProgressDetails = {
  queries?: QueryWithCollection[];
};

export type ProgressMessage = {
  outputType: "progressMessage";
  stage: string;
  message: string;
  details: ProgressDetails;
};

export type StreamedTokens = {
  outputType: "streamedTokens";
  delta: string;
};

export type WeaviateObjectWithCollection = WeaviateObject<undefined> & {
  collection: string;
};

export type WeaviateReturnWithCollection = WeaviateReturn<undefined> & {
  objects: WeaviateObjectWithCollection[];
};

/** Options for the executing a prepared QueryAgent search. */
export type SearchExecutionOptions = {
  /** The maximum number of results to return. */
  limit?: number;
  /** The offset of the results to return, for paginating through query result sets. */
  offset: number;
};

export type SearchModeResponse = {
  originalQuery: string;
  searches?: SearchResult[];
  usage: Usage;
  totalTime: number;
  searchResults: WeaviateReturnWithCollection;
  next: (options: SearchExecutionOptions) => Promise<SearchModeResponse>;
};
