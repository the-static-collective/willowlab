import test from "node:test";
import assert from "node:assert/strict";
import {FICTIONAL_DEMO} from "../../neighbor-weave/core.mjs";
import {createDesk,reviewLead,makeIntroduction,composeWillowNote,dryRunCorrespondence,
  makeReviewPacket,NOTE_SCHEMA,GATE_SCHEMA} from "../core.mjs";
const seed=()=>createDesk(FICTIONAL_DEMO);
const lead=()=>seed().leads[0].card;
const offer={service:"move-in / move-out cleaning",value_to_neighbor:
  "If a project needs cleaning, we could discuss whether a trial would fit your schedule.",
  question:"Would a brief conversation about potential needs be useful?"};
const note={schema:NOTE_SCHEMA,week_of:"2026-11-23",service:"Move-in / move-out cleaning",
  observation:"We have been considering what makes transitions easier for residents.",
  tip:"Keep a labeled box for the first-day cleaning supplies.",
  availability:"Contact us to discuss next week's openings.",
  availability_status:"UNKNOWN",owner_checked:false,action_url:"https://cleanwithwillow.com"};
const event={schema:GATE_SCHEMA,purpose:"marketing",source_event_id:"fictional:event001",
  subject_ref:"opaque:test001",consent:"unknown",evidence_ref:null,suppressed:false,
  owner_approved:false,recipient_verified:false,provider_available:false};
const evidence="sha256:"+"a".repeat(64);
test("partner research is purely local and never an operational CRM",()=>{
 const d=seed();
 assert.equal(d.authority,"LOCAL_PREVIEW_ONLY");
 assert.equal(d.customer_records,0);
 assert.equal(d.outbound_effects,0);
 assert.equal(d.leads[0].card.stage,"DISCOVERED");
 assert.equal(d.leads[0].card.owner_permission,"NOT_AUTHORIZED");
});
test("review adds an idempotent simulated receipt, not contact permission",()=>{
 const first=reviewLead(seed(),{command_id:"local-001",lead_id:lead().id,
   expected_revision:0,action:"SHORTLIST",reason:"Public source appears relevant"});
 assert.equal(first.desk.revision,1);
 assert.equal(first.desk.leads[0].review,"SHORTLIST");
 assert.equal(first.desk.leads[0].card.owner_permission,"NOT_AUTHORIZED");
 assert.equal(first.desk.events[0].authority,"SIMULATED_ONLY");
 const replay=reviewLead(first.desk,{command_id:"local-001",lead_id:lead().id,
   expected_revision:0,action:"SHORTLIST",reason:"Public source appears relevant"});
 assert.equal(replay.duplicate,true);
 assert.equal(replay.desk.events.length,1);
});
test("review prevents changed-command replay and stale edits",()=>{
 const c={command_id:"local-001",lead_id:lead().id,expected_revision:0,action:"HOLD",reason:"Not sure"};
 const d=reviewLead(seed(),c).desk;
 assert.throws(()=>reviewLead(d,{...c,action:"DECLINE"}),/COMMAND_COLLISION/);
 assert.throws(()=>reviewLead(d,{...c,command_id:"local-002"}),/STALE_REVISION/);
 assert.throws(()=>reviewLead(d,{...c,command_id:"local-003",lead_id:"missing",expected_revision:1}),/UNKNOWN_LEAD/);
});
test("individual introduction stays owner-reviewed and unsent",()=>{
 const x=makeIntroduction(lead(),offer);
 assert.equal(x.state,"DRAFT_NOT_SENT");
 assert.equal(x.recipient,null);
 assert.equal(x.automated_send,false);
 assert.match(x.body,/whether/);
 assert.doesNotMatch(x.body,/exclusive partnership|guaranteed discount/);
 assert.throws(()=>makeIntroduction({...lead(),stage:"COLLABORATING"},offer),/INVALID_LEAD/);
});
test("Field Bell transplant produces four formats but no sending",()=>{
 const result=composeWillowNote(note);
 assert.deepEqual(Object.keys(result.variants),["email","web","social","print"]);
 assert.equal(result.status,"HOLD_UNVERIFIED");
 assert.equal(result.send_authority,false);
 assert.equal(result.publication_authority,false);
 for(const text of Object.values(result.variants)){
   assert.match(text,/Willow/);
   assert.doesNotMatch(text,/\$50|10% off|guaranteed tomorrow/);
 }
 assert.match(result.variants.email,/unsubscribe/i);
});
test("local owner-check toggle does not become production publication authority",()=>{
 const result=composeWillowNote({...note,owner_checked:true,
   availability_status:"OWNER_CONFIRMED"});
 assert.equal(result.status,"SOURCE_MARKED_CHECKED_IN_LOCAL_PREVIEW");
 assert.equal(result.publication_authority,false);
 assert.equal(result.send_authority,false);
 assert.match(result.variants.email,/Contact us to discuss next week's openings/);
});
test("untrusted URL and malformed dates are rejected",()=>{
 assert.throws(()=>composeWillowNote({...note,action_url:"javascript:alert(1)"}),/INVALID_LINK/);
 assert.throws(()=>composeWillowNote({...note,week_of:"2026-02-31"}),/INVALID_NOTE/);
 assert.throws(()=>composeWillowNote({...note,action_url:"https://alice:secret@example.org"}),/INVALID_LINK/);
});
test("marketing without current opt-in evidence remains HELD even with owner approved",()=>{
 const x=dryRunCorrespondence({...event,owner_approved:true,
   recipient_verified:true,provider_available:true});
 assert.equal(x.status,"HELD_CONSENT");
 assert.equal(x.no_external_effect,true);
 assert.equal(x.email_sent,false);
});
test("revoked and suppressed outrank a previously approved event",()=>{
 for(const q of [{consent:"revoked"},{suppressed:true}]){
   const x=dryRunCorrespondence({...event,consent:"granted",
     evidence_ref:evidence,owner_approved:true,recipient_verified:true,
     provider_available:true,...q});
   assert.equal(x.status,"SUPPRESSED");
   assert.equal(x.provider_ack,null);
 }
});
test("owner review, recipient verification and provider gates do not collapse",()=>{
 const base={...event,consent:"granted",evidence_ref:evidence,
   recipient_verified:true,provider_available:true};
 assert.equal(dryRunCorrespondence(base).status,"HELD_OWNER");
 assert.equal(dryRunCorrespondence({...base,owner_approved:true,recipient_verified:false}).status,"HELD_DESTINATION");
 assert.equal(dryRunCorrespondence({...base,owner_approved:true,provider_available:false}).status,"HELD_PROVIDER");
});
test("fully supplied fictional permission gates produce only a simulation result",()=>{
 const base={...event,consent:"granted",evidence_ref:evidence,
   owner_approved:true,recipient_verified:true,provider_available:true};
 const ok=dryRunCorrespondence(base);
 assert.equal(ok.status,"ELIGIBLE_IN_SIMULATION");
 assert.equal(ok.email_sent,false);
 assert.equal(ok.customer_record_updated,false);
 assert.equal(dryRunCorrespondence(base,[ok.idempotency_key]).status,"ALREADY_PROCESSED");
});
test("manual B2B introduction is distinct from subscriber marketing",()=>{
 const base={...event,purpose:"individual-introduction",owner_approved:true,
   recipient_verified:true,provider_available:true};
 const x=dryRunCorrespondence(base);
 assert.equal(x.status,"ELIGIBLE_IN_SIMULATION");
 assert.equal(x.email_sent,false);
 assert.equal(x.protocol_inspiration.includes("not a native call"),true);
});
test("export contains only review proposal and no customer or sending state",()=>{
 const d=reviewLead(seed(),{command_id:"local-003",lead_id:lead().id,
   expected_revision:0,action:"SHORTLIST",reason:"Maybe relevant"}).desk;
 const packet=makeReviewPacket(d,lead().id,offer);
 assert.equal(packet.state,"DRAFT_NOT_SENT_NOT_IMPORTED");
 assert.equal(packet.limits.crm_write,false);
 assert.equal(packet.introduction.recipient,null);
 assert.equal(packet.proposal.owner_decision,"UNREQUESTED");
 assert.equal(JSON.stringify(packet).includes("customer@example.com"),false);
});
test("invalid gate input refuses opaque email subjects",()=>{
 assert.throws(()=>dryRunCorrespondence({...event,subject_ref:"person@example.com"}),/INVALID_GATE_INPUT/);
 assert.throws(()=>dryRunCorrespondence({...event,evidence_ref:"fake"}),/INVALID_GATE_INPUT/);
});
