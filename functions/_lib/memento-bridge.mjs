// Read-only MEMENTO GitHub bridge for Cloudflare Pages Functions.
// PRIVATE repository: never expose the token, raw tree, unscoped source files, or admission power.
// Fail-closed Cloudflare Access JWT verification + allowlisted identity + pinned GitHub commit.
// No writes of any kind. No cookies issued. No data persisted. No CORS grant.
const REPO="the-static-collective/MEMENTO";
const API="https://api.github.com/repos/"+REPO;
const REGISTRY="historical-imaginations/registry.json";
const EDGE_PREFIX="historical-imaginations/edges/";
const SHA=/^[a-f0-9]{40}$/i;
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISSUER=/^https:\/\/[a-z0-9.-]+\.cloudflareaccess\.com\/?$/;
export class BridgeError extends Error{
  constructor(status,code,message){super(message);this.status=status;this.code=code;}
}
const reject=(status,code,message)=>{throw new BridgeError(status,code,message);};
const ensure=(ok,code="SOURCE_INVALID")=>{if(!ok)reject(502,code,"Pinned MEMENTO source cannot be safely interpreted");};
function decode64url(str){
  if(typeof str!=="string"||!str||!/^[\w-]+$/.test(str))reject(401,"UNAUTHORIZED","Access token invalid");
  const normalized=str.replace(/-/g,"+").replace(/_/g,"/");
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,"=")),c=>c.charCodeAt(0));
}
function jwtPart(segment){
  try{return JSON.parse(new TextDecoder().decode(decode64url(segment)));}catch(_){reject(401,"UNAUTHORIZED","Access token invalid");}
}
function checkedConfig(env){
  const issuer=String(env.CF_ACCESS_ISSUER||"").replace(/\/$/,"");
  const aud=String(env.CF_ACCESS_AUD||"");
  const emails=String(env.MEMENTO_ALLOWED_EMAILS||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
  const gh=String(env.MEMENTO_GITHUB_TOKEN||"");
  if(!ISSUER.test(issuer)||!aud||!emails.length||!gh)
    reject(503,"NOT_CONFIGURED","Private read-only bridge is not configured");
  return {issuer,aud,emails,gh};
}
export async function verifyAccess(request,config,fetcher=fetch){
  const token=request.headers.get("Cf-Access-Jwt-Assertion");
  if(!token)reject(401,"ACCESS_REQUIRED","Cloudflare Access sign-in is required");
  const parts=token.split(".");
  if(parts.length!==3||token.length>12000)reject(401,"UNAUTHORIZED","Access token invalid");
  const header=jwtPart(parts[0]),claims=jwtPart(parts[1]);
  if(header.alg!=="RS256"||typeof header.kid!=="string")
    reject(401,"UNAUTHORIZED","Unsupported Access token");
  const seconds=Math.floor(Date.now()/1000);
  const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  if(claims.iss!==config.issuer||!audiences.includes(config.aud)||
    !Number.isInteger(claims.exp)||claims.exp<=seconds||
    (claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>seconds))||
    (claims.iat!==undefined&&(!Number.isInteger(claims.iat)||claims.iat>seconds+60)))
    reject(401,"UNAUTHORIZED","Access token claims invalid");
  const email=String(claims.email||"").trim().toLowerCase();
  if(!email||!config.emails.includes(email))reject(403,"NOT_ALLOWED","Not authorized for this MEMENTO aperture");
  // Key location is solely operator-configured, never taken from incoming token data.
  let response;
  try{response=await fetcher(config.issuer+"/cdn-cgi/access/certs",{headers:{Accept:"application/json"},cache:"no-store"});}
  catch(_){reject(503,"ACCESS_VERIFICATION_UNAVAILABLE","Access signature verification unavailable");}
  if(!response.ok)reject(503,"ACCESS_VERIFICATION_UNAVAILABLE","Access signature verification unavailable");
  let keys;
  try{keys=(await response.json()).keys;}catch(_){reject(503,"ACCESS_VERIFICATION_UNAVAILABLE","Access signing keys unavailable");}
  if(!Array.isArray(keys))reject(503,"ACCESS_VERIFICATION_UNAVAILABLE","Access signing keys unavailable");
  const key=keys.find(k=>k.kid===header.kid&&k.kty==="RSA"&&k.alg!=="HS256"&&k.n&&k.e);
  if(!key)reject(401,"UNAUTHORIZED","Access signing key not found");
  try{
    const publicKey=await crypto.subtle.importKey("jwk",key,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
    const ok=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",publicKey,decode64url(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
    if(!ok)reject(401,"UNAUTHORIZED","Access signature invalid");
  }catch(err){
    if(err instanceof BridgeError)throw err;
    reject(401,"UNAUTHORIZED","Access signature invalid");
  }
  return {email};
}
async function githubJson(path,config,fetcher){
  let response;
  try{response=await fetcher(API+path,{
    headers:{Authorization:"Bearer "+config.gh,Accept:"application/vnd.github+json",
      "X-GitHub-Api-Version":"2022-11-28","User-Agent":"Static-Workbench-Memento-ReadOnly"},
    cache:"no-store"
  });}catch(_){reject(502,"SOURCE_UNAVAILABLE","Private source could not be read");}
  if(!response.ok)reject(502,"SOURCE_UNAVAILABLE","Private source could not be read");
  let data;
  try{data=await response.json()}catch(_){reject(502,"SOURCE_INVALID","GitHub returned an unexpected response");}
  return data;
}
async function snapshot(commitSha,config,fetcher){
  ensure(SHA.test(commitSha));
  const commit=await githubJson("/git/commits/"+commitSha,config,fetcher);
  ensure(SHA.test(commit.tree?.sha));
  const data=await githubJson("/git/trees/"+commit.tree.sha+"?recursive=1",config,fetcher);
  ensure(data.truncated===false&&Array.isArray(data.tree)&&data.tree.length<=10000,"SOURCE_TOO_LARGE");
  const blobs=new Map();
  for(const file of data.tree){
    if(file.type==="blob"&&typeof file.path==="string"&&SHA.test(file.sha))
      blobs.set(file.path,{sha:file.sha,size:file.size});
  }
  return {commitSha,treeSha:commit.tree.sha,blobs};
}
async function blobJson(snapshot,path,config,fetcher){
  const entry=snapshot.blobs.get(path);
  ensure(entry&&Number.isInteger(entry.size)&&entry.size>=0&&entry.size<=131072,"SOURCE_TOO_LARGE");
  const raw=await githubJson("/git/blobs/"+entry.sha,config,fetcher);
  ensure(raw.encoding==="base64"&&typeof raw.content==="string"&&raw.size<=131072);
  let json;
  try{
    const bytes=Uint8Array.from(atob(raw.content.replace(/\s/g,"")),c=>c.charCodeAt(0));
    json=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  }catch(_){reject(502,"SOURCE_INVALID","Pinned source JSON is invalid");}
  return {data:json,sha:entry.sha};
}
function sourceWorlds(registry){
  ensure(registry?.schema==="memento.historical-imaginations-registry/v0"&&Array.isArray(registry.worlds));
  ensure(registry.worlds.length<=64,"SOURCE_TOO_LARGE");
  const seen=new Set();
  return registry.worlds.map(w=>{
    ensure(w&&ID.test(w.id||"")&&typeof w.title==="string"&&w.title.length<=200&&w.title.trim());
    ensure(typeof w.status==="string"&&w.status.length<=100&&typeof w.source_cut==="string"&&w.source_cut.length<=300);
    ensure(w.world_ref==="historical-imaginations/instances/"+w.id+"/WORLD.md");
    ensure(!seen.has(w.id));seen.add(w.id);
    return {id:w.id,title:w.title,status:w.status,source_cut:w.source_cut,admission:"none"};
  });
}
function sourceEdge(raw,known){
  ensure(raw?.schema==="memento.historical-imagination-edge/v0"&&ID.test(raw.id||"")&&known.has(raw.from)&&known.has(raw.to));
  ensure(typeof raw.relation==="string"&&raw.relation.length>0&&raw.relation.length<=160);
  ensure(["proposed","admitted","fog","refused"].includes(raw.status));
  return {id:raw.id,from:raw.from,to:raw.to,relation:raw.relation,status:raw.status,admission:"none"};
}
export async function readMementoSource({mode="worlds",world,depth=1,sha},config,fetcher=fetch){
  let commitSha=sha;
  if(mode==="worlds"){
    const head=await githubJson("/commits/main",config,fetcher);
    ensure(SHA.test(head?.sha));
    commitSha=head.sha;
  }else{
    if(!SHA.test(sha||""))reject(400,"PIN_REQUIRED","Choose a pinned SHA from a world-list response");
  }
  const snap=await snapshot(commitSha,config,fetcher);
  const {data:registry,sha:registrySha}=await blobJson(snap,REGISTRY,config,fetcher);
  const worlds=sourceWorlds(registry);
  const provenance={repository:REPO,commit_sha:snap.commitSha,registry_blob_sha:registrySha,
    observed_at:new Date().toISOString()};
  if(mode==="worlds")return {schema:"static.memento-source-index/0.1",
    admission:"none",coverage:"OBSERVED_BOUNDED",worlds:worlds.map(({id,title,status})=>({id,title,status})),provenance};
  if(!ID.test(world||""))reject(400,"INVALID_WORLD","A stable world ID is required");
  if(!Number.isInteger(depth)||depth<0||depth>3)reject(400,"INVALID_DEPTH","Depth must be 0–3");
  if(!worlds.some(w=>w.id===world))reject(404,"UNKNOWN_WORLD","That world is absent at the selected source commit");
  // Read only the fixed, whitelisted source directory of edge JSONs, never arbitrary paths.
  const edgePaths=[...snap.blobs.keys()].filter(p=>p.startsWith(EDGE_PREFIX)&&
    p.endsWith(".json")&&!p.slice(EDGE_PREFIX.length).includes("/")).sort();
  ensure(edgePaths.length<=128,"SOURCE_TOO_LARGE");
  const known=new Set(worlds.map(w=>w.id)),ids=new Set(),edges=[];
  for(const path of edgePaths){
    const {data}=await blobJson(snap,path,config,fetcher);
    const edge=sourceEdge(data,known);
    ensure(!ids.has(edge.id));ids.add(edge.id);
    edges.push(edge);
  }
  const visited=new Set([world]),used=new Map();let frontier=[world];
  for(let step=0;step<depth;step++){
    const next=new Set();
    for(const current of frontier.sort()){
      for(const e of edges){
        if(e.status==="refused")continue;
        const neighbor=e.from===current?e.to:e.to===current?e.from:null;
        if(neighbor===null)continue;
        used.set(e.id,e);
        if(!visited.has(neighbor)){visited.add(neighbor);next.add(neighbor);}
      }
    }
    frontier=[...next].sort();
    if(frontier.length===0)break;
  }
  return {schema:"memento.context-pack/v0",origin_world:world,depth,admission:"none",
    worlds:worlds.filter(w=>visited.has(w.id)).sort((a,b)=>a.id.localeCompare(b.id)),
    edges:[...used.values()].filter(e=>visited.has(e.from)&&visited.has(e.to))
      .sort((a,b)=>a.id.localeCompare(b.id)),
    provenance,notice:"Read-only reconstruction from a pinned Git commit. Retrieval is not MEMENTO admission. Original source status is preserved."};
}
function json(value,status=200){
  return new Response(JSON.stringify(value),{status,headers:{
    "Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store, max-age=0",
    "Pragma":"no-cache","X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer","X-Robots-Tag":"noindex, nofollow",
    "Content-Security-Policy":"default-src 'none'","Vary":"Cookie, Cf-Access-Jwt-Assertion"
  }});
}
export async function handleMementoRequest(request,env,fetcher=fetch){
  try{
    if(request.method!=="GET")reject(405,"METHOD_NOT_ALLOWED","Read-only GET requests only");
    const config=checkedConfig(env);
    await verifyAccess(request,config,fetcher);
    const url=new URL(request.url);
    const mode=url.searchParams.get("mode")||"worlds";
    if(!["worlds","context"].includes(mode))reject(400,"INVALID_MODE","Unsupported read operation");
    if([...url.searchParams.keys()].some(key=>!["mode","world","depth","sha"].includes(key)))
      reject(400,"INVALID_PARAMS","Unknown parameter");
    const depthText=url.searchParams.get("depth")||"1";
    const depth=/^[0-3]$/.test(depthText)?Number(depthText):-1;
    const data=await readMementoSource({
      mode,world:url.searchParams.get("world"),depth,sha:url.searchParams.get("sha")
    },config,fetcher);
    return json(data);
  }catch(err){
    if(err instanceof BridgeError)return json({error:err.code,message:err.message},err.status);
    return json({error:"UNAVAILABLE",message:"Private source retrieval failed closed"},503);
  }
}
