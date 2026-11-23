import test from "node:test";
import assert from "node:assert/strict";
import {newSprint,addCandidate,loadStarterAtlas,reviewCandidate,planForReview,
  logManualContact,resolveFollowup,sprintQueue,exportSprint,importSprint,toWmsProposal,
  STARTER_ATLAS,SPRINT_SCHEMA,EXPORT_SCHEMA} from "../sprint.mjs";

const starter=()=>STARTER_ATLAS[0];
const command=(state,command_id,rest)=>({command_id,expected_revision:state.revision,...rest});
const populate=()=>loadStarterAtlas(newSprint()).state;
const short=()=>{const s=populate();return reviewCandidate(s,command(s,"shortlist-one",
  {id:starter().id,review:"SHORTLIST",reason:"Public operations appear relevant; owner must decide"})).state;};
const contact={
  i_personally_sent_outside_app:true,owner_approval_attested:true,channel:"email",
  occurred_on:"2026-11-23",followup_on:"2026-11-30",
  note:"Operator reports a separate manually sent message. No provider evidence."
};
test("starter atlas is exactly four sourced, uncontacted research hypotheses",()=>{
 const s=populate();
 assert.equal(s.schema,SPRINT_SCHEMA);
 assert.equal(s.candidates.length,4);
 assert.equal(s.app_messages_sent,0);
 assert.equal(s.customer_records,0);
 assert.equal(s.revision,4);
 assert.ok(s.candidates.every(x=>x.review===null&&x.manual_contact===null));
 assert.ok(s.candidates.every(x=>x.public.source_url.startsWith("https://")));
});
test("starter loading is idempotent, not an outreach or customer import",()=>{
 const first=loadStarterAtlas(newSprint());
 const again=loadStarterAtlas(first.state);
 assert.equal(first.added,4);
 assert.equal(again.added,0);
 assert.deepEqual(first.state,again.state);
});
test("public prospect command replays exactly and rejects changed ID or revisions",()=>{
 const s=newSprint();
 const action=command(s,"add-one",{candidate:starter()});
 const one=addCandidate(s,action);
 assert.equal(one.state.candidates.length,1);
 assert.equal(addCandidate(one.state,action).duplicate,true);
 assert.throws(()=>addCandidate(one.state,{...action,candidate:{...starter(),name:"Different"}}),/COMMAND_ID_CONFLICT/);
 assert.throws(()=>addCandidate(one.state,command(s,"add-other",{candidate:STARTER_ATLAS[1]})),/REVISION_CONFLICT/);
 assert.throws(()=>addCandidate(one.state,command(one.state,"add-two",{candidate:starter()})),/DUPLICATE_CANDIDATE/);
});
test("private email, phone and Javascript URLs cannot join public notebook",()=>{
 const s=newSprint();
 for (const c of [
  {...starter(),observation:"Email the person at private@example.com"},
  {...starter(),name:"Call 507-555-1234"},
  {...starter(),source_url:"javascript:alert(1)"},
  {...starter(),source_url:"https://user:secret@example.org"},
  {...starter(),source_url:"http://example.org"},
  {...starter(),checked_on:"2026-02-31"}
 ])assert.throws(()=>addCandidate(s,command(s,"bad",{candidate:c})));
});
test("review is recorded without claiming owner authorization",()=>{
 const s=populate();
 const reviewed=reviewCandidate(s,command(s,"review-001",
   {id:starter().id,review:"SHORTLIST",reason:"May overlap with turnover cleaning"})).state;
 assert.equal(reviewed.candidates[0].review,"SHORTLIST");
 assert.equal(reviewed.candidates[0].manual_contact,null);
 assert.equal(reviewed.candidates[0].relationship_confirmed,false);
 assert.equal(reviewed.app_messages_sent,0);
 assert.equal(planForReview(reviewed,starter().id).owner_decision,"NOT_VERIFIED");
});
test("draft is structured, sourced, unsent and not a confirmed commercial agreement",()=>{
 const report=planForReview(short(),starter().id);
 assert.equal(report.send_enabled,false);
 assert.equal(report.recipient,null);
 assert.equal(report.draft.state,"DRAFT_NOT_SENT");
 assert.equal(report.draft.automated_send,false);
 assert.match(report.draft.body,/conversation|question|cleaning/i);
 assert.doesNotMatch(report.draft.body,/guaranteed appointment|we are your preferred vendor/i);
});
test("self-reported manual contact requires prior shortlist and owner attestations",()=>{
 const s=populate();
 const c=command(s,"touch-001",{id:starter().id,contact});
 assert.throws(()=>logManualContact(s,c),/REVIEW_OR_SINGLE_CONTACT_REQUIRED/);
 const ready=short();
 assert.throws(()=>logManualContact(ready,command(ready,"touch-bad",
   {id:starter().id,contact:{...contact,owner_approval_attested:false}})),/INVALID_MANUAL_CONTACT_ATTESTATION/);
 assert.throws(()=>logManualContact(ready,command(ready,"touch-bad-2",
   {id:starter().id,contact:{...contact,i_personally_sent_outside_app:false}})),/INVALID_MANUAL_CONTACT_ATTESTATION/);
 assert.throws(()=>logManualContact(ready,command(ready,"touch-bad-3",
   {id:starter().id,contact:{...contact,followup_on:"2027-09-01"}})),/INVALID_MANUAL_CONTACT_ATTESTATION/);
});
test("manual report is not a provider send; due date is deterministic",()=>{
 const s=short();
 const out=logManualContact(s,command(s,"touch-001",{id:starter().id,contact}));
 assert.equal(out.state.app_messages_sent,0);
 assert.equal(out.state.candidates[0].manual_contact.evidence,"OPERATOR_SELF_REPORT_UNVERIFIED");
 assert.equal(out.state.candidates[0].relationship_confirmed,false);
 assert.equal(sprintQueue(out.state,"2026-11-24").find(x=>x.id===starter().id).next,"FOLLOWUP_SCHEDULED");
 assert.equal(sprintQueue(out.state,"2026-11-30")[0].next,"FOLLOWUP_DUE");
 assert.equal(logManualContact(out.state,command(s,"touch-001",{id:starter().id,contact})).duplicate,true);
 assert.throws(()=>logManualContact(out.state,command(out.state,"touch-another",{id:starter().id,contact})),/REVIEW_OR_SINGLE_CONTACT_REQUIRED/);
});
test("due followup can be closed or held; never sends",()=>{
 const s=short();
 const contacted=logManualContact(s,command(s,"touch-001",{id:starter().id,contact})).state;
 const done=resolveFollowup(contacted,command(contacted,"followup-done",
   {id:starter().id,outcome:"DONE",reason:"Operator reports reviewed the next action"})).state;
 const view=sprintQueue(done,"2026-12-03").find(x=>x.id===starter().id);
 assert.equal(view.next,"REVIEW_OUTCOME");
 assert.equal(done.app_messages_sent,0);
 assert.throws(()=>resolveFollowup(done,command(done,"again",
   {id:starter().id,outcome:"DONE",reason:"again"})),/INVALID_FOLLOWUP_OUTCOME/);
});
test("queue prioritizes due followup then shortlist then unreviewed",()=>{
 let s=short();
 s=logManualContact(s,command(s,"touch-001",{id:starter().id,contact})).state;
 s=reviewCandidate(s,command(s,"shortlist-two",
   {id:STARTER_ATLAS[1].id,review:"SHORTLIST",reason:"Check service scope"})).state;
 const q=sprintQueue(s,"2026-12-01");
 assert.equal(q[0].next,"FOLLOWUP_DUE");
 assert.equal(q[1].next,"OWNER_REVIEW_AND_DRAFT");
 assert.ok(q.some(x=>x.next==="RESEARCH_SOURCE"));
});
test("export/import removes unknown fields and no contact addresses leak",()=>{
 let s=short();
 s.candidates[0].hidden_contact_email="secret@example.com";
 s.candidates[0].public.unknown="SECRET_FIELD";
 const e=exportSprint(s);
 assert.equal(e.schema,EXPORT_SCHEMA);
 assert.equal(e.permissions.automatic_outreach,false);
 assert.equal(JSON.stringify(e).includes("secret@example.com"),false);
 assert.equal(JSON.stringify(e).includes("SECRET_FIELD"),false);
 const restored=importSprint(e);
 assert.equal(restored.candidates.length,4);
 assert.equal(restored.candidates[0].review,"SHORTLIST");
 assert.equal(restored.app_messages_sent,0);
});
test("import rejects fabricated accepted partners and dangerous marketing states",()=>{
 const e=exportSprint(populate());
 for(const fn of [
  x=>x.candidates[0].relationship_confirmed=true,
  x=>x.candidates[0].public.source_url="javascript:alert(1)",
  x=>x.permissions.automatic_outreach=true,
  x=>x.candidates[0].review="PARTNER",
  x=>x.candidates[0].manual_contact={email:"secret@example.com"},
  x=>x.candidates[0].public.observation="direct email secret@example.com"
 ]){const c=structuredClone(e);fn(c);assert.throws(()=>importSprint(c));}
});
test("WMS handoff matches private growth-001 draft proposal contract",()=>{
 const packet=toWmsProposal(short(),starter().id);
 assert.equal(packet.schema,"willowlab.growth-review-packet/v1");
 assert.equal(packet.state,"DRAFT_NOT_SENT_NOT_IMPORTED");
 assert.equal(packet.proposal.owner_decision,"UNREQUESTED");
 assert.equal(packet.introduction.state,"DRAFT_NOT_SENT");
 assert.equal(packet.limits.crm_write,false);
 assert.equal(packet.limits.automatic_outreach,false);
 assert.equal(packet.willowconnect_status,"NO_SYNC");
 assert.equal(packet.proposal.candidate.name,starter().name);
 assert.equal(packet.introduction.recipient,null);
});
test("export/import preserves reported followup date without converting it to a provider event",()=>{
 let s=short();
 s=logManualContact(s,command(s,"touch-001",{id:starter().id,contact})).state;
 const round=importSprint(exportSprint(s));
 assert.equal(round.candidates[0].manual_contact.followup_on,"2026-11-30");
 assert.equal(round.candidates[0].manual_contact.evidence,"OPERATOR_SELF_REPORT_UNVERIFIED");
 assert.equal(round.customer_records,0);
 assert.equal(round.app_messages_sent,0);
 assert.equal(sprintQueue(round,"2026-11-30")[0].next,"FOLLOWUP_DUE");
});

test("a manual contact cannot be reclassified into an unreviewed or declined state",()=>{
 let s=short();
 s=logManualContact(s,command(s,"touch-review-lock",{id:starter().id,contact})).state;
 assert.throws(()=>reviewCandidate(s,command(s,"re-review-closed",
   {id:starter().id,review:"DECLINE",reason:"Contradicts prior contact record"})),/INVALID_REVIEW/);
 assert.equal(exportSprint(s).candidates[0].review,"SHORTLIST");
});
test("public source narrative permits line breaks but URLs cannot contain hidden whitespace",()=>{
 const s=newSprint();
 const newline={...starter(),observation:"Leasing and\nproperty management services."};
 const valid=addCandidate(s,command(s,"multiline",{candidate:newline})).state;
 assert.equal(valid.candidates.length,1);
 assert.match(exportSprint(valid).candidates[0].public.observation,/\n/);
 assert.throws(()=>addCandidate(s,command(s,"bad-url",{candidate:{...starter(),source_url:
   "https://www.lloydmanagement.com/\n"}})),/INVALID_PUBLIC_URL/);
});
test("import rejects bad revision, provider permissions and overlong unsupported contact timing",()=>{
 const e=exportSprint(populate());
 for(const mutate of [
  x=>x.generated_from_revision=-1,
  x=>x.generated_from_revision="unknown",
  x=>x.permissions.provider_send=true
 ]){
  const value=structuredClone(e);mutate(value);
  assert.throws(()=>importSprint(value),/INVALID_SPRINT_IMPORT/);
 }
 let s=short();
 s=logManualContact(s,command(s,"touch-date",{id:starter().id,contact})).state;
 const dated=exportSprint(s);
 dated.candidates[0].manual_contact.followup_on="2027-06-01";
 assert.throws(()=>importSprint(dated),/INVALID_SPRINT_IMPORT/);
});
