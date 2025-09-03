import { Vectors, WeaviateField } from "weaviate-client";

import {
  NumericMetrics,
  TextMetrics,
  BooleanMetrics,
  DateMetrics,
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
  | ApiIntegerArrayPropertyFilter
  | ApiTextPropertyFilter
  | ApiTextArrayPropertyFilter
  | ApiBooleanPropertyFilter
  | ApiBooleanArrayPropertyFilter
  | ApiDatePropertyFilter
  | ApiDateArrayPropertyFilter
  | ApiGeoPropertyFilter
  | ApiIsNullPropertyFilter;

type ApiPropertyFilterBase = {
  filter_type: string;
  property_name: string;
};

export type ApiIntegerPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "integer";
  operator: ComparisonOperator;
  value: number;
};

export type ApiIntegerArrayPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "integer_array";
  operator: ComparisonOperator;
  value: number[];
};

export type ApiTextPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "text";
  operator: ComparisonOperator;
  value: string;
};

export type ApiTextArrayPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "text_array";
  operator: ComparisonOperator;
  value: string[];
};

export type ApiBooleanPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "boolean";
  operator: ComparisonOperator;
  value: boolean;
};

export type ApiBooleanArrayPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "boolean_array";
  operator: ComparisonOperator;
  value: boolean[];
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
  | ApiDateExact
  | ApiDateRangeFrom
  | ApiDateRangeTo
  | ApiDateRangeBetween;

export type ApiDatePropertyFilter = ApiPropertyFilterBase & {
  filter_type: "date_range";
  value: ApiDateFilterValue;
};

export type ApiDateArrayPropertyFilter = ApiPropertyFilterBase & {
  filter_type: "date_array";
  operator: ComparisonOperator;
  value: string[];
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
  | ApiBooleanPropertyAggregation
  | ApiDatePropertyAggregation;

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

export type ApiDatePropertyAggregation = ApiPropertyAggregationBase & {
  metrics: DateMetrics;
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

export type ApiReturnMetadata = {
  creation_time: Date | null;
  update_time: Date | null;
  distance: number | null;
  certainty: number | null;
  score: number | null;
  explain_score: string | null;
  rerank_score: number | null;
  is_consistent: boolean | null;
};

export type ApiWeaviateObject = {
  /** The returned properties of the object as untyped key-value pairs from the API. */
  properties: Record<string, WeaviateField>;
  /** The returned metadata of the object. */
  metadata: ApiReturnMetadata;
  /** The returned references of the object. */
  references: null;
  /** The UUID of the object. */
  uuid: string;
  /** The returned vectors of the object. */
  vector: Vectors;
  collection: string; // NOTE: NEW
};

export type ApiWeaviateReturn = {
  /** The objects that were found by the query. */
  objects: ApiWeaviateObject[];
};

export type ApiSearchModeResponse = {
  original_query: string;
  searches?: ApiSearchResult[];
  usage: ApiUsage;
  total_time: number;
  search_results: ApiWeaviateReturn;
};
