import test from "node:test";
import assert from "node:assert/strict";
import {newSprint,loadStarterAtlas,reviewCandidate,logManualContact} from "../sprint.mjs";
import {missionBrief,missionReceipt,makeNebulaHandoff,formatNebulaPrompt,
  inspectNebulaReturn,HANDOFF_SCHEMA,RETURN_SCHEMA} from "../mission.mjs";
const make=()=>loadStarterAtlas(newSprint()).state;
const today="2026-11-23";
const response=(p)=>({schema:RETURN_SCHEMA,packet_id:p.packet_id,
  source_revision:p.source.revision,
  claimed_effects:{wms_write:false,outreach_sent:false,owner_approval:false},
  annotations:[{candidate_id:p.candidates[0].candidate.id,state:"NEEDS_OWNER_DECISION",
    question:"Does Willow actually serve this kind of property?",
    notes:"Check current WMS record, its source and owner authority."}]});
test("brief is explicitly a local MOTIF-inspired heuristic not native solver",()=>{
  const m=missionBrief(make(),today);
  assert.equal(m.mode,"DETERMINISTIC_MOTIF_INSPIRED_NOT_NATIVE_SOLVER");
  assert.equal(m.limits.native_motif_executed,false);
  assert.deepEqual(m.movements,["OBSERVE","HYPOTHESIZE","PROBE","REVISE","PLAN","VERIFY"]);
  assert.equal(m.missions.length,4);
  assert.equal(m.missions[0].next,"RESEARCH_SOURCE");
  assert.equal(m.limits.owner_approval,false);
});
test("source-backed reasoning keeps rival hypotheses, one falsifier and zero acts",()=>{
  const s=make(),r=missionReceipt(s,"lloyd-management",today);
  assert.equal(r.alternatives.length,3);
  assert.match(r.observed.source.url,/lloydmanagement/);
  assert.match(r.falsifier,/independent cleaning contractors/);
  assert.equal(r.approval,"NOT_GRANTED");
  assert.equal(r.executed_actions,0);
  assert.equal(r.proposed_draft_status,"DRAFT_NOT_SENT");
});
test("shortlisted candidate moves into owner review, not outbound approval",()=>{
  let s=make();
  s=reviewCandidate(s,{command_id:"SHORTLIST01",expected_revision:s.revision,
    id:"waseca-realty",review:"SHORTLIST",reason:"Check local service area"}).state;
  const m=missionBrief(s,today);
  assert.equal(m.missions[0].candidate.id,"waseca-realty");
  assert.equal(m.missions[0].next,"OWNER_REVIEW_AND_DRAFT");
  assert.equal(m.missions[0].permission,"REVIEW_ONLY_NO_SEND");
});
test("handoff includes only local source observations and explicit Nebula review scope",()=>{
  const p=makeNebulaHandoff(make(),today,"waseca-realty");
  assert.equal(p.schema,HANDOFF_SCHEMA);
  assert.equal(p.source.verified_runtime_sync,false);
  assert.equal(p.candidates.length,1);
  assert.equal(p.permissions.doc_write,false);
  assert.equal(p.permissions.provider_send,false);
  assert.equal(p.state,"DRAFT_NOT_SENT_NOT_INGESTED");
  assert.equal(p.reply_contract,RETURN_SCHEMA);
  assert.match(formatNebulaPrompt(p),/C-06\/C-10\/C-12/);
  assert.match(formatNebulaPrompt(p),/WMS Master/);
});
test("batch handoff has at most five missions, ordered by review urgency",()=>{
  let s=make();
  s=reviewCandidate(s,{command_id:"SHORTLIST01",expected_revision:s.revision,
    id:"waseca-realty",review:"SHORTLIST",reason:"Candidate review needed"}).state;
  const p=makeNebulaHandoff(s,today);
  assert.equal(p.candidates[0].candidate.id,"waseca-realty");
  assert.equal(p.candidates.length,4);
  assert.equal(p.source.revision,s.revision);
  assert.equal(p.candidates[0].reasoning.approval,"NOT_GRANTED");
});
test("informational Nebula return is never owner authority or a WMS write",()=>{
  const s=make(),p=makeNebulaHandoff(s,today,"waseca-realty");
  const reply=response(p);
  const r=inspectNebulaReturn(s,p,reply);
  assert.equal(r.state,"LOCAL_UNVERIFIED_NOT_APPLIED_TO_WMS");
  assert.equal(r.annotations[0].verified_identity,false);
  assert.equal(r.changes.owner_decisions,0);
  assert.equal(r.changes.wms_records,0);
  assert.equal(r.changes.outbound_messages,0);
  assert.equal(r.annotations[0].state,"NEEDS_OWNER_DECISION");
});
test("return with claimed owner approval, outreach or WMS changes refuses",()=>{
  const s=make(),p=makeNebulaHandoff(s,today,"waseca-realty");
  for(const mutate of [
    x=>x.claimed_effects.wms_write=true,
    x=>x.claimed_effects.owner_approval=true,
    x=>x.claimed_effects.outreach_sent=true,
    x=>x.annotations[0].state="APPROVED",
    x=>x.annotations[0].notes="Email private.person@example.com",
    x=>x.annotations[0].notes="Call 507-555-1234"
  ]){
    const reply=response(p);mutate(reply);
    assert.throws(()=>inspectNebulaReturn(s,p,reply),/INVALID_NEBULA_RETURN/);
  }
});
test("stale candidate revision and foreign source references refuse",()=>{
  const s=make(),p=makeNebulaHandoff(s,today,"waseca-realty");
  const changed=reviewCandidate(s,{command_id:"SHORTLIST01",expected_revision:s.revision,
    id:"waseca-realty",review:"HOLD",reason:"Needs source update"}).state;
  assert.throws(()=>inspectNebulaReturn(changed,p,response(p)),/STALE_OR_ALTERED_HANDOFF/);
  const wrong=structuredClone(p);
  wrong.candidates[0].candidate.id="other-company";
  assert.throws(()=>inspectNebulaReturn(s,wrong,response(wrong)));
  const reply=response(p);reply.annotations[0].candidate_id="other-company";
  assert.throws(()=>inspectNebulaReturn(s,p,reply),/INVALID_NEBULA_RETURN/);
});
test("opaque external fields never become native facts in the sanitized return",()=>{
  const s=make(),p=makeNebulaHandoff(s,today,"waseca-realty");
  const reply=response(p);
  reply.owner_approved=true;
  reply.customer_data={name:"PRIVATE PERSON"};
  reply.annotations[0].sender_api_token="SECRET_CREDENTIAL";
  const o=inspectNebulaReturn(s,p,reply),serialized=JSON.stringify(o);
  assert.equal(serialized.includes("PRIVATE PERSON"),false);
  assert.equal(serialized.includes("SECRET_CREDENTIAL"),false);
  assert.equal(serialized.includes("owner_approved"),false);
});
test("manual self-reports are evidence only and do not create authenticated send",()=>{
  let s=make();
  s=reviewCandidate(s,{command_id:"SHORTLIST01",expected_revision:s.revision,
    id:"waseca-realty",review:"SHORTLIST",reason:"Owner to check potential fit"}).state;
  s=logManualContact(s,{command_id:"MANUALCONTACT01",expected_revision:s.revision,
    id:"waseca-realty",contact:{i_personally_sent_outside_app:true,owner_approval_attested:true,
      channel:"phone",occurred_on:"2026-11-23",followup_on:"2026-11-30",
      note:"Operator reports separate manual call."}}).state;
  const m=missionBrief(s,"2026-11-30");
  assert.equal(m.missions[0].next,"FOLLOWUP_DUE");
  assert.equal(m.missions[0].candidate.manual_contact.proof,"OPERATOR_SELF_REPORT_NOT_PROVIDER_VERIFIED");
  assert.equal(m.limits.owner_approval,false);
});

test("source date aging warns before proposing external action without live crawling",()=>{
 const m=missionBrief(make(),"2027-01-02");
 assert.equal(m.missions[0].source_freshness.needs_recheck,true);
 assert.ok(m.missions[0].source_freshness.days_since_check>30);
 assert.match(m.missions[0].proposed_action,/Reverify the dated public source/);
 assert.equal(m.limits.provider_send,false);
});
test("a returned packet with altered observed evidence is not accepted as genuine review",()=>{
 const s=make(),p=makeNebulaHandoff(s,today,"waseca-realty");
 const forged=structuredClone(p);
 forged.candidates[0].candidate.source.observed="They definitely need outside cleaners.";
 assert.throws(()=>inspectNebulaReturn(s,forged,response(forged)),
   /STALE_OR_ALTERED_HANDOFF/);
});
