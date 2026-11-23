
import { neon } from "@neondatabase/serverless";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store, private",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: SECURITY_HEADERS });
}

export function validToken(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

export function validFileId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function tokenDigest(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, "0")).join("");
}

function storageObject(env, objectKey) {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !/^[a-z0-9][a-z0-9.-]{1,253}$/.test(env.S3_BUCKET)) {
    throw new Error("Storage configuration unavailable");
  }
  if (typeof objectKey !== "string" || !/^willowlab\\/[A-Za-z0-9._/-]+$/.test(objectKey) ||
      objectKey.split("/").some(segment => !segment || segment === "." || segment === "..")) {
    throw new Error("Unsafe object key");
  }
  const endpoint = new URL(env.S3_ENDPOINT);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password ||
      endpoint.pathname !== "/" || endpoint.search || endpoint.hash) {
    throw new Error("Unsafe storage endpoint");
  }
  return { endpoint: endpoint.origin, bucket: env.S3_BUCKET, key: objectKey };
}

// Neon's documented S3-compatible presigner, using path-style URLs.
// Access remains gated by the Fileport share/file checks above this call.
export async function signDownloadURL(env, objectKey) {
  const { endpoint, bucket, key } = storageObject(env, objectKey);
  if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("Storage credentials unavailable");
  }
  const client = new S3Client({
    region: env.S3_REGION || "us-east-1",
    endpoint,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY
    }
  });
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 120 });
}

export async function handleFileportRequest(request, env, action) {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(request.headers.get("content-type") || "").startsWith("application/json")) {
    return json({ error: "JSON required" }, 415);
  }
  if (!env.DATABASE_URL) return json({ error: "Fileport not configured" }, 503);

  let payload;
  try {
    const body = await request.text();
    if (body.length > 2048) return json({ error: "Payload too large" }, 413);
    payload = JSON.parse(body);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  if (!validToken(payload?.token)) return json({ error: "Link not found or expired" }, 404);
  if (action === "download" && !validFileId(payload.fileId)) {
    return json({ error: "File not found" }, 404);
  }

  try {
    const digest = await tokenDigest(payload.token);
    const sql = neon(env.DATABASE_URL);
    const shares = await sql`SELECT id, label, expires_at
      FROM public.fileport_shares WHERE token_hash = ${digest}
        AND revoked_at IS NULL AND expires_at > now() LIMIT 1`;
    if (!shares.length) return json({ error: "Link not found or expired" }, 404);
    const share = shares[0];

    if (action === "share") {
      const files = await sql`SELECT f.id, f.display_name, f.mime_type, f.size_bytes
        FROM public.fileport_files f
        JOIN public.fileport_share_files sf ON sf.file_id = f.id
        WHERE sf.share_id = ${share.id} AND f.state = 'approved'
        ORDER BY f.display_name ASC`;
      await sql`INSERT INTO public.fileport_receipts (share_id, action)
        VALUES (${share.id}, 'share_viewed')`;
      return json({
        label: share.label,
        expiresAt: share.expires_at,
        files: files.map(f => ({
          id: f.id, name: f.display_name, type: f.mime_type,
          size: f.size_bytes == null ? null : Number(f.size_bytes)
        }))
      });
    }

    if (action !== "download") return json({ error: "Unknown action" }, 404);
    if (!env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      return json({ error: "Downloads not configured" }, 503);
    }
    const files = await sql`SELECT f.id, f.object_key
      FROM public.fileport_files f
      JOIN public.fileport_share_files sf ON sf.file_id = f.id
      WHERE sf.share_id = ${share.id}
        AND f.id = ${payload.fileId}
        AND f.state = 'approved' LIMIT 1`;
    if (!files.length) return json({ error: "File not found" }, 404);
    const signed = await signDownloadURL(env, files[0].object_key);
    await sql`INSERT INTO public.fileport_receipts (share_id, file_id, action)
      VALUES (${share.id}, ${files[0].id}, 'download_issued')`;
    return json({ url: signed, expiresInSeconds: 120 });
  } catch {
    // Don't return database, credential, token or object key details to visitors.
    return json({ error: "Fileport temporarily unavailable" }, 503);
  }
}
