import { FilterValue } from "weaviate-client";
import { mapFilter } from "./filter.js";

export const mapCollections = (
  collections: (string | QueryAgentCollectionConfig)[],
) =>
  collections.map((collection) =>
    typeof collection === "string"
      ? collection
      : {
          name: collection.name,
          tenant: collection.tenant,
          view_properties: collection.viewProperties,
          target_vector: collection.targetVector,
          additional_filters: collection.additionalFilters
            ? mapFilter(collection.additionalFilters)
            : undefined,
        },
  );

export type QueryAgentCollection = string | QueryAgentCollectionConfig;

/** Configuration for a collection to query. */
export type QueryAgentCollectionConfig = {
  /** The name of the collection to query. */
  name: string;
  /** Tenant for the collection if multi-tenancy is enabled. */
  tenant?: string;
  /** List of of property names the agent has the ability to view for the collection. */
  viewProperties?: string[];
  /** Target vector for the query if a collection uses named vector. */
  targetVector?: string | string[];
  /** Filters to apply when query is executed, in addition to filters selected by the Query Agent. */
  additionalFilters?: FilterValue;
};
