export type QueryAgentResponse = {
  originalQuery: string;
  collectionNames: string[];
  searches: SearchResult[][];
  aggregations: AggregationResult[][];
  usage: Usage;
  totalTime: number;
  aggregationAnswer?: string;
  hasAggregationAnswer: boolean;
  hasSearchAnswer: boolean;
  isPartialAnswer: boolean;
  missingInformation: string[];
  finalAnswer: string;
  sources: Source[];
  display(): void;
};

export type SearchResult = {
  collection: string;
  queries: string[];
  filters: PropertyFilter[];
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

export type IntegerPropertyFilter = PropertyFilterBase & {
  value: number;
};

export type TextPropertyFilter = PropertyFilterBase & {
  value: string;
};

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

export type IntegerPropertyAggregation = PropertyAggregationBase & {
  metrics: NumericMetrics;
};

export type TextPropertyAggregation = PropertyAggregationBase & {
  metrics: TextMetrics;
  topOccurrencesLimit?: number;
};

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
