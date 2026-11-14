// Tests for GET /api/elpris (functions/lib/elpris/) with a fake upstream, a
// fake Cache API and a fake clock. Nothing here calls Energinet.
import assert from "node:assert/strict";
import test from "node:test";
import { createElprisHandler, onRequest } from "../functions/api/elpris.js";
import { shapePoints, UPSTREAM_URL } from "../functions/lib/elpris/upstream.js";

const T0 = Date.UTC(2026, 10, 13, 23) / 1000; // 00:00 Danish time, 14 November 2026
const iso = (epoch) => new Date(epoch * 1000).toISOString().slice(0, 19);
const row = (index, area, price) => ({ TimeUTC: iso(T0 + index * 900), PriceArea: area, DayAheadPriceDKK: price });
const day = (count = 96) =>
  Array.from({ length: count }, (_, index) => [row(index, "DK1", 500 + index), row(index, "DK2", 700 + index)]).flat();
const ok = (records) => new Response(JSON.stringify({ total: records.length, records }));

// Like caches.default: keyed by URL, and an entry is gone when its max-age has passed.
function fakeCache(clock) {
  const store = new Map();
  return {
    store,
    async match(request) {
      const hit = store.get(request.url);
      return hit && hit.expires > clock() ? new Response(hit.body) : undefined;
    },
    async put(request, response) {
      const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("cache-control"))[1]);
      store.set(request.url, { body: await response.text(), expires: clock() + maxAge * 1000 });
    },
  };
}

// Lets everything that is waiting run, as a short wait does in the Worker.
const tick = () => new Promise((resolve) => setImmediate(resolve));

/** `reply(callNumber)` is what the fake upstream answers. */
function setup(reply = () => ok(day()), { cache: withCache = true } = {}) {
  let time = (T0 + 9 * 3600) * 1000; // 09:00 Danish time
  const clock = () => time;
  const cache = fakeCache(clock);
  const calls = [];
  const logs = [];
  const handler = createElprisHandler({
    fetch: async (url, init) => {
      calls.push({ url, init });
      return reply(calls.length, init);
    },
    openCache: () => (withCache ? cache : undefined),
    now: clock,
    logger: { error: (...entry) => logs.push(entry) },
    timeoutMs: 40,
    sleep: tick,
  });
  const waiting = [];
  async function call(path = "/api/elpris", { method = "GET", cf } = {}) {
    const request = { url: `https://smartbolig.net${path}`, method, cf };
    const response = await handler({ request, waitUntil: (promise) => waiting.push(promise) });
    await Promise.all(waiting.splice(0));
    return response;
  }
  return { call, calls, logs, cache, advance: (seconds) => (time += seconds * 1000) };
}

test("a named area gives that area's prices in the agreed shape", async () => {
  const { call, calls } = setup();
  const response = await call("/api/elpris?area=DK2");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "public, max-age=600");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["area", "areaGuessed", "source", "license", "fetched", "stepMinutes", "points"]);
  assert.deepEqual(
    { ...body, points: body.points.length },
    { area: "DK2", areaGuessed: false, source: "Energinet (www.energidataservice.dk)", license: "CC BY 4.0", fetched: iso(T0 + 9 * 3600) + ".000Z", stepMinutes: 15, points: 96 },
  );
  assert.deepEqual([body.points[0], body.points.at(-1)], [[T0, 700], [T0 + 95 * 900, 795]]);
  // One call to Energinet's own address, with a deadline, for both areas.
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].url);
  assert.equal(calls[0].url, UPSTREAM_URL);
  assert.equal(`${url.origin}${url.pathname}`, "https://api.energidataservice.dk/dataset/DayAheadPrices");
  assert.deepEqual(JSON.parse(url.searchParams.get("filter")), { PriceArea: ["DK1", "DK2"] });
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test("without a named area it is guessed from where Cloudflare places the visitor", async () => {
  const { call } = setup();
  for (const [cf, area] of [
    [{ country: "DK", regionCode: "84" }, "DK2"],
    [{ country: "DK", regionCode: "85" }, "DK2"],
    [{ country: "DK", regionCode: "81" }, "DK1"],
    [{ country: "DK", regionCode: "82" }, "DK1"],
    [{ country: "DK", regionCode: "83" }, "DK1"],
    [{ country: "DK" }, "DK1"],
    [{ country: "SE", regionCode: "84" }, "DK1"],
    [undefined, "DK1"],
    // A region code that is not one of the five (the two eastern regions are
    // to be merged in 2027): the map decides. Cloudflare gives the numbers as text.
    [{ country: "DK", regionCode: "86", longitude: "12.56830", latitude: "55.67590" }, "DK2"], // København
    [{ country: "DK", regionCode: "86", longitude: "14.70", latitude: "55.10" }, "DK2"], // Rønne
    [{ country: "DK", regionCode: "86", longitude: "11.14", latitude: "55.33" }, "DK2"], // Korsør
    [{ country: "DK", regionCode: "86", longitude: "10.79", latitude: "55.31" }, "DK1"], // Nyborg
    [{ country: "DK", longitude: "11.52", latitude: "56.71" }, "DK1"], // Anholt
    [{ country: "DK", regionCode: "86", longitude: "x" }, "DK1"],
    // A known western region wins over the map.
    [{ country: "DK", regionCode: "82", longitude: "11.52", latitude: "55.0" }, "DK1"],
    [{ country: "SE", longitude: "12.99", latitude: "55.60" }, "DK1"],
  ]) {
    const response = await call("/api/elpris", { cf });
    const body = await response.json();
    assert.deepEqual([body.area, body.areaGuessed], [area, true], JSON.stringify(cf));
    // The answer depends on the visitor, so no shared cache may keep it.
    assert.equal(response.headers.get("cache-control"), "private, max-age=600");
  }
});

test("a wrong area is refused, and so is every method but GET and HEAD", async () => {
  const { call, calls } = setup();
  for (const query of ["?area=dk1", "?area=DK3", "?area=", "?area=DK1&area=DK2", "?area=DK1%20"]) {
    const response = await call(`/api/elpris${query}`);
    assert.equal(response.status, 400, query);
    assert.deepEqual(await response.json(), { error: "invalid_area" });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
    const response = await call("/api/elpris?area=DK1", { method });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
    assert.deepEqual(await response.json(), { error: "method_not_allowed" });
  }
  assert.equal(calls.length, 0);
  const head = await call("/api/elpris?area=DK1", { method: "HEAD" });
  assert.deepEqual([head.status, await head.text()], [200, ""]);
  // A HEAD request never gets a body, also when the answer is an error.
  const wrong = await call("/api/elpris?area=DK3", { method: "HEAD" });
  assert.deepEqual([wrong.status, await wrong.text()], [400, ""]);
});

test("one upstream call serves both areas for ten minutes, whatever else is in the query", async () => {
  const { call, calls, cache, advance } = setup();
  for (const path of ["/api/elpris?area=DK1", "/api/elpris?area=DK1&utm_source=x&nocache=123", "/api/elpris?area=DK2", "/api/elpris?x=1"]) {
    assert.equal((await call(path)).status, 200);
    advance(60);
  }
  assert.equal(calls.length, 1);
  assert.deepEqual([...cache.store.keys()], ["https://smartbolig.net/api/elpris/cache/DK1", "https://smartbolig.net/api/elpris/cache/DK2"]);
  advance(400);
  assert.equal((await call("/api/elpris?area=DK1")).status, 200);
  assert.equal(calls.length, 2);
});

test("when the source fails, the copy is served, and the source gets a minute of peace", async () => {
  const { call, calls, logs, advance } = setup((number) => (number === 1 ? ok(day()) : new Response("secret upstream text", { status: 500 })));
  const first = await (await call("/api/elpris?area=DK1")).json();
  advance(700);
  const response = await call("/api/elpris?area=DK1");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60");
  // The old copy says that it is old.
  assert.deepEqual(await response.json(), { ...first, stale: true });
  // The log has the name of the fault only: not the visitor's area.
  assert.deepEqual(logs, [["SmartBolig elpris upstream failed", { error: "UpstreamStatus500" }]]);
  await call("/api/elpris?area=DK2");
  assert.equal(calls.length, 2);
  advance(61);
  await call("/api/elpris?area=DK1");
  assert.equal(calls.length, 3);
});

test("without a usable copy the answer is a plain 502 that says nothing about the fault", async () => {
  const failing = setup(() => {
    throw new Error("getaddrinfo ENOTFOUND secret-host");
  });
  const response = await failing.call("/api/elpris?area=DK1");
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), '{"error":"upstream"}');
  assert.deepEqual(failing.logs[0][1], { error: "Error" });
  assert.deepEqual([(await failing.call("/api/elpris?area=DK1", { method: "HEAD" })).status, failing.calls.length], [502, 1]);

  // A copy whose prices have all passed is not shown as if it were today's.
  const old = setup((number) => (number === 1 ? ok(day()) : new Response("", { status: 503 })));
  await old.call("/api/elpris?area=DK1");
  old.advance(40 * 3600);
  assert.equal((await old.call("/api/elpris?area=DK1")).status, 502);

  const slow = setup((number, { signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason))));
  assert.equal((await slow.call("/api/elpris?area=DK1")).status, 502);
  assert.equal(slow.logs[0][1].error, "TimeoutError");

  assert.equal((await setup(() => new Response("<html>not json</html>")).call()).status, 502);

  // An answer far longer than two days of prices is not read as prices.
  const huge = setup(() => new Response(JSON.stringify({ records: day(), padding: "x".repeat(600_000) })));
  assert.equal((await huge.call("/api/elpris?area=DK1")).status, 502);
  assert.equal(huge.logs[0][1].error, "UpstreamTooLarge");
});

test("rows that are not right are dropped, and an area with too few rows fails", async () => {
  const good = Array.from({ length: 30 }, (_, index) => row(index, "DK1", 512.34567 + index));
  const bad = [
    null,
    { TimeUTC: "14-11-2026 00:00", PriceArea: "DK1", DayAheadPriceDKK: 1 },
    { TimeUTC: iso(T0 + 40 * 900 + 420), PriceArea: "DK1", DayAheadPriceDKK: 1 },
    { ...row(41, "DK1", 1), DayAheadPriceDKK: "512" },
    { ...row(42, "DK1", 1), DayAheadPriceDKK: null },
    row(43, "DK1", 1e9),
    row(5, "DK1", 1),
    row(44, "SE3", 1),
    { PriceArea: "DK1", DayAheadPriceDKK: 1 },
  ];
  assert.deepEqual(shapePoints([...good, ...bad], "DK1").length, 30);
  assert.deepEqual(shapePoints([...good, ...bad], "DK1")[0], [T0, 512.35]);
  assert.deepEqual(shapePoints({ not: "a list" }, "DK1"), []);

  const { call, logs } = setup(() => ok([...good, ...bad, ...Array.from({ length: 10 }, (_, index) => row(index, "DK2", 700))]));
  assert.equal((await (await call("/api/elpris?area=DK1")).json()).points.length, 30);
  assert.equal((await call("/api/elpris?area=DK2")).status, 502);
  assert.equal(logs.at(-1)[1].error, "UpstreamAreaMissing");
});

test("where there is no Cache API the isolate's own memory keeps the copy and the minute of peace", async () => {
  const { call, calls, advance } = setup(undefined, { cache: false });
  assert.equal((await call("/api/elpris?area=DK1")).status, 200);
  assert.equal((await call("/api/elpris?area=DK2")).status, 200);
  assert.equal(calls.length, 1);
  advance(601);
  assert.equal((await call("/api/elpris?area=DK1")).status, 200);
  assert.equal(calls.length, 2);
  assert.equal(typeof onRequest, "function");

  const failing = setup(() => new Response("", { status: 429 }), { cache: false });
  for (let index = 0; index < 5; index += 1) assert.equal((await failing.call("/api/elpris?area=DK1")).status, 502);
  assert.equal(failing.calls.length, 1, "one call, then a minute of peace");
  failing.advance(61);
  await failing.call("/api/elpris?area=DK1");
  assert.equal(failing.calls.length, 2);
});

// An upstream that answers only when the test says so, to hold requests in the air.
function held() {
  const releases = [];
  const reply = () => new Promise((resolve) => releases.push(() => resolve(ok(day()))));
  return { reply, release: () => releases.splice(0).forEach((release) => release()) };
}

test("requests that arrive together cost one call to Energinet", async () => {
  // With an old copy: the first request asks, the others show the old copy at once.
  const upstream = held();
  let hold = false;
  const warm = setup((number) => (hold ? upstream.reply() : ok(day())));
  await warm.call("/api/elpris?area=DK1");
  warm.advance(700);
  hold = true;
  const together = Array.from({ length: 20 }, (_, index) => warm.call(`/api/elpris?area=${index % 2 ? "DK2" : "DK1"}`));
  await tick();
  upstream.release();
  const answers = await Promise.all(together);
  assert.deepEqual([...new Set(answers.map((response) => response.status))], [200]);
  assert.equal(warm.calls.length, 2, "one call for the first copy and one for all twenty");
  assert.equal(warm.logs.length, 0);
  assert.equal(answers.filter((response) => response.headers.get("cache-control") === "public, max-age=60").length, 19, "nineteen got the old copy");

  // With nothing to show: the others wait a moment for the first one's answer.
  const cold = held();
  const empty = setup(cold.reply);
  const waiting = Array.from({ length: 10 }, () => empty.call("/api/elpris?area=DK2"));
  await tick();
  cold.release();
  const got = await Promise.all(waiting);
  assert.deepEqual(got.map((response) => response.status), Array(10).fill(200));
  assert.equal(empty.calls.length, 1);
  assert.equal((await got[9].json()).area, "DK2");
});

test("a request does not wait for ever for a call that never ends", async () => {
  const stuck = setup(() => new Promise(() => {}));
  // The first request never gets an answer in this test; it is left hanging on purpose.
  stuck.call("/api/elpris?area=DK1").catch(() => {});
  await tick();
  const second = await stuck.call("/api/elpris?area=DK1");
  assert.equal(second.status, 502);
  assert.equal(stuck.calls.length, 1);
});
