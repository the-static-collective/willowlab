// Cloudflare Pages: GET /api/memento; requires fail-closed Access validation.
// No Cloudflare Access deployment or GitHub secret is created by this file.
import {handleMementoRequest} from "../_lib/memento-bridge.mjs";
export async function onRequest({request,env}){
  return handleMementoRequest(request,env);
}
