// Delivers a turn as Server-Sent Events:
//
//   status   { stage }            "searching" | "writing" | "revising"
//   sources  { sources }          once, as soon as the search has run, before any text
//   delta    { text }             the answer while it is written
//   done     { answer, ... }      the checked answer: the same body as the JSON response
//   error    { code, error }      the same localized body as a failed JSON response
//
// "revising" means the text sent so far was rejected by a check and is replaced
// by what follows. Only `done` is an answer; a stream that ends without it failed.

import { responseBodyFor } from "./responses.js";
import { eventStreamResponse } from "./sse.js";

export function streamTurn(turn, requestId) {
  return eventStreamResponse(requestId, async (send, signal) => {
    let stage = "";
    let sourcesSent = false;
    const sendSources = () => {
      if (sourcesSent) return;
      sourcesSent = true;
      send("sources", { sources: turn.sources() });
    };
    const live = {
      signal,
      stage(name) {
        if (name === stage) return;
        // Writing starts when the search is over, so its sources are known now.
        if (name === "writing") sendSources();
        stage = name;
        send("status", { stage });
      },
      text(chunk) {
        if (typeof chunk !== "string" || !chunk) return;
        live.stage("writing");
        send("delta", { text: chunk });
      },
    };

    try {
      const body = await turn.run(live);
      sendSources();
      send("done", body);
    } catch (error) {
      // Nobody is listening after a stop, and a stop is not a failure.
      if (signal.aborted) return;
      turn.reportFailure(error);
      send("error", responseBodyFor("assistant_unavailable"));
    }
  });
}
