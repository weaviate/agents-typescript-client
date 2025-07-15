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
  | ApiBooleanPropertyFilter
  | ApiDatePropertyFilter
  | ApiGeoPropertyFilter
  | ApiIsNullPropertyFilter
  | ApiUnknownPropertyFilter;

type ApiPropertyFilterBase = {
  filter_type: string;
  property_name: string;
};

export type ApiIntegerPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "integer";
  operator: ComparisonOperator;
  value: number;
};

export type ApiTextPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "text";
  operator: ComparisonOperator;
  value: string;
};

export type ApiBooleanPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "boolean";
  operator: ComparisonOperator;
  value: boolean;
};

export type ApiDateExact = {
  exact_timestamp: string;
  operator: ComparisonOperator;
};

export type ApiDateRangeFrom = {
  date_from: string;
  inclusive_from: boolean;
};

export type ApiDateRangeTo = {
  date_to: string;
  inclusive_to: boolean;  
};

export type ApiDateRangeBetween = {
  date_from: string;
  date_to: string;
  inclusive_from: boolean;
  inclusive_to: boolean;
};

export type ApiDateFilterValue =
  ApiDateExact
  | ApiDateRangeFrom
  | ApiDateRangeTo
  | ApiDateRangeBetween;

export type ApiDatePropertyFilter = ApiPropertyFilterBase & {
  filter_type: "date_range";
  value: ApiDateFilterValue;
};

export type ApiGeoPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "geo";
  latitude: number;
  longitude: number;
  max_distance_meters: number;
};

export type ApiIsNullPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "is_null";
  is_null: boolean;
};

type KnownFilterTypes =
  "integer"
  | "text"
  | "boolean"
  | "date_range"
  | "geo"
  | "is_null";

export type ApiUnknownPropertyFilter = ApiPropertyFilterBase & {
  filter_type: Exclude<string, KnownFilterTypes>;
  value?: any;
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
