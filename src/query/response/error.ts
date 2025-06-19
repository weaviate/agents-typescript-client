export const handleError = async (responseText: string) => {
  const json = getJson(responseText);

  if (json?.error) {
    const error = json.error as ErrorResponse;
    throw new QueryAgentError(error.message, error.code, error.details);
  }

  throw new Error(`Query agent failed. ${responseText}`);
};

const getJson = (responseText: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
};

export class QueryAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

type ErrorResponse = {
  message: string;
  code: string;
  details?: Record<string, unknown>;
};
