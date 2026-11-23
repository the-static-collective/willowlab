import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validToken, validFileId, signDownloadURL, handleFileportRequest } from "../../functions/_lib/fileport.js";

test("requires full-length opaque bearer tokens", () => {
  assert.equal(validToken("a".repeat(43)), true);
  for (const item of ["", "short", "a".repeat(42), "a".repeat(44), "a".repeat(42) + "?", null]) {
    assert.equal(validToken(item), false);
  }
});

test("accepts only UUID-shaped file selectors", () => {
  assert.equal(validFileId("f8e9034b-337a-4ccc-8b6d-102b1a661dbd"), true);
  assert.equal(validFileId("../secret"), false);
  assert.equal(validFileId("1 OR 1=1"), false);
});

test("fail closed on unconfigured, malformed or uninvited requests", async () => {
  const url = "https://example.invalid/api/fileport/share";
  const invalidMethod = await handleFileportRequest(new Request(url, { method: "GET" }), {}, "share");
  assert.equal(invalidMethod.status, 405);
  const unconfigured = await handleFileportRequest(new Request(url, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}"
  }), {}, "share");
  assert.equal(unconfigured.status, 503);
  const malformed = await handleFileportRequest(new Request(url, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{"
  }), { DATABASE_URL: "postgresql://no-connection-made" }, "share");
  assert.equal(malformed.status, 400);
  const invalidToken = await handleFileportRequest(new Request(url, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "short" })
  }), { DATABASE_URL: "postgresql://no-connection-made" }, "share");
  assert.equal(invalidToken.status, 404);
});

test("only approved files are enumerated and downloaded; revoke and expiry are checked", async () => {
  const src = await readFile(new URL("../../functions/_lib/fileport.js", import.meta.url), "utf8");
  assert.match(src, /revoked_at IS NULL AND expires_at > now\(\)/);
  assert.ok((src.match(/f\.state = 'approved'/g) || []).length >= 2);
  assert.match(src, /expiresIn:\s*120/);
  assert.doesNotMatch(src, /Access-Control-Allow-Origin/);
});

test("bucket and credentials are not in browser-facing source", async () => {
  const files = ["../app.js", "../index.html"];
  for (const file of files) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(content, /DATABASE_URL|S3_SECRET_ACCESS_KEY|S3_ACCESS_KEY_ID|willowlab-private/);
  }
  const schema = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  assert.match(schema, /DEFAULT 'staged'/);
});

test("Neon private-download URLs use path-style S3 V4 signing", async () => {
  // Synthetic credentials only: this validates signing, not the live storage service.
  const env = {
    S3_ENDPOINT: "https://storage.example.test",
    S3_BUCKET: "willowlab-private",
    S3_REGION: "us-east-1",
    S3_ACCESS_KEY_ID: "nak_live_test",
    S3_SECRET_ACCESS_KEY: "nsk_live_test"
  };
  const key = "willowlab/Willow_Window_Widescreen_Our_Filthy_Floors.mp4";
  const url = new URL(await signDownloadURL(env, key));
  assert.equal(url.origin, env.S3_ENDPOINT);
  assert.equal(url.pathname, "/willowlab-private/" + key);
  assert.equal(url.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "120");
  assert.ok(url.searchParams.get("X-Amz-Credential")?.startsWith(env.S3_ACCESS_KEY_ID + "/"));
  assert.ok(url.searchParams.get("X-Amz-Signature")?.length === 64);
  assert.doesNotMatch(url.href, /nsk_live_test/);
  await assert.rejects(() => signDownloadURL(env, "../outside.mp4"), /Unsafe object key/);
  await assert.rejects(() => signDownloadURL({ ...env, S3_ENDPOINT: "http://storage.example.test" }, key), /Unsafe storage endpoint/);
});
