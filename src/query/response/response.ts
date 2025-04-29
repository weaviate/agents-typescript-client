export interface QueryAgentResponse {
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
}

export interface SearchResult {
  collection: string;
  queries: string[];
  filters: PropertyFilter[];
  filterOperators: "AND" | "OR";
}

export type PropertyFilter =
  | IntegerPropertyFilter
  | TextPropertyFilter
  | BooleanPropertyFilter;

interface PropertyFilterBase {
  propertyName: string;
  operator: ComparisonOperator;
}

export interface IntegerPropertyFilter extends PropertyFilterBase {
  value: number;
}

export interface TextPropertyFilter extends PropertyFilterBase {
  value: string;
}

export interface BooleanPropertyFilter extends PropertyFilterBase {
  value: boolean;
}

export enum ComparisonOperator {
  Equals = "=",
  LessThan = "<",
  GreaterThan = ">",
  LessEqual = "<=",
  GreaterEqual = ">=",
  NotEquals = "!=",
  Like = "LIKE",
}

export interface AggregationResult {
  collection: string;
  searchQuery?: string;
  groupbyProperty?: string;
  aggregations: PropertyAggregation[];
  filters: PropertyFilter[];
}

export type PropertyAggregation =
  | IntegerPropertyAggregation
  | TextPropertyAggregation
  | BooleanPropertyAggregation;

interface PropertyAggregationBase {
  propertyName: string;
}

export interface IntegerPropertyAggregation extends PropertyAggregationBase {
  metrics: NumericMetrics;
}

export interface TextPropertyAggregation extends PropertyAggregationBase {
  metrics: TextMetrics;
  topOccurrencesLimit?: number;
}

export interface BooleanPropertyAggregation extends PropertyAggregationBase {
  metrics: BooleanMetrics;
}

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

export interface Usage {
  requests: number;
  requestTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
  details?: Record<string, number>;
}

export interface Source {
  objectId: string;
  collection: string;
}
