import { FilterValue, Operator } from "weaviate-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapFilter = (filters: FilterValue): any =>
  filters.filters
    ? {
        combine: mapFilterCombineOperator(filters.operator),
        filters: filters.filters.map(mapFilter),
      }
    : {
        ...filters,
        target: filters.target?.property ?? filters.target,
      };

const mapFilterCombineOperator = (operator: Operator) => {
  switch (operator) {
    case "And":
      return "and";
    case "Or":
      return "or";
    default:
      return operator;
  }
};
