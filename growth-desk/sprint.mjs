/**
 * Willow Partner Sprint 002.
 * An operator-owned, public-business research and manual-outreach notebook.
 * It deliberately is NOT WillowConnect CRM, a contact list, or a sender.
 * All state transitions are deterministic and revisioned; callers own storage.
 */
import {makeIntroduction} from "./core.mjs";

export const SPRINT_SCHEMA="willowlab.partner-sprint/v1";
export const EXPORT_SCHEMA="willowlab.partner-sprint-export/v1";
const CATEGORY=new Set(["property-management","residential-realty","commercial-realty","other-business"]);
const REVIEW=new Set(["HOLD","SHORTLIST","DECLINE"]);
const CHANNEL=new Set(["email","phone","in-person","other"]);
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMAND_ID=/^[A-Za-z0-9_-]{1,100}$/;
const email=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phone=/(?:\+?1[-. ]?)?\(?[2-9]\d{2}\)?[-. ]?[2-9]\d{2}[-. ]?\d{4}/;
const reject=(message)=>{throw new Error(message);};
const isPublicText=(x,max=500)=>typeof x==="string"&&x.trim().length>0&&x.length<=max&&
  !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x)&&!email.test(x)&&!phone.test(x);
const clean=(x)=>x.trim();
const date=(x)=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x))&&new Date(x+"T12:00:00Z").toISOString().slice(0,10)===x;
function url(value){
  if(!isPublicText(value,600)||/\s/.test(value))reject("INVALID_PUBLIC_URL");
  let u;
  try{u=new URL(value);}catch{reject("INVALID_PUBLIC_URL");}
  if(u.protocol!=="https:"||u.username||u.password||u.hash)reject("INVALID_PUBLIC_URL");
  return u.href;
}
const clone=(x)=>JSON.parse(JSON.stringify(x));
function validateCandidate(x){
  if(!x||typeof x!=="object"||Array.isArray(x)||
    !isPublicText(x.id,80)||!ID.test(x.id)||
    !isPublicText(x.name,120)||!isPublicText(x.region,100)||
    !CATEGORY.has(x.category)||!date(x.checked_on)||
    !isPublicText(x.observation,500)||!isPublicText(x.hypothesis,400)||
    !isPublicText(x.open_question,300))reject("INVALID_PUBLIC_CANDIDATE");
  return {id:x.id,name:clean(x.name),region:clean(x.region),
    category:x.category,source_url:url(x.source_url),checked_on:x.checked_on,
    observation:clean(x.observation),hypothesis:clean(x.hypothesis),
    open_question:clean(x.open_question)};
}
export const STARTER_ATLAS=Object.freeze([
  {id:"lloyd-management",name:"Lloyd Management",region:"Mankato, Minnesota",
    category:"property-management",source_url:"https://www.lloydmanagement.com/",
    checked_on:"2026-11-23",
    observation:"Public website describes rental-property leasing and management across Minnesota.",
    hypothesis:"Potential for turnover cleaning conversations, if existing vendors and service area permit.",
    open_question:"Does the company ever use independent cleaning contractors in Willow's actual service radius?"},
  {id:"nai-north-star",name:"NAI North Star",region:"Mankato, Minnesota",
    category:"commercial-realty",source_url:"https://www.nainorthstar.com/",
    checked_on:"2026-11-23",
    observation:"Public website describes commercial brokerage, property management and investment services.",
    hypothesis:"Possible introduction to commercial property turnover work, only if Willow offers and can fulfill that scope.",
    open_question:"Does Colton serve commercial properties and does this firm outsource any cleaning?"},
  {id:"waseca-realty",name:"Waseca Realty",region:"Waseca, Minnesota",
    category:"residential-realty",source_url:"https://www.waseca-realty.com/",
    checked_on:"2026-11-23",
    observation:"Public directory identifies a Waseca real-estate brokerage working with area buyers and sellers.",
    hypothesis:"Potential pre-listing or move-out coordination, conditional on Willow's service scope.",
    open_question:"Is there any need for a separate cleaning referral and what is the approved introduction channel?"},
  {id:"edina-realty-waseca",name:"Edina Realty — Waseca",region:"Waseca, Minnesota",
    category:"residential-realty",source_url:"https://www.edinarealty.com/office/waseca",
    checked_on:"2026-11-23",
    observation:"Official site lists a Waseca real-estate office and local-agent services.",
    hypothesis:"Possible client transition or move-out cleaning referral, not an existing partnership.",
    open_question:"Does the office have an existing referral policy or preferred cleaning partners?"}
]);
export function newSprint(){
  return {schema:SPRINT_SCHEMA,revision:0,authority:"LOCAL_OPERATOR_NOTEBOOK_ONLY",
    candidates:[],events:[],customer_records:0,app_messages_sent:0};
}
function readState(value){
  if(!value||value.schema!==SPRINT_SCHEMA||value.authority!=="LOCAL_OPERATOR_NOTEBOOK_ONLY"||
     !Number.isSafeInteger(value.revision)||value.revision<0||
     !Array.isArray(value.candidates)||value.candidates.length>80||
     !Array.isArray(value.events)||value.events.length>600||
     value.customer_records!==0||value.app_messages_sent!==0)reject("INVALID_SPRINT_STATE");
  return value;
}
function fingerprint(cmd){
  const values={type:cmd.type,id:cmd.id||null,candidate:cmd.candidate||null,
    review:cmd.review||null,reason:cmd.reason||null,
    contact:cmd.contact||null,outcome:cmd.outcome||null};
  return JSON.stringify(values);
}
function perform(current,command,update){
  const state=readState(current);
  if(!command||typeof command.command_id!=="string"||!COMMAND_ID.test(command.command_id)||
     !Number.isSafeInteger(command.expected_revision)||command.expected_revision<0||
     !isPublicText(command.type,40))reject("INVALID_COMMAND");
  const id=command.command_id,hash=fingerprint(command),existing=state.events.find(x=>x.command_id===id);
  if(existing){
    if(existing.fingerprint!==hash)reject("COMMAND_ID_CONFLICT");
    return {state,duplicate:true};
  }
  if(command.expected_revision!==state.revision)reject("REVISION_CONFLICT");
  if(state.events.length>=600)reject("EVENT_LIMIT");
  const next=clone(state);
  const receipt=update(next,command);
  next.revision++;
  next.events.push({command_id:id,fingerprint:hash,revision:next.revision,
    action:command.type,candidate_id:receipt.candidate_id,
    result:receipt.result,authority:"LOCAL_OPERATOR_UNVERIFIED"});
  return {state:next,duplicate:false};
}
export function addCandidate(state,command){
  return perform(state,{...command,type:"ADD_CANDIDATE"},(next,cmd)=>{
    const c=validateCandidate(cmd.candidate);
    if(next.candidates.length>=80)reject("CANDIDATE_LIMIT");
    if(next.candidates.some(x=>x.public.id===c.id||
      x.public.source_url===c.source_url))reject("DUPLICATE_CANDIDATE");
    next.candidates.push({public:c,review:null,review_reason:null,
      manual_contact:null,followup_state:null,relationship_confirmed:false,
      source_state:"PUBLIC_RESEARCH_ONLY"});
    return {candidate_id:c.id,result:"DISCOVERED"};
  });
}
export function loadStarterAtlas(current){
  let state=readState(current),added=0;
  for(const candidate of STARTER_ATLAS){
    if(state.candidates.some(x=>x.public.id===candidate.id))continue;
    const result=addCandidate(state,{command_id:"starter-"+candidate.id,
      expected_revision:state.revision,candidate});
    state=result.state;added++;
  }
  return {state,added};
}
function target(next,id){
  if(!isPublicText(id,80)||!ID.test(id))reject("INVALID_CANDIDATE_REF");
  const c=next.candidates.find(x=>x.public.id===id);
  if(!c)reject("CANDIDATE_NOT_FOUND");
  return c;
}
export function reviewCandidate(state,command){
  return perform(state,{...command,type:"REVIEW"},(next,cmd)=>{
    const c=target(next,cmd.id);
    if(!REVIEW.has(cmd.review)||!isPublicText(cmd.reason,300)||
      (c.manual_contact&&cmd.review!=="SHORTLIST"))reject("INVALID_REVIEW");
    c.review=cmd.review;c.review_reason=clean(cmd.reason);
    return {candidate_id:cmd.id,result:cmd.review};
  });
}
export function planForReview(state,id){
  const c=target(readState(state),id).public;
  const entry=readState(state).candidates.find(x=>x.public.id===id);
  const service=c.category==="property-management"?
    "move-in and move-out cleaning":
    c.category==="residential-realty"?"move-out or pre-listing cleaning":
    c.category==="commercial-realty"?"cleaning for property transitions":
    "locally coordinated cleaning services";
  const card={name:c.name,stage:"DISCOVERED",owner_permission:"NOT_AUTHORIZED",
    source:{url:c.source_url,checked_on:c.checked_on}};
  const intro=makeIntroduction(card,{service,
    value_to_neighbor:"If your team ever needs an outside cleaning partner for a specific job, we could discuss the scope, service area, and whether Willow is a good fit.",
    question:c.open_question});
  return {schema:"willowlab.partner-sprint-review/v1",
    candidate:{...c},review:entry.review,review_reason:entry.review_reason,
    owner_decision:"NOT_VERIFIED",source_fact:c.observation,
    draft:intro,proposed_next_action:entry.review==="SHORTLIST"?
      "Colton reviews fit, service offering and appropriate contact channel before any outreach.":
      "Review the public source and business fit first.",
    send_enabled:false,recipient:null};
}
export function logManualContact(state,command){
  return perform(state,{...command,type:"LOG_MANUAL_CONTACT"},(next,cmd)=>{
    const c=target(next,cmd.id),v=cmd.contact;
    if(c.review!=="SHORTLIST"||c.manual_contact)reject("REVIEW_OR_SINGLE_CONTACT_REQUIRED");
    if(!v||v.i_personally_sent_outside_app!==true||
      v.owner_approval_attested!==true||!CHANNEL.has(v.channel)||
      !date(v.occurred_on)||!date(v.followup_on)||
      v.followup_on<v.occurred_on||
      (Date.parse(v.followup_on+"T12:00:00Z")-Date.parse(v.occurred_on+"T12:00:00Z"))>90*86400000||
      !isPublicText(v.note,240))reject("INVALID_MANUAL_CONTACT_ATTESTATION");
    c.manual_contact={channel:v.channel,occurred_on:v.occurred_on,
      followup_on:v.followup_on,note:clean(v.note),
      evidence:"OPERATOR_SELF_REPORT_UNVERIFIED",
      owner_approval:"OPERATOR_ATTESTED_NOT_INDEPENDENTLY_VERIFIED"};
    c.followup_state="OPEN";
    return {candidate_id:cmd.id,result:"MANUAL_CONTACT_SELF_REPORTED"};
  });
}
export function resolveFollowup(state,command){
  return perform(state,{...command,type:"RESOLVE_FOLLOWUP"},(next,cmd)=>{
    const c=target(next,cmd.id);
    if(!c.manual_contact||c.followup_state!=="OPEN"||
      !["HOLD","DONE","CLOSED"].includes(cmd.outcome)||
      !isPublicText(cmd.reason,240))reject("INVALID_FOLLOWUP_OUTCOME");
    c.followup_state=cmd.outcome;
    return {candidate_id:cmd.id,result:cmd.outcome};
  });
}
export function sprintQueue(state,today){
  readState(state);
  if(!date(today))reject("INVALID_TODAY");
  return state.candidates.map(x=>{
    let next;
    if(x.review==="DECLINE"||x.followup_state==="CLOSED")next="CLOSED";
    else if(x.review==="HOLD"||x.followup_state==="HOLD")next="HELD";
    else if(!x.review)next="RESEARCH_SOURCE";
    else if(x.review==="SHORTLIST"&&!x.manual_contact)next="OWNER_REVIEW_AND_DRAFT";
    else if(x.manual_contact&&x.followup_state==="OPEN")
      next=x.manual_contact.followup_on<=today?"FOLLOWUP_DUE":"FOLLOWUP_SCHEDULED";
    else next="REVIEW_OUTCOME";
    return {id:x.public.id,name:x.public.name,region:x.public.region,
      category:x.public.category,next,followup_on:x.manual_contact?.followup_on||null,
      relationship_confirmed:false};
  }).sort((a,b)=>{
    const weight={"FOLLOWUP_DUE":0,"OWNER_REVIEW_AND_DRAFT":1,"RESEARCH_SOURCE":2,
      "FOLLOWUP_SCHEDULED":3,"REVIEW_OUTCOME":4,"HELD":5,"CLOSED":6};
    return weight[a.next]-weight[b.next]||
      (a.followup_on||"9999").localeCompare(b.followup_on||"9999")||
      a.name.localeCompare(b.name);
  });
}
function strictImport(value){
  if(!value||value.schema!==EXPORT_SCHEMA||value.mode!=="UNVERIFIED_LOCAL_OPERATOR_NOTEBOOK"||
    value.permissions?.automatic_outreach!==false||
    value.permissions?.crm_import!==false||
    value.permissions?.provider_send!==false||
    !Number.isSafeInteger(value.generated_from_revision)||value.generated_from_revision<0||
    !Array.isArray(value.candidates)||value.candidates.length>80)reject("INVALID_SPRINT_IMPORT");
  const state=newSprint(),seenId=new Set(),seenUrl=new Set();
  for(const record of value.candidates){
    const p=validateCandidate(record.public);
    if(seenId.has(p.id)||seenUrl.has(p.source_url))reject("DUPLICATE_CANDIDATE");
    seenId.add(p.id);seenUrl.add(p.source_url);
    const review=record.review===null?null:record.review;
    if(review!==null&&!REVIEW.has(review))reject("INVALID_SPRINT_IMPORT");
    const reason=review===null?null:record.review_reason;
    if(reason!==null&&!isPublicText(reason,300))reject("INVALID_SPRINT_IMPORT");
    let contact=null,followup=null;
    if(record.manual_contact!==null){
      const c=record.manual_contact;
      if(review!=="SHORTLIST"||!c||!CHANNEL.has(c.channel)||
        !date(c.occurred_on)||!date(c.followup_on)||
        c.followup_on<c.occurred_on||
        (Date.parse(c.followup_on+"T12:00:00Z")-Date.parse(c.occurred_on+"T12:00:00Z"))>90*86400000||
        !isPublicText(c.note,240)||
        c.evidence!=="OPERATOR_SELF_REPORT_UNVERIFIED"||
        c.owner_approval!=="OPERATOR_ATTESTED_NOT_INDEPENDENTLY_VERIFIED"||
        !["OPEN","DONE","HOLD","CLOSED"].includes(record.followup_state))reject("INVALID_SPRINT_IMPORT");
      contact={channel:c.channel,occurred_on:c.occurred_on,
        followup_on:c.followup_on,note:clean(c.note),
        evidence:c.evidence,owner_approval:c.owner_approval};
      followup=record.followup_state;
    }else if(record.followup_state!==null)reject("INVALID_SPRINT_IMPORT");
    if(record.relationship_confirmed!==false)reject("INVALID_SPRINT_IMPORT");
    state.candidates.push({public:p,review,review_reason:reason,
      manual_contact:contact,followup_state:followup,
      relationship_confirmed:false,source_state:"PUBLIC_RESEARCH_ONLY"});
  }
  return state;
}
export function exportSprint(value){
  const state=readState(value);
  // Normalize by the same import boundary to ensure unrecognized data and PII
  // cannot pass through the public-source portability format.
  const packet={schema:EXPORT_SCHEMA,mode:"UNVERIFIED_LOCAL_OPERATOR_NOTEBOOK",
    generated_from_revision:state.revision,
    permissions:{automatic_outreach:false,crm_import:false,provider_send:false},
    candidates:state.candidates};
  const normalized=strictImport(packet);
  return {schema:EXPORT_SCHEMA,mode:"UNVERIFIED_LOCAL_OPERATOR_NOTEBOOK",
    generated_from_revision:state.revision,
    permissions:{automatic_outreach:false,crm_import:false,provider_send:false},
    candidates:normalized.candidates};
}
export function importSprint(value){return strictImport(value);}
export function toWmsProposal(state,id){
  const entry=target(readState(state),id),c=entry.public,intro=planForReview(state,id).draft;
  return {schema:"willowlab.growth-review-packet/v1",state:"DRAFT_NOT_SENT_NOT_IMPORTED",
    willowconnect_status:"NO_SYNC",authority:"OWNER_REVIEW_NOT_OBTAINED",
    review:{local_state:entry.review||"UNREVIEWED",
      local_reason:entry.review_reason,local_revision:state.revision},
    proposal:{schema:"static-seed.neighbor-review-proposal/v1",owner_decision:"UNREQUESTED",
      candidate:{id:c.id,name:c.name,region:c.region,relationship_type:c.category,
        source:{url:c.source_url,checked_on:c.checked_on},
        observed:c.observation,hypothesis:c.hypothesis,open_question:c.open_question}},
    introduction:intro,
    limits:{customer_data:false,automatic_outreach:false,crm_write:false,
      campaign_enrollment:false,external_delivery:false}};
}
