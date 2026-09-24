#!/usr/bin/env node
import { URL } from "node:url";
import { performance } from "node:perf_hooks";

const DEFAULT_REQUESTS = 300;
const DEFAULT_CONCURRENCY = 10;
const MAX_CONCURRENCY = 30;

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

function numberOption(name, fallback) {
  const value = Number(option(name, fallback));
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Invalid value for ${name}: ${value}`);
  }
  return value;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

async function request(url, parameterName, parameterValue) {
  const target = new URL(url);
  target.searchParams.set("api", "lookupRegistration");
  target.searchParams.set("eventId", "kshamawani-2026");
  target.searchParams.set(parameterName, parameterValue);

  const started = performance.now();
  try {
    const response = await globalThis.fetch(target);
    const elapsedMs = performance.now() - started;
    if (!response.ok) {
      return { ok: false, elapsedMs, error: `HTTP ${response.status}` };
    }

    const body = await response.json();
    return {
      ok: body.success === true,
      elapsedMs,
      error: body.success === true ? null : body.error || "API failure",
    };
  } catch (error) {
    return {
      ok: false,
      elapsedMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runPhase({ url, parameterName, parameterValue, requests, concurrency }) {
  const results = [];
  let next = 0;

  async function worker() {
    while (true) {
      const index = next++;
      if (index >= requests) return;
      results[index] = await request(url, parameterName, parameterValue);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, requests) },
      () => worker(),
    ),
  );

  return results;
}

function summarize(results) {
  const successful = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);
  const latencies = results.map((result) => result.elapsedMs);

  return {
    requests: results.length,
    successful: successful.length,
    failed: failed.length,
    errorRate: results.length
      ? Number(((failed.length / results.length) * 100).toFixed(2))
      : 0,
    p50Ms: Math.round(percentile(latencies, 50)),
    p95Ms: Math.round(percentile(latencies, 95)),
    p99Ms: Math.round(percentile(latencies, 99)),
    maxMs: Math.round(Math.max(...latencies)),
  };
}

const url = option("KSHAMAWANI_API_URL", process.env.KSHAMAWANI_API_URL);
const mobile = option("--mobile", process.env.KSHAMAWANI_TEST_MOBILE);
const code = option("--code", process.env.KSHAMAWANI_TEST_CODE);
const requests = numberOption("--requests", DEFAULT_REQUESTS);
const concurrency = numberOption("--concurrency", DEFAULT_CONCURRENCY);

if (!url) {
  throw new Error(
    "Set KSHAMAWANI_API_URL or pass the deployed Apps Script Web App URL via that environment variable.",
  );
}
if (!mobile && !code) {
  throw new Error(
    "Provide --mobile <known registered mobile> or --code <known application code>.",
  );
}
if (concurrency > MAX_CONCURRENCY) {
  throw new Error(
    `Concurrency cannot exceed ${MAX_CONCURRENCY}; increase it only after verifying Apps Script execution limits.`,
  );
}

const parameterName = mobile ? "mobile" : "code";
const parameterValue = mobile || code;

console.log(
  JSON.stringify(
    {
      event: "kshamawani.load_test",
      requests,
      concurrency,
      lookup: parameterName,
      note: "Read-only lookup test; no registrations or tokens are created.",
    },
    null,
    2,
  ),
);

const warmup = await request(url, parameterName, parameterValue);
console.log("Warm-up:", {
  ok: warmup.ok,
  latencyMs: Math.round(warmup.elapsedMs),
  error: warmup.error,
});

const results = await runPhase({
  url,
  parameterName,
  parameterValue,
  requests,
  concurrency,
});

const summary = summarize(results);
console.log("Load-test summary:");
console.table(summary);

if (summary.errorRate > 0) {
  const errors = results
    .filter((result) => !result.ok)
    .slice(0, 10)
    .map((result) => result.error);
  console.log("Sample errors:", errors);
  process.exitCode = 1;
}
