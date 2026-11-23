import { handleFileportRequest } from "../../_lib/fileport.js";
export function onRequestPost({ request, env }) {
  return handleFileportRequest(request, env, "download");
}
