/**
 * Willow Growth Desk 001 — a public-safe, local-only Willow-specific transplant.
 * Inspired by STATIC SEED Neighbor Weave 0.2.1, Field Bell, and reLATTE COMMUTER-001.
 * No operational WillowConnect integration or email/CRM provider is implemented.
 */
import {FICTIONAL_DEMO,readPublicGarden,crossingDraft} from "../neighbor-weave/core.mjs";

export const DESK_SCHEMA="willowlab.growth-desk/v1";
export const NOTE_SCHEMA="willowlab.field-note/v1";
export const GATE_SCHEMA="willowlab.commuter-dry-run/v1";
const ACTIONS=new Set(["HOLD","SHORTLIST","DECLINE"]);
const PURPOSES=new Set(["marketing","individual-introduction","operational"]);
const fmt=x=>String(x??"").trim();
const fail=(code)=>{throw Error(code);};
const valid=(x,max=500)=>typeof x==="string"&&x.trim().length>0&&x.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(x);
const copy=x=>JSON.parse(JSON.stringify(x));
function date(value){
  return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&
    !Number.isNaN(Date.parse(value))&&new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value;
}
function httpsUrl(u){
  if(!valid(u,500))fail("INVALID_LINK");
  let parsed;
  try{parsed=new URL(u);}catch{fail("INVALID_LINK");}
  if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.hash)fail("INVALID_LINK");
  return parsed.href;
}
function deskView(d){
  if(!d||d.schema!==DESK_SCHEMA||!Number.isSafeInteger(d.revision)||d.revision<0||
    !Array.isArray(d.leads)||!Array.isArray(d.events))fail("INVALID_DESK");
  return d;
}
export function createDesk(garden=FICTIONAL_DEMO){
  const observed=readPublicGarden(garden);
  return {schema:DESK_SCHEMA,authority:"LOCAL_PREVIEW_ONLY",revision:0,
    leads:observed.cards.map(card=>({card,review:"UNREVIEWED",reason:null})),
    events:[],outbound_effects:0,customer_records:0};
}
export function reviewLead(current,command){
  const desk=deskView(current);
  if(!command||!ACTIONS.has(command.action)||!valid(command.lead_id,80)||
    !valid(command.command_id,100)||!valid(command.reason,300)||
    !Number.isSafeInteger(command.expected_revision))fail("INVALID_REVIEW");
  const fingerprint=JSON.stringify({lead_id:command.lead_id,action:command.action,reason:fmt(command.reason)});
  const past=desk.events.find(e=>e.command_id===command.command_id);
  if(past){
    if(past.fingerprint!==fingerprint)fail("COMMAND_COLLISION");
    return {desk,duplicate:true};
  }
  if(command.expected_revision!==desk.revision)fail("STALE_REVISION");
  const selected=desk.leads.find(x=>x.card.id===command.lead_id);
  if(!selected)fail("UNKNOWN_LEAD");
  const next=copy(desk);
  const row=next.leads.find(x=>x.card.id===command.lead_id);
  row.review=command.action;
  row.reason=fmt(command.reason);
  next.revision++;
  next.events.push({command_id:command.command_id,fingerprint,revision:next.revision,
    action:command.action,lead_id:command.lead_id,source_ref:row.card.source.url,
    receipt:"LOCAL-REVIEW-"+next.revision,authority:"SIMULATED_ONLY"});
  return {desk:next,duplicate:false};
}
export function makeIntroduction(card,offer){
  if(!card||card.stage!=="DISCOVERED"||card.owner_permission!=="NOT_AUTHORIZED"||
      !valid(card.name,120)||!valid(card.source?.url,600))fail("INVALID_LEAD");
  if(!offer||!valid(offer.service,160)||!valid(offer.value_to_neighbor,340)||
    !valid(offer.question,260))fail("INVALID_OFFER");
  // This is a personal draft only, not a mailing-list entry or consent claim.
  return {schema:"willowlab.manual-introduction/v1",
    state:"DRAFT_NOT_SENT",channel:"one-to-one-human-reviewed",recipient:null,
    subject:"Possible local collaboration with Willow Cleaning Services",
    body:"Hello,\n\nI'm writing from Willow Cleaning Services to ask whether "+
      card.name+" might be interested in comparing local services. "+
      "We provide "+fmt(offer.service)+".\n\n"+
      fmt(offer.value_to_neighbor)+"\n\n"+fmt(offer.question)+
      "\n\nIf this isn't relevant, no reply is needed.\n\nThank you,\nWillow Cleaning Services",
    source:{url:card.source.url,checked_on:card.source.checked_on},
    owner_authorization:"NOT_ESTABLISHED",automated_send:false};
}
function checkNote(note){
  if(!note||note.schema!==NOTE_SCHEMA||!date(note.week_of)||
    !valid(note.service,160)||!valid(note.observation,600)||
    !valid(note.tip,600)||!valid(note.availability,300)||
    typeof note.owner_checked!=="boolean"||
    !["UNKNOWN","CONFIRM_WITH_OFFICE","OWNER_CONFIRMED"].includes(note.availability_status))fail("INVALID_NOTE");
  return {week:note.week_of,service:fmt(note.service),observation:fmt(note.observation),
    tip:fmt(note.tip),availability:fmt(note.availability),
    availability_status:note.availability_status,
    owner_checked:note.owner_checked,
    url:httpsUrl(note.action_url)};
}
export function composeWillowNote(note){
  const v=checkNote(note),verified=v.owner_checked&&v.availability_status==="OWNER_CONFIRMED";
  const dates= v.week+" · Willow Cleaning Services";
  const availability=verified?v.availability:"Availability is unverified. Contact Willow for current scheduling.";
  const caveat=verified?"For owner review. No message has been sent.":"DRAFT ONLY: verify all service, timing, availability and factual details before use.";
  const email="Subject: A note from Willow | "+v.week+"\n\n"+
    "Hello,\n\nHere's a small note from Willow Cleaning Services.\n\n"+
    "SERVICE FOCUS\n"+v.service+"\n\nFROM THE WORK\n"+v.observation+
    "\n\nONE HELPFUL TIP\n"+v.tip+"\n\nSCHEDULING\n"+availability+
    "\n\nLearn more or request an estimate: "+v.url+
    "\n\nWillow Cleaning Services\n\n[Mailing-service unsubscribe and current consent required for campaigns.]";
  const web="Willow Cleaning Services — "+dates+"\n\n"+v.observation+
    "\n\nFocus: "+v.service+"\n\nOne useful tip: "+v.tip+
    "\n\nAvailability: "+availability+"\n\nLearn more: "+v.url;
  const social="A little from Willow this week.\n\n"+v.observation+
    "\n\nFocus: "+v.service+"\nTip: "+v.tip+
    "\nSchedule: "+availability+"\n"+v.url;
  const print="WILLOW CLEANING SERVICES\n"+v.week+
    "\n\n"+v.service.toUpperCase()+"\n\n"+v.observation+
    "\n\nA CLEANING TIP\n"+v.tip+
    "\n\n"+availability+"\n\n"+v.url;
  return {schema:"willowlab.field-bell-output/v1",status:verified?"SOURCE_MARKED_CHECKED_IN_LOCAL_PREVIEW":"HOLD_UNVERIFIED",
    send_authority:false,publication_authority:false,disclosure:caveat,source_date:v.week,
    variants:{email,web,social,print}};
}
export function dryRunCorrespondence(input,seenKeys=[]){
  if(!input||input.schema!==GATE_SCHEMA||!PURPOSES.has(input.purpose)||
    !valid(input.source_event_id,120)||!valid(input.subject_ref,120)||
    input.subject_ref.includes("@")||
    !["granted","revoked","unknown"].includes(input.consent)||
    typeof input.suppressed!=="boolean"||typeof input.owner_approved!=="boolean"||
    typeof input.recipient_verified!=="boolean"||typeof input.provider_available!=="boolean"||
    (input.evidence_ref!==null&&!/^sha256:[a-f0-9]{64}$/.test(input.evidence_ref))||
    !Array.isArray(seenKeys)||seenKeys.some(x=>typeof x!=="string"))fail("INVALID_GATE_INPUT");
  const dedupeKey="dry-run:"+input.purpose+":"+input.source_event_id;
  let status,why;
  if(input.suppressed||input.consent==="revoked"){
    status="SUPPRESSED";why="Revoked consent or suppression takes priority over prior approval.";
  }else if(!input.owner_approved){
    status="HELD_OWNER";why="No current owner approval recorded.";
  }else if(input.purpose==="marketing"&&
        (input.consent!=="granted"||!input.evidence_ref)){
    status="HELD_CONSENT";why="A marketing message requires current permission and evidence.";
  }else if(!input.recipient_verified){
    status="HELD_DESTINATION";why="Destination and message-purpose verification are missing.";
  }else if(!input.provider_available){
    status="HELD_PROVIDER";why="No authorized delivery provider is available.";
  }else if(seenKeys.includes(dedupeKey)){
    status="ALREADY_PROCESSED";why="This synthetic event identity has already been processed.";
  }else {
    status="ELIGIBLE_IN_SIMULATION";why="All supplied hypothetical gates passed; actual provider authorization and transmission do not exist.";
  }
  return {schema:"willowlab.correspondence-result/v1",status,reason:why,
    idempotency_key:dedupeKey,protocol_inspiration:"reLATTE COMMUTER-001 (not a native call)",
    no_external_effect:true,provider_ack:null,customer_record_updated:false,
    email_sent:false};
}
export function makeReviewPacket(desk,leadId,offer){
  deskView(desk);
  const entry=desk.leads.find(x=>x.card.id===leadId);
  if(!entry)fail("UNKNOWN_LEAD");
  return {schema:"willowlab.growth-review-packet/v1",state:"DRAFT_NOT_SENT_NOT_IMPORTED",
    willowconnect_status:"NO_SYNC",authority:"OWNER_REVIEW_NOT_OBTAINED",
    review:{local_state:entry.review,local_reason:entry.reason,local_revision:desk.revision},
    proposal:crossingDraft(entry.card),
    introduction:makeIntroduction(entry.card,offer),
    limits:{customer_data:false,automatic_outreach:false,crm_write:false,
      campaign_enrollment:false,external_delivery:false}};
}
