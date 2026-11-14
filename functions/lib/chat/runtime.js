// Small runtime helpers: abortable timeouts and safe error names for logs.

function namedError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

// Runs operation(signal) with a deadline. `outerSignal` ends it early when the
// caller no longer wants the result (the visitor stopped a streamed answer).
export function withTimeout(operation, timeoutMs, outerSignal) {
  const controller = new AbortController();
  let timeoutId;
  let onOuterAbort;
  const stopped = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(namedError("TimeoutError", "ModelTimeout"));
    }, timeoutMs);
    if (!outerSignal) return;
    onOuterAbort = () => {
      controller.abort();
      reject(namedError("AbortError", "RequestAborted"));
    };
    if (outerSignal.aborted) onOuterAbort();
    else outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  });

  const operationPromise = Promise.resolve().then(() => operation(controller.signal));
  return Promise.race([operationPromise, stopped]).finally(() => {
    clearTimeout(timeoutId);
    if (onOuterAbort) outerSignal.removeEventListener("abort", onOuterAbort);
  });
}

export function safeErrorName(error) {
  if (error instanceof Error && /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)) {
    return error.name;
  }
  return "UnknownError";
}
