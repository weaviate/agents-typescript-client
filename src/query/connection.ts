import { WeaviateClient } from "weaviate-client";

export const getHeaders = async (client: WeaviateClient) => {
  const {
    host,
    bearerToken,
    headers: connectionHeaders,
  } = await client.getConnectionDetails();

  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: bearerToken!,
    "X-Weaviate-Cluster-Url": host,
    "X-Agent-Request-Origin": "typescript-client",
  };

  return { requestHeaders, connectionHeaders };
};
