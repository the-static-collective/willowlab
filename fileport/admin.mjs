#!/usr/bin/env node
// Private operator CLI. Never use from a browser or ship credentials to Cloudflare assets.
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import pg from "pg";
const { Client } = pg;
import { AwsClient } from "aws4fetch";

const [action, ...args] = process.argv.slice(2);
const required = ["DATABASE_URL"];
if (action === "upload") required.push("S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY");
for (const name of required) {
  if (!process.env[name]) throw new Error(name + " is required (private operator environment)");
}

function mime(filename) {
  const ext = filename.toLowerCase().split(".").pop();
  return ({
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
    pdf: "application/pdf", zip: "application/zip", txt: "text/plain",
    md: "text/markdown", mp4: "video/mp4", mp3: "audio/mpeg"
  })[ext] || "application/octet-stream";
}

function storageURL(key) {
  const endpoint = new URL(process.env.S3_ENDPOINT);
  if (endpoint.protocol !== "https:" || endpoint.pathname !== "/") throw new Error("Unsafe S3 endpoint");
  const bucket = process.env.S3_BUCKET;
  if (!/^[a-z0-9][a-z0-9.-]{1,253}$/.test(bucket)) throw new Error("Invalid bucket");
  return endpoint.origin + "/" + encodeURIComponent(bucket) + "/" +
    key.split("/").map(encodeURIComponent).join("/");
}

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  if (action === "upload") {
    const source = args[0];
    if (!source) throw new Error("Usage: upload <local-file> [display-name]");
    const metadata = await stat(source);
    if (!metadata.isFile() || metadata.size > 200 * 1024 * 1024) {
      throw new Error("Pilot accepts ordinary files up to 200 MiB");
    }
    const bytes = await readFile(source);
    const name = (args[1] || basename(source)).trim();
    if (!name || name.length > 255) throw new Error("Invalid display name");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const key = "willowlab/" + randomUUID() + "-" +
      basename(source).replace(/[^A-Za-z0-9._-]/g, "-").slice(-75);
    const client = new AwsClient({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      service: "s3",
      region: process.env.S3_REGION || "us-east-1"
    });
    const result = await client.fetch(storageURL(key), {
      method: "PUT", headers: { "Content-Type": mime(source) },
      body: bytes, aws: { allHeaders: true }
    });
    if (!result.ok) throw new Error("Storage upload failed (" + result.status + ")");
    const record = await db.query(
      "INSERT INTO public.fileport_files (object_key,display_name,mime_type,size_bytes,sha256) VALUES ($1,$2,$3,$4,$5) RETURNING id,state",
      [key, name, mime(source), bytes.length, sha256]
    );
    console.log(JSON.stringify({ fileId: record.rows[0].id, state: "staged", sha256, bytes: bytes.length }, null, 2));
  } else if (action === "list") {
    const result = await db.query(
      "SELECT id,display_name,size_bytes,state,created_at FROM public.fileport_files ORDER BY created_at DESC LIMIT 100"
    );
    console.table(result.rows);
  } else if (action === "approve" || action === "disable") {
    if (!args[0]) throw new Error("Provide a file id");
    const state = action === "approve" ? "approved" : "disabled";
    const result = await db.query(
      "UPDATE public.fileport_files SET state = $1, approved_at = CASE WHEN $1 = 'approved' THEN now() ELSE approved_at END WHERE id = $2 RETURNING id,state",
      [state, args[0]]
    );
    if (!result.rowCount) throw new Error("File not found");
    console.log(result.rows[0]);
  } else if (action === "share") {
    const [label, hoursText, ...ids] = args;
    const hours = Number(hoursText);
    if (!label || ids.length === 0 || !Number.isInteger(hours) || hours < 1 || hours > 720) {
      throw new Error("Usage: share <package-label> <hours:1-720> <approved-file-id...>");
    }
    const uniqueIds = [...new Set(ids)];
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    await db.query("BEGIN");
    try {
      const files = await db.query("SELECT id FROM public.fileport_files WHERE id = ANY($1::uuid[]) AND state = 'approved'", [uniqueIds]);
      if (files.rowCount !== uniqueIds.length) throw new Error("Every shared file must already be approved");
      const share = await db.query(
        "INSERT INTO public.fileport_shares (token_hash,label,expires_at) VALUES ($1,$2,now() + ($3::integer * interval '1 hour')) RETURNING id,expires_at",
        [hash, label, hours]
      );
      for (const id of uniqueIds) {
        await db.query("INSERT INTO public.fileport_share_files (share_id,file_id) VALUES ($1,$2)", [share.rows[0].id, id]);
      }
      await db.query("COMMIT");
      console.log("Share id (for revocation): " + share.rows[0].id);
      console.log("Expires at: " + share.rows[0].expires_at.toISOString());
      // The raw token is printed once; only its hash is stored. Do not log this output.
      if (process.env.FILEPORT_SHARE_BASE) {
        console.log("PRIVATE LINK (treat as a password): " +
          process.env.FILEPORT_SHARE_BASE.replace(/#.*$/, "").replace(/\/$/, "") +
          "/#share=" + token);
      } else {
        console.log("ONE-TIME TOKEN (attach to the /fileport/#share= URL): " + token);
      }
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  } else if (action === "revoke") {
    if (!args[0]) throw new Error("Usage: revoke <share-id>");
    const result = await db.query(
      "UPDATE public.fileport_shares SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL RETURNING id",
      [args[0]]
    );
    if (!result.rowCount) throw new Error("Active share not found");
    console.log("Revoked " + result.rows[0].id + "; existing 120-second signed URLs may remain valid briefly.");
  } else {
    throw new Error("Commands: upload, list, approve, disable, share, revoke");
  }
} finally {
  await db.end();
}
