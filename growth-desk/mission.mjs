/**
 * Willow Mission Control 003: deterministic MOTIF-inspired review suggestions
 * and manual, source-pinned Nebula packets. NOT the native MOTIF solver or
 * an authenticated Nebula/WMS runtime connection.
 */
import {exportSprint,sprintQueue,planForReview} from "./sprint.mjs";
export const HANDOFF_SCHEMA="willowlab.nebula-handoff/v1";
export const RETURN_SCHEMA="willowlab.nebula-review-return/v1";
const error=(x)=>{throw new Error(x);};
const text=(v,max=400)=>typeof v==="string"&&v.trim().length>0&&v.length<=max&&
  !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)&&
  !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(v)&&
  !/(?:\+?1[-. ]?)?\(?[2-9]\d{2}\)?[-. ]?[2-9]\d{2}[-. ]?\d{4}/.test(v);
const day=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x))&&new Date(x+"T12:00:00Z").toISOString().slice(0,10)===x;
const stamp=(v)=>String(v).replace(/[^a-zA-Z0-9_-]/g,"");
const knownNext=new Set(["FOLLOWUP_DUE","OWNER_REVIEW_AND_DRAFT","RESEARCH_SOURCE",
  "FOLLOWUP_SCHEDULED","REVIEW_OUTCOME","HELD","CLOSED"]);
const STATES=new Set(["NEEDS_SOURCE_CHECK","NEEDS_OWNER_DECISION","NO_ACTION"]);
function assertDay(d){if(!day(d))error("INVALID_BRIEF_DATE");}
function sourcePack(record){
  return {id:record.public.id,name:record.public.name,region:record.public.region,
    category:record.public.category,
    source:{url:record.public.source_url,checked_on:record.public.checked_on,
      observed:record.public.observation},
    hypothesis:record.public.hypothesis,
    falsifier:record.public.open_question,
    local_review:record.review??"UNREVIEWED",
    manual_contact:selfReport(record)};
}
function selfReport(r){
  return r.manual_contact?{reported:true,occurred_on:r.manual_contact.occurred_on,
    followup_on:r.manual_contact.followup_on,channel:r.manual_contact.channel,
    proof:"OPERATOR_SELF_REPORT_NOT_PROVIDER_VERIFIED"}:
    {reported:false,occurred_on:null,followup_on:null,channel:null,
      proof:"NO_EXTERNAL_ACTION_OBSERVED"};
}
export function missionBrief(sprint,today){
  assertDay(today);
  const safe=exportSprint(sprint),queue=sprintQueue(sprint,today);
  const map=new Map(safe.candidates.map(x=>[x.public.id,x]));
  const missions=queue.map((q,i)=>{
    if(!knownNext.has(q.next))error("UNKNOWN_MISSION_STATE");
    const item=map.get(q.id),p=sourcePack(item);
    const sourceAgeDays=Math.floor((Date.parse(today+"T12:00:00Z")-Date.parse(p.source.checked_on+"T12:00:00Z"))/86400000);
    const sourceNeedsRecheck=sourceAgeDays>30||sourceAgeDays<0;
    const nextAction={
      FOLLOWUP_DUE:"Review the reported external follow-up and decide whether any contact is appropriate.",
      OWNER_REVIEW_AND_DRAFT:"Ask Colton to verify Willow's service area and this business's fit; prepare an unsent introduction.",
      RESEARCH_SOURCE:"Recheck the cited public source and answer the unresolved question.",
      FOLLOWUP_SCHEDULED:"Keep the operator-reported review date; no automated send.",
      REVIEW_OUTCOME:"Record whether the operator has an evidence-backed outcome to report.",
      HELD:"Keep the candidate on hold. Identify what information would change the decision.",
      CLOSED:"No further work unless the owner explicitly reopens this research."
    }[q.next];
    return {rank:i+1,candidate:p,next:q.next,
      source_freshness:{checked_on:p.source.checked_on,days_since_check:sourceAgeDays,
        needs_recheck:sourceNeedsRecheck},
      proposed_action:sourceNeedsRecheck&&q.next!=="CLOSED"?
        "Reverify the dated public source before acting. "+nextAction:nextAction,
      permission:"REVIEW_ONLY_NO_SEND",confidence:"HYPOTHESIS_NOT_VERIFIED"};
  });
  return {schema:"willowlab.motif-brief/v1",
    mode:"DETERMINISTIC_MOTIF_INSPIRED_NOT_NATIVE_SOLVER",
    generated_on:today,sprint_revision:safe.generated_from_revision,
    authority:"LOCAL_UNVERIFIED_SOURCE_RESEARCH",
    purpose:"Choose the smallest source-grounded next question, not the best imagined sales lead.",
    movements:["OBSERVE","HYPOTHESIZE","PROBE","REVISE","PLAN","VERIFY"],
    roles:["Explorer","Skeptic","Architect","Historian","Governor"],
    missions,
    limits:{native_motif_executed:false,owner_approval:false,
      customer_write:false,provider_send:false,nebula_connected:false}};
}
export function missionReceipt(sprint,candidateId,today){
  const brief=missionBrief(sprint,today),m=brief.missions.find(x=>x.candidate.id===candidateId);
  if(!m)error("UNKNOWN_MISSION");
  let proposal;
  try{proposal=planForReview(sprint,candidateId);}catch{error("INVALID_MISSION_SOURCE");}
  return {schema:"willowlab.motif-reasoning-receipt/v1",
    mode:brief.mode,decision:"What is the smallest truthful next action?",
    observed:{business:m.candidate.name,source:m.candidate.source,local_review:m.candidate.local_review},
    alternatives:[
      {id:"A",proposal:"Investigate documented public service and referral policy",
        support:"A public source exists; business demand remains unknown."},
      {id:"B",proposal:"Offer Willow as a potential cleaning partner after owner review",
        support:"The business category might overlap with Willow services; need and capacity are unverified."},
      {id:"C",proposal:"Close or hold the candidate",
        support:"The organization might have an existing preferred vendor or no outside-cleaning need."}
    ],
    falsifier:m.candidate.falsifier,
    probe:"Verify current public source and ask whether the hypothesis would matter for the actual service area.",
    revision:"No observed evidence of partnership or confirmed demand; keep all propositions provisional.",
    plan:m.proposed_action,verification:"No field observation, response or provider receipt recorded here.",
    proposed_draft_status:proposal.draft.state,
    approval:"NOT_GRANTED",executed_actions:0};
}
export function makeNebulaHandoff(sprint,today,selectedId=null){
  const brief=missionBrief(sprint,today);
  if(selectedId!==null&&(!text(selectedId,80)||!/^[a-z0-9-]+$/.test(selectedId)))
    error("INVALID_HANDOFF_SELECTION");
  const all=selectedId?brief.missions.filter(x=>x.candidate.id===selectedId):
    brief.missions.filter(x=>!["CLOSED","HELD"].includes(x.next)).slice(0,5);
  if(!all.length)error("NO_REVIEWABLE_CANDIDATES");
  const packetId="nebula-draft-"+brief.sprint_revision+"-"+stamp(today)+"-"+
    all.map(x=>x.candidate.id).join("_");
  if(packetId.length>550)error("HANDOFF_TOO_LARGE");
  return {schema:HANDOFF_SCHEMA,
    packet_id:packetId,created_on:today,
    state:"DRAFT_NOT_SENT_NOT_INGESTED",
    source:{system:"WILLOWLAB_LOCAL_SPRINT",revision:brief.sprint_revision,
      source_schema:"willowlab.partner-sprint-export/v1",verified_runtime_sync:false},
    recipient_role:"NEBULA_DOCUMENTATION_RECONCILIATION",
    request:"Reconcile source-backed partner hypotheses with current governing WMS Master, single owner action list, C-12 evidence-to-next-action, and proposed C-06/C-10 boundaries. Do not silently create a duplicate task, approve a contact, or claim a send.",
    candidates:all.map(m=>({...m,reasoning:missionReceipt(sprint,m.candidate.id,today)})),
    permissions:{owner_approval:false,customer_write:false,
      partner_admission:false,scheduled_send:false,provider_send:false,
      doc_write:false,wms_sync:false},
    reply_contract:RETURN_SCHEMA,
    next_human_step:"Colton or authorized WMS builder reviews this unsent packet against current governing records. No automatic ingestion exists."};
}
export function formatNebulaPrompt(packet){
  assertHandoff(packet);
  const lines=[
    "# Willow Growth → Nebula review packet (not an instruction to act)",
    "Packet: "+packet.packet_id,
    "Local source revision: "+packet.source.revision+"; created: "+packet.created_on,
    "Authority: UNVERIFIED / PROPOSAL ONLY / NEVER SENT",
    "",
    packet.request,"",
    "Please use the current WMS Master, Builder Coordination, single User Action List, current source register and shared C-06/C-10/C-12 contracts. Preserve original IDs, evidence and unresolved decisions. Return a cited reconciliation; do not update Colton's records or send outreach without his authorization.",
    ""
  ];
  for(const m of packet.candidates)lines.push(
    "## "+m.candidate.name+" ["+m.candidate.id+"]",
    "Public source: "+m.candidate.source.url+" (checked "+m.candidate.source.checked_on+")",
    "Observed: "+m.candidate.source.observed,
    "Opportunity hypothesis (not fact): "+m.candidate.hypothesis,
    "Falsifier / open question: "+m.candidate.falsifier,
    "Local review: "+m.candidate.local_review+"; next suggested: "+m.next,
    "Proposed question/action: "+m.proposed_action,
    "No partner, marketing consent, provider delivery or customer identity established.",""
  );
  const returnTemplate={schema:RETURN_SCHEMA,packet_id:packet.packet_id,
    source_revision:packet.source.revision,
    claimed_effects:{wms_write:false,outreach_sent:false,owner_approval:false},
    annotations:packet.candidates.map(m=>({
      candidate_id:m.candidate.id,state:"NEEDS_SOURCE_CHECK",
      question:m.candidate.falsifier,
      notes:"No independently verified decision yet. Source and governing WMS owner record must be checked."
    }))};
  lines.push("Report unresolved source gaps and any existing owning WMS item by its exact ID. If no current owner authorization is located, explicitly HOLD and explain the smallest decision Colton must make.",
    "",
    "Optional: return the following JSON shape (one annotation per candidate) so this local preview can inspect it. Treat every note as unverified; do not claim Colton approved anything, that a message was sent, or that governing Docs were edited:",
    JSON.stringify(returnTemplate,null,2));
  return lines.join("\n");
}
function assertHandoff(packet){
  if(!packet||packet.schema!==HANDOFF_SCHEMA||
    packet.state!=="DRAFT_NOT_SENT_NOT_INGESTED"||
    !text(packet.packet_id,550)||!packet.packet_id.startsWith("nebula-draft-")||
    !day(packet.created_on)||!Number.isSafeInteger(packet.source?.revision)||
    packet.source.revision<0||packet.source.verified_runtime_sync!==false||
    packet.permissions?.wms_sync!==false||
    packet.permissions?.customer_write!==false||
    packet.permissions?.provider_send!==false||
    packet.permissions?.doc_write!==false||
    !Array.isArray(packet.candidates)||packet.candidates.length<1||
    packet.candidates.length>5)error("INVALID_NEBULA_HANDOFF");
  for(const m of packet.candidates)if(
    !text(m.candidate?.id,80)||!text(m.candidate?.name,120)||
    !text(m.candidate?.source?.url,600)||!text(m.candidate?.source?.observed,500)||
    !text(m.candidate?.falsifier,300)||!knownNext.has(m.next)
  )error("INVALID_NEBULA_HANDOFF");
  return packet;
}
export function inspectNebulaReturn(sprint,packet,reply){
  const mine=makeNebulaHandoff(sprint,packet?.created_on,
    packet?.candidates?.length===1?packet.candidates[0].candidate.id:null);
  assertHandoff(packet);
  if(packet.packet_id!==mine.packet_id||
    packet.source.revision!==mine.source.revision||
    JSON.stringify(packet.candidates)!==JSON.stringify(mine.candidates))
    error("STALE_OR_ALTERED_HANDOFF");
  if(!reply||reply.schema!==RETURN_SCHEMA||reply.packet_id!==packet.packet_id||
    reply.source_revision!==packet.source.revision||
    reply.claimed_effects?.wms_write!==false||
    reply.claimed_effects?.outreach_sent!==false||
    reply.claimed_effects?.owner_approval!==false||
    !Array.isArray(reply.annotations)||reply.annotations.length>5)error("INVALID_NEBULA_RETURN");
  const seen=new Set();
  const annotations=reply.annotations.map(a=>{
    if(!a||!text(a.candidate_id,80)||seen.has(a.candidate_id)||
      !packet.candidates.some(m=>m.candidate.id===a.candidate_id)||
      !STATES.has(a.state)||!text(a.question,300)||!text(a.notes,600))
      error("INVALID_NEBULA_RETURN");
    seen.add(a.candidate_id);
    return {candidate_id:a.candidate_id,state:a.state,
      question:a.question,notes:a.notes,verified_identity:false,
      source:"USER_IMPORTED_UNVERIFIED_NOTE"};
  });
  return {schema:"willowlab.nebula-return-preview/v1",
    state:"LOCAL_UNVERIFIED_NOT_APPLIED_TO_WMS",
    source_packet:packet.packet_id,source_revision:packet.source.revision,
    annotations,
    changes:{sprint_records:0,wms_records:0,owner_decisions:0,
      customer_records:0,outbound_messages:0},
    next:"Human compares notes against the governing WMS documents; never accept the note as Colton's authorization."};
}

/**
 * Single-file manual transfer to Colton's private Connect owner review inbox.
 * Contains only allowlisted source research and an unsent Nebula proposal.
 * This is NOT a sender/API instruction, signed credential or automatic sync.
 */
export function makeConnectReviewBundle(sprint,today,selectedId=null){
  const sprintExport=exportSprint(sprint);
  const handoff=makeNebulaHandoff(sprint,today,selectedId);
  if(handoff.source.revision!==sprintExport.generated_from_revision)
    error("SOURCE_REVISION_CHANGED");
  return {schema:"willowlab.growth-connect-bundle/v1",
    state:"DRAFT_NOT_TRANSFERRED",
    created_on:today,
    sprint_export:sprintExport,
    handoff,
    permissions:{owner_approval:false,customer_import:false,
      external_outreach:false,marketing_enrollment:false,wms_sync:false},
    destination:"CONNECT_OWNER_REVIEW_ONLY_NOT_LIVE_SYNC"};
}
