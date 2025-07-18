export type ServerSentEvent = {
  event: string;
  data: string;
};


/**
 * Fetch Server-Sent Events (SSE) from a URL.
 * 
 * All fields other than "event" and "data" are ignored
 *
 * @param input - The URL to fetch the SSE from.
 * @param init - The request init options.
 * @returns An async generator of ServerSentEvent objects.
 */
export async function* fetchServerSentEvents(
  input: string | URL | globalThis.Request,
  init?: RequestInit
): AsyncGenerator<ServerSentEvent> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...init?.headers,
      "Accept": "text/event-stream",
    }
  });

  if (!response.ok || !response.body) {
    throw Error(`Query agent streaming failed. ${await response.text()}`);
  }

  const reader = response.body.getReader();
  const textDecoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    // Use a buffer to accumulate text until we have a complete SSE (delimited by blank lines)
    buffer += textDecoder.decode(value, { stream: true });

    const { events, remainingBuffer } = parseServerSentEvents(buffer);
    for (const event of events) {
      yield event;
    }
    buffer = remainingBuffer;
  }

  // Flush the remaining buffer
  const { events } = parseServerSentEvents(buffer, true);
  for (const event of events) {
    yield event;
  }
}

function parseServerSentEvents(buffer: string, flush?: boolean): { events: ServerSentEvent[]; remainingBuffer: string } {
  // Server sent events are delimited by blank lines,
  // and may be spread across multiple chunks from the API
  const sseChunks = buffer.split(/\r?\n\r?\n/);
  let remainingBuffer = "";

  if (flush !== true) {
    // Put the (possibly incomplete) final event back into the buffer
    remainingBuffer = sseChunks.pop() ?? "";
  }

  const events: ServerSentEvent[] = [];

  for (const chunk of sseChunks) {
    const lines = chunk.split(/\r?\n/);
    let event = "message";
    let data = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        // Replace event name if we get one
        event = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        if (data) {
          // Data was spread across multiple lines
          data += "\n";
        }
        data += line.slice("data:".length).trim();
      }
    }
    if (data) {
      events.push({ event, data });
    }
  }

  return { events, remainingBuffer };
}
