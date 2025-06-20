import {
  NumericMetrics,
  TextMetrics,
  BooleanMetrics,
  ComparisonOperator,
} from "./response.js";

export type ApiQueryAgentResponse = {
  original_query: string;
  collection_names: string[];
  searches: ApiSearchResult[][];
  aggregations: ApiAggregationResult[][];
  usage: ApiUsage;
  total_time: number;
  aggregation_answer?: string;
  has_aggregation_answer: boolean;
  has_search_answer: boolean;
  is_partial_answer: boolean;
  missing_information: string[];
  final_answer: string;
  sources: ApiSource[];
};

export type ApiSearchResult = {
  collection: string;
  queries: (string | null)[];
  filters: ApiPropertyFilter[][];
  filter_operators: "AND" | "OR";
};

export type ApiPropertyFilter =
  | ApiIntegerPropertyFilter
  | ApiTextPropertyFilter
  | ApiBooleanPropertyFilter;

type ApiPropertyFilterBase = {
  property_name: string;
  operator: ComparisonOperator;
};

export type ApiIntegerPropertyFilter = ApiPropertyFilterBase & {
  value: number;
};

export type ApiTextPropertyFilter = ApiPropertyFilterBase & {
  value: string;
};

export type ApiBooleanPropertyFilter = ApiPropertyFilterBase & {
  value: boolean;
};

export type ApiAggregationResult = {
  collection: string;
  search_query?: string;
  groupby_property?: string;
  aggregations: ApiPropertyAggregation[];
  filters: ApiPropertyFilter[];
};

export type ApiPropertyAggregation =
  | ApiIntegerPropertyAggregation
  | ApiTextPropertyAggregation
  | ApiBooleanPropertyAggregation;

type ApiPropertyAggregationBase = {
  property_name: string;
};

export type ApiIntegerPropertyAggregation = ApiPropertyAggregationBase & {
  metrics: NumericMetrics;
};

export type ApiTextPropertyAggregation = ApiPropertyAggregationBase & {
  metrics: TextMetrics;
  top_occurrences_limit?: number;
};

export type ApiBooleanPropertyAggregation = ApiPropertyAggregationBase & {
  metrics: BooleanMetrics;
};

export type ApiUsage = {
  requests: number;
  request_tokens?: number;
  response_tokens?: number;
  total_tokens?: number;
  details?: Record<string, number>;
};

export type ApiSource = {
  object_id: string;
  collection: string;
};
