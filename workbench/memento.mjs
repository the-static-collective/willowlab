// STATIC WORKBENCH ↔ MEMENTO / read-only artifact aperture.
// Contract derived from MEMENTO's context-pack/v0 and return-ticket/v1.
// Parses local JSON only; does not fetch, transmit, persist, grant authority, or write to MEMENTO.
export const MAX_ARTIFACT_BYTES=262144;
const STATUSES=new Set(["OBSERVED","USER_REPORTED","INFERRED","PROPOSED","FIXTURE_TESTED","NATIVE_TESTED","FIELD_TESTED","HELD","DISPUTED"]);
const COVERAGE=new Set(["OBSERVED_BOUNDED","VERIFIED_COMPLETE","UNKNOWN"]);
const EDGE_STATUSES=new Set(["proposed","admitted","fog"]);
const IDS=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function fail(code,message){const e=new Error(message);e.code=code;throw e;}
function object(value,label){
  if(!value||typeof value!=="object"||Array.isArray(value))fail("INVALID",label+" must be an object");
  return value;
}
function nonempty(value,label,limit=1000){
  if(typeof value!=="string"||!value.trim()||value.length>limit)fail("INVALID",label+" must be a nonempty bounded string");
  return value;
}
function list(value,label,max=100){
  if(!Array.isArray(value)||value.length>max)fail("INVALID",label+" must be a bounded array");
  return value;
}
function unadmitted(value,label){
  if(value!=="none")fail("AUTHORITY_BOUNDARY",label+" must be 'none'; this adapter cannot admit anything");
}
function uniqueId(value,seen,label){
  nonempty(value,label,100);
  if(!IDS.test(value))fail("INVALID",label+" must be a stable lowercase ID");
  if(seen.has(value))fail("DUPLICATE",label+" duplicates "+value);
  seen.add(value);
}
function contextPack(data){
  nonempty(data.origin_world,"origin_world",100);
  if(!IDS.test(data.origin_world))fail("INVALID","origin_world is not a stable ID");
  if(!Number.isInteger(data.depth)||data.depth<0||data.depth>3)fail("INVALID","depth must be 0–3");
  const worlds=list(data.worlds,"worlds",64);
  const edges=list(data.edges,"edges",128);
  if(!worlds.length)fail("INVALID","context pack needs its origin world");
  const seen=new Set();
  const safeWorlds=worlds.map((world,index)=>{
    object(world,"worlds["+index+"]");uniqueId(world.id,seen,"world ID");
    unadmitted(world.admission,"world admission");
    return {id:world.id,title:nonempty(world.title,"world title",200),
      status:nonempty(world.status,"world status",100),
      source_cut:nonempty(world.source_cut,"source cut",300),
      admission:"none"};
  });
  if(!seen.has(data.origin_world))fail("INVALID","origin_world is missing from worlds");
  const edgeIds=new Set();
  const safeEdges=edges.map((edge,index)=>{
    object(edge,"edges["+index+"]");uniqueId(edge.id,edgeIds,"edge ID");
    unadmitted(edge.admission,"edge admission");
    if(!seen.has(edge.from)||!seen.has(edge.to))fail("INVALID","edge endpoints must exist in the pack");
    if(!EDGE_STATUSES.has(edge.status))fail("INVALID","edge status is unsupported for this retrieval projection");
    return {id:edge.id,from:edge.from,to:edge.to,
      relation:nonempty(edge.relation,"edge relation",160),
      source_status:edge.status,admission:"none"};
  });
  return {schema:"static.memento-aperture/0.1",kind:"context-pack",source_schema:data.schema,
    admission:"none",trusted:false,origin:data.origin_world,depth:data.depth,
    coverage:"SCOPED_RETRIEVAL",worlds:safeWorlds,edges:safeEdges,
    summary:safeWorlds.length+" scoped worlds · "+safeEdges.length+" relations",
    notice:"The retrieved worlds and edges are not admitted into this home. Edge source_status is not local approval."};
}
function returnTicket(data){
  nonempty(data.question,"question",3000);
  nonempty(data.observed_at,"observed_at",100);
  if(!Number.isFinite(Date.parse(data.observed_at)))fail("INVALID","observed_at must be a valid date");
  if(!COVERAGE.has(data.coverage))fail("INVALID","Unknown coverage");
  const sourceIds=new Set();
  const safeSources=list(data.sources,"sources",100).map((source,index)=>{
    object(source,"sources["+index+"]");
    const id=nonempty(source.id,"source id",160);
    if(sourceIds.has(id))fail("DUPLICATE","source id repeated");
    sourceIds.add(id);
    const status=nonempty(source.status,"source status",60);
    if(!new Set(["OBSERVED","USER_REPORTED","HELD","DISPUTED"]).has(status))
      fail("INVALID","Unsupported source status");
    return {id,source_type:nonempty(source.source_type,"source type",100),
      locator:nonempty(source.locator,"source locator",1500),status,
      visibility:source.visibility||"unknown"};
  });
  const safeClaims=list(data.claims,"claims",100).map((claim,index)=>{
    object(claim,"claims["+index+"]");
    if(!STATUSES.has(claim.status))fail("INVALID","Unsupported claim status");
    const ids=list(claim.source_ids,"claim source IDs",100).map(id=>nonempty(id,"claim source",160));
    for(const id of ids){if(!sourceIds.has(id))fail("INVALID","Claim references missing source ID "+id);}
    return {text:nonempty(claim.text,"claim text",3000),status:claim.status,source_ids:ids};
  });
  const unanswered=list(data.open_questions,"open_questions",100).map(q=>nonempty(q,"open question",1000));
  const probe=object(data.next_probe,"next_probe");
  const consent=nonempty(probe.consent,"next_probe.consent",100);
  if(!["read_only","requires_explicit_user_approval","owner_gate_required"].includes(consent))
    fail("INVALID","Unknown next probe consent gate");
  return {schema:"static.memento-aperture/0.1",kind:"return-ticket",source_schema:data.schema,
    admission:"none",trusted:false,question:data.question,observed_at:data.observed_at,
    coverage:data.coverage,sources:safeSources,claims:safeClaims,open_questions:unanswered,
    next_probe:{action:nonempty(probe.action,"next probe action",1000),
      falsifier:nonempty(probe.falsifier,"next probe falsifier",1000),consent},
    summary:safeClaims.length+" attributable claims · "+unanswered.length+" open questions",
    notice:"A return ticket is a sourced handoff, not an authority, verified source read, or MEMENTO admission."};
}
export function readMementoArtifact(input){
  let data=input;
  if(typeof input==="string"){
    if(new TextEncoder().encode(input).length>MAX_ARTIFACT_BYTES)
      fail("TOO_LARGE","Artifact exceeds 256 KiB local preview limit");
    try{data=JSON.parse(input)}catch(_){fail("INVALID_JSON","Select a valid JSON file");}
  }
  object(data,"artifact");
  unadmitted(data.admission,"artifact admission");
  if(data.schema==="memento.context-pack/v0")return contextPack(data);
  if(data.schema==="memento.return-ticket/v1")return returnTicket(data);
  fail("UNSUPPORTED_SCHEMA","Only MEMENTO context-pack/v0 and return-ticket/v1 are supported");
}
export function createWorkbenchQuestion(artifact){
  if(!artifact||artifact.schema!=="static.memento-aperture/0.1"||artifact.admission!=="none")
    fail("INVALID","A read-only MEMENTO aperture is required");
  // This title is copied ONLY after an explicit human action in a local demo.
  const subject=artifact.kind==="context-pack"?"MEMENTO context: "+artifact.origin:
    "MEMENTO question: "+artifact.question;
  return "Investigate "+subject.slice(0,125);
}
