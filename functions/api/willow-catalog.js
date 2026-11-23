// Cloudflare Pages function: no browser-facing token, no mutation, no automatic sync.
import {handlePublicCatalog} from "../../catalog-bridge/core.mjs";
export function onRequest({request, env}) {
  return handlePublicCatalog(request, env);
}
