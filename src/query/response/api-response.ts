import {
  NumericMetrics,
  TextMetrics,
  BooleanMetrics,
  ComparisonOperator,
} from "./response.js";

export interface ApiQueryAgentResponse {
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
}

export interface ApiSearchResult {
  collection: string;
  queries: string[];
  filters: ApiPropertyFilter[];
  filter_operators: "AND" | "OR";
}

export type ApiPropertyFilter =
  | ApiIntegerPropertyFilter
  | ApiTextPropertyFilter
  | ApiBooleanPropertyFilter;

interface ApiPropertyFilterBase {
  property_name: string;
  operator: ComparisonOperator;
}

export interface ApiIntegerPropertyFilter extends ApiPropertyFilterBase {
  value: number;
}

export interface ApiTextPropertyFilter extends ApiPropertyFilterBase {
  value: string;
}

export interface ApiBooleanPropertyFilter extends ApiPropertyFilterBase {
  value: boolean;
}

export interface ApiAggregationResult {
  collection: string;
  search_query?: string;
  groupby_property?: string;
  aggregations: ApiPropertyAggregation[];
  filters: ApiPropertyFilter[];
}

export type ApiPropertyAggregation =
  | ApiIntegerPropertyAggregation
  | ApiTextPropertyAggregation
  | ApiBooleanPropertyAggregation;

interface ApiPropertyAggregationBase {
  property_name: string;
}

export interface ApiIntegerPropertyAggregation
  extends ApiPropertyAggregationBase {
  metrics: NumericMetrics;
}

export interface ApiTextPropertyAggregation extends ApiPropertyAggregationBase {
  metrics: TextMetrics;
  top_occurrences_limit?: number;
}

export interface ApiBooleanPropertyAggregation
  extends ApiPropertyAggregationBase {
  metrics: BooleanMetrics;
}

export interface ApiUsage {
  requests: number;
  request_tokens?: number;
  response_tokens?: number;
  total_tokens?: number;
  details?: Record<string, number>;
}

export interface ApiSource {
  object_id: string;
  collection: string;
}
