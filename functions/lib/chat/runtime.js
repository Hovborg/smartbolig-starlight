// Small runtime helpers: abortable timeouts and safe error names for logs.

export function withTimeout(operation, timeoutMs) {
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      const error = new Error("ModelTimeout");
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
  });

  const operationPromise = Promise.resolve().then(() => operation(controller.signal));
  return Promise.race([operationPromise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function safeErrorName(error) {
  if (error instanceof Error && /^[A-Za-z][A-Za-z0-9]*$/.test(error.name)) {
    return error.name;
  }
  return "UnknownError";
}
