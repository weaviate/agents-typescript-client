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
  | TextPropertyFilter
  | BooleanPropertyFilter;

type PropertyFilterBase = {
  propertyName: string;
  operator: ComparisonOperator;
};

/** Filter numeric properties using comparison operators */
export type IntegerPropertyFilter = PropertyFilterBase & {
  value: number;
};

/** Filter text properties using equality or LIKE operators */
export type TextPropertyFilter = PropertyFilterBase & {
  value: string;
};

/** Filter boolean properties using equality operators */
export type BooleanPropertyFilter = PropertyFilterBase & {
  value: boolean;
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
  | BooleanPropertyAggregation;

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
