import test from "node:test";
import assert from "node:assert/strict";
import {handleMementoRequest,readMementoSource} from "../../functions/_lib/memento-bridge.mjs";

const A="a".repeat(40),B="b".repeat(40),C="c".repeat(40),D="d".repeat(40),E="e".repeat(40);
const BASE="https://api.github.com/repos/the-static-collective/MEMENTO";
const ISSUER="https://fictional-team.cloudflareaccess.com";
const env=()=>({
  CF_ACCESS_ISSUER:ISSUER,CF_ACCESS_AUD:"fictional-audience",
  MEMENTO_ALLOWED_EMAILS:"inspector@example.test",MEMENTO_GITHUB_TOKEN:"FICTIONAL_TEST_TOKEN"
});
const registry={
  schema:"memento.historical-imaginations-registry/v0",
  worlds:[
    {id:"fictional-a",title:"First Fictional World",status:"specimen",source_cut:"specimen:one",
      world_ref:"historical-imaginations/instances/fictional-a/WORLD.md"},
    {id:"fictional-b",title:"Second Fictional World",status:"specimen",source_cut:"specimen:two",
      world_ref:"historical-imaginations/instances/fictional-b/WORLD.md"}
  ]
};
const proposed={
  schema:"memento.historical-imagination-edge/v0",id:"link-one",from:"fictional-a",to:"fictional-b",
  relation:"may-cross",status:"proposed"
};
const refused={...proposed,id:"refused-one",relation:"not-crossing",status:"refused"};
const bytes=obj=>Buffer.from(JSON.stringify(obj),"utf-8");
const blob=obj=>({encoding:"base64",size:bytes(obj).length,content:bytes(obj).toString("base64")});
const gh=(path,body)=>new Response(JSON.stringify(body),{headers:{"Content-Type":"application/json"}});
function mockGitHub({edge=proposed,includeRefused=true,malformedTree=false}={}){
  const fixture={
    [C]:blob(registry),[D]:blob(edge),[E]:blob(refused)
  };
  const tree=[
    {path:"historical-imaginations/registry.json",type:"blob",sha:C,size:bytes(registry).length},
    {path:"historical-imaginations/edges/0001.json",type:"blob",sha:D,size:bytes(edge).length}
  ];
  if(includeRefused)tree.push({path:"historical-imaginations/edges/0002.json",type:"blob",sha:E,size:bytes(refused).length});
  const seen=[];
  const mock=async (url,options={})=>{
    seen.push({url,method:options.method||"GET",authorization:options.headers?.Authorization});
    if(!url.startsWith(BASE))throw Error("unexpected external source");
    if(options.headers?.Authorization!=="Bearer FICTIONAL_TEST_TOKEN")throw Error("missing token");
    if(url===BASE+"/commits/main")return gh(url,{sha:A});
    if(url===BASE+"/git/commits/"+A)return gh(url,{tree:{sha:B}});
    if(url===BASE+"/git/trees/"+B+"?recursive=1")return gh(url,{truncated:malformedTree,tree});
    const blobSha=url.slice((BASE+"/git/blobs/").length);
    if(url.startsWith(BASE+"/git/blobs/")&&fixture[blobSha])return gh(url,fixture[blobSha]);
    throw Error("Unexpected GitHub path: "+url);
  };
  return {mock,seen};
}
function unsignedRequest(url="/api/memento?mode=worlds",token){
  return new Request("https://willowlab.example.test"+url,{headers:token?{"Cf-Access-Jwt-Assertion":token}:{}});
}
let signingKey,publicJwk;
async function prepareKey(){
  if(signingKey)return;
  const kp=await crypto.subtle.generateKey({
    name:"RSASSA-PKCS1-v1_5",modulusLength:2048,
    publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
  signingKey=kp.privateKey;
  publicJwk={...await crypto.subtle.exportKey("jwk",kp.publicKey),kid:"specimen-key",alg:"RS256",use:"sig"};
}
async function token({email="inspector@example.test",aud="fictional-audience",
  iss=ISSUER,exp=Math.floor(Date.now()/1000)+300}={}){
  await prepareKey();
  const b64=data=>Buffer.from(typeof data==="string"?data:JSON.stringify(data)).toString("base64url");
  const h=b64({alg:"RS256",kid:"specimen-key",typ:"JWT"});
  const p=b64({aud,iss,email,exp,iat:Math.floor(Date.now()/1000)-5,sub:"fictional-subject"});
  const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",signingKey,new TextEncoder().encode(h+"."+p));
  return h+"."+p+"."+Buffer.from(sig).toString("base64url");
}
function mixedFetch(github){
  return async(url,opts={})=>{
    if(url===ISSUER+"/cdn-cgi/access/certs"){
      await prepareKey();return gh(url,{keys:[publicJwk]});
    }
    return github(url,opts);
  };
}
async function request(url,options={}){
  const github=mockGitHub(options);
  const response=await handleMementoRequest(unsignedRequest(url,options.token??await token(options.claims)),options.env||env(),mixedFetch(github.mock));
  return {response,body:await response.json(),seen:github.seen};
}
test("fails closed when deployment has no secrets, identity or GitHub access",async()=>{
  const response=await handleMementoRequest(unsignedRequest(),{},async()=>{throw Error("should not call");});
  assert.equal(response.status,503);assert.equal((await response.json()).error,"NOT_CONFIGURED");
});
test("rejects unsigned requests without contacting private GitHub",async()=>{
  const github=mockGitHub();
  const response=await handleMementoRequest(unsignedRequest(),env(),mixedFetch(github.mock));
  assert.equal(response.status,401);assert.equal(github.seen.length,0);
});
test("valid signature but wrong email is forbidden before any GitHub request",async()=>{
  const {response,seen}=await request("/api/memento?mode=worlds",{claims:{email:"outsider@example.test"}});
  assert.equal(response.status,403);assert.equal(seen.length,0);
});
test("rejects invalid audience, expiry and wrong signature",async()=>{
  const wrongAud=await request("/api/memento?mode=worlds",{claims:{aud:"another-app"}});
  assert.equal(wrongAud.response.status,401);assert.equal(wrongAud.seen.length,0);
  const expired=await request("/api/memento?mode=worlds",{claims:{exp:Math.floor(Date.now()/1000)-3}});
  assert.equal(expired.response.status,401);
  const valid=await token();
  const parts=valid.split(".");
  parts[2]=parts[2].slice(0,-3)+"AAA";
  const tampered=await request("/api/memento?mode=worlds",{token:parts.join(".")});
  assert.equal(tampered.response.status,401);assert.equal(tampered.seen.length,0);
});
test("world list is only metadata, source SHA and bounded coverage",async()=>{
  const {response,body,seen}=await request("/api/memento?mode=worlds");
  assert.equal(response.status,200);
  assert.equal(response.headers.get("Cache-Control"),"private, no-store, max-age=0");
  assert.equal(body.schema,"static.memento-source-index/0.1");
  assert.equal(body.provenance.commit_sha,A);assert.equal(body.provenance.repository,"the-static-collective/MEMENTO");
  assert.equal(body.admission,"none");
  assert.equal(body.worlds.length,2);
  assert.ok(!JSON.stringify(body).includes("FICTIONAL_TEST_TOKEN"));
  assert.ok(!JSON.stringify(body).includes("world_ref"));
  assert.ok(seen.every(row=>row.method==="GET"));
});
test("pinned traversal excludes refused edges, matches MEMENTO scope and preserves provenance",async()=>{
  const {response,body,seen}=await request("/api/memento?mode=context&world=fictional-a&depth=1&sha="+A);
  assert.equal(response.status,200);
  assert.equal(body.schema,"memento.context-pack/v0");
  assert.equal(body.origin_world,"fictional-a");
  assert.deepEqual(body.worlds.map(w=>w.id),["fictional-a","fictional-b"]);
  assert.deepEqual(body.edges.map(e=>e.id),["link-one"]);
  assert.equal(body.edges[0].admission,"none");
  assert.equal(body.edges[0].status,"proposed");
  assert.equal(body.provenance.commit_sha,A);
  assert.ok(!seen.some(row=>row.url.endsWith("/commits/main")),"Pinned fetch must not silently read newer HEAD");
});
test("depth zero never imports neighbors",async()=>{
  const {response,body}=await request("/api/memento?mode=context&world=fictional-a&depth=0&sha="+A);
  assert.equal(response.status,200);assert.deepEqual(body.worlds.map(w=>w.id),["fictional-a"]);
  assert.equal(body.edges.length,0);
});
test("source-admitted relation is still retrieved with admission none",async()=>{
  const {response,body}=await request("/api/memento?mode=context&world=fictional-a&sha="+A,
    {edge:{...proposed,status:"admitted"}});
  assert.equal(response.status,200);assert.equal(body.edges[0].status,"admitted");
  assert.equal(body.edges[0].admission,"none");assert.equal(body.admission,"none");
});
test("unpinned context fetch, malformed params and missing world fail closed",async()=>{
  const unpinned=await request("/api/memento?mode=context&world=fictional-a");
  assert.equal(unpinned.response.status,400);
  const malformed=await request("/api/memento?mode=context&world=fictional-a&sha=main");
  assert.equal(malformed.response.status,400);
  const missing=await request("/api/memento?mode=context&world=missing&sha="+A);
  assert.equal(missing.response.status,404);
  const path=await request("/api/memento?mode=context&world=../../secrets&sha="+A);
  assert.equal(path.response.status,400);
  const unknown=await request("/api/memento?mode=worlds&path=ledger");
  assert.equal(unknown.response.status,400);
});
test("rejects truncated tree and never returns partial source",async()=>{
  const {response,body}=await request("/api/memento?mode=context&world=fictional-a&sha="+A,{malformedTree:true});
  assert.equal(response.status,502);assert.equal(body.error,"SOURCE_TOO_LARGE");
  assert.ok(!JSON.stringify(body).includes("FICTIONAL_TEST_TOKEN"));
});
test("no endpoint permits writes",async()=>{
  const request=new Request("https://willowlab.example.test/api/memento",{method:"POST"});
  const response=await handleMementoRequest(request,env(),async()=>{throw Error("should not reach network");});
  assert.equal(response.status,405);
});
test("the source traversal method never directly writes to an external provider",async()=>{
  const github=mockGitHub();
  const index=await readMementoSource({mode:"worlds"},env(),github.mock);
  assert.equal(index.provenance.commit_sha,A);
  assert.ok(github.seen.every(r=>r.method==="GET"));
  assert.ok(github.seen.every(r=>r.url.startsWith(BASE)));
});
