// Opt-in, read-only bridge to WillowConnect's explicitly public DEVELOPMENT service projection.
// No customer data, credentials, writes, or production booking authority.
export const WILLOW_SOURCE = "https://willow-connect-preview.stealthfox13.chatgpt.site/api/pricebook/state";
const HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive"
});
function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {status, headers: HEADERS});
}
const validText = (v, max = 180) => typeof v === "string" && v.length > 0 && v.length <= max && !/[\x00-\x1f]/.test(v);
export function projectPublicCatalog(payload) {
  if (!payload || payload.ok !== true || payload.schema !== "wms-pricebook-public/1" ||
      !Number.isSafeInteger(payload.revision) || payload.revision < 0 ||
      !Array.isArray(payload.records) || payload.records.length > 200 ||
      payload.permissions?.can_edit !== false) throw Error("INVALID_PUBLIC_PROJECTION");
  const records = payload.records.map(record => {
    if (!record || typeof record !== "object" ||
        !validText(record.id, 100) || !/^[A-Za-z0-9_-]+$/.test(record.id) ||
        !validText(record.name) || !validText(record.category, 100) ||
        !validText(record.method, 100) || !validText(record.unit, 100) ||
        record.enabled !== true || record.lifecycle !== "Active now" ||
        record.kind !== "service") throw Error("INVALID_PUBLIC_PROJECTION");
    // Deliberate allowlist. In particular, never forward prices, owner fields, notes or new schema properties.
    return {id: record.id, name: record.name, category: record.category, method: record.method, unit: record.unit};
  });
  if (new Set(records.map(r => r.id)).size !== records.length) throw Error("DUPLICATE_SERVICE");
  return {schema: "willowlab.catalog-read/1", revision: payload.revision,
    source: "WillowConnect public development service projection",
    authoritative_for: "development-preview-only", records};
}
export async function handlePublicCatalog(request, env, fetcher = fetch) {
  if (request.method !== "GET") return reply({ok:false, error:"METHOD_NOT_ALLOWED"},405);
  // Explicit enable after Colton's review; absent configuration means no upstream contact.
  if (env?.WILLOW_CATALOG_READ_ENABLED !== "true")
    return reply({ok:false, error:"DISABLED", message:"Colton's public preview connection has not been approved for this site."},503);
  try {
    const upstream = await fetcher(WILLOW_SOURCE, {
      method:"GET", redirect:"manual",
      headers:{Accept:"application/json"}, signal:AbortSignal.timeout(8000)
    });
    if (upstream.status !== 200 || !upstream.headers.get("content-type")?.includes("application/json"))
      return reply({ok:false,error:"SOURCE_UNAVAILABLE"},502);
    const raw = await upstream.text();
    if (raw.length > 128000) return reply({ok:false,error:"SOURCE_UNAVAILABLE"},502);
    const projected = projectPublicCatalog(JSON.parse(raw));
    return reply({ok:true,...projected, observed_at:new Date().toISOString()});
  } catch {
    return reply({ok:false,error:"SOURCE_UNAVAILABLE"},502);
  }
}
