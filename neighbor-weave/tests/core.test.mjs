import test from "node:test";
import assert from "node:assert/strict";
import {readPublicGarden,crossingDraft,FICTIONAL_DEMO} from "../core.mjs";
const altered=(fn)=>{const x=structuredClone(FICTIONAL_DEMO);fn(x);return x};
test("synthetic discovery projects a scoped, nonauthoritative local view",()=>{
 const view=readPublicGarden(FICTIONAL_DEMO);
 assert.equal(view.status,"LOCAL_ONLY_NOT_SAVED_NOT_SENT");
 assert.equal(view.cards.length,1);
 assert.equal(view.cards[0].stage,"DISCOVERED");
 assert.equal(view.cards[0].contact,"NONE");
 assert.equal(view.cards[0].owner_permission,"NOT_AUTHORIZED");
});
test("unexpected customer or contact fields never escape the projection",()=>{
 const view=readPublicGarden(altered(x=>{
   x.customer_records=[{name:"SECRET"}];x.leads[0].contact_email="secret@example.com";
   x.leads[0].source.credentials="DO NOT EXPORT";
 }));
 const text=JSON.stringify(view);
 for(const privateValue of ["SECRET","secret@example.com","DO NOT EXPORT"])assert.equal(text.includes(privateValue),false);
});
test("an unsent prospect cannot be falsely promoted to a relationship",()=>{
 for(const mutation of [
 x=>x.leads[0].stage="INTRODUCED", x=>x.leads[0].stage="COLLABORATING",
 x=>x.leads[0].partner_confirmed=true,
 x=>x.leads[0].introduction_evidence={date:"2026-11-23"},
 x=>x.actions_taken.outreach_sent=true,
 x=>x.actions_taken.crm_imports=1
 ]) assert.throws(()=>readPublicGarden(altered(mutation)),/INVALID_PUBLIC_RESEARCH_SPECIMEN/);
});
test("non-public schemas, unsafe URLs and oversized gardens reject",()=>{
 for(const change of [
 x=>x.schema="wms-private-records/v1",
 x=>x.leads[0].source.url="http://example.org/private",
 x=>x.leads[0].source.url="https://user:secret@example.org",
 x=>x.leads[0].id="../../customer",
 x=>x.leads.push(...[structuredClone(x.leads[0]),structuredClone(x.leads[0]),structuredClone(x.leads[0])])
 ])assert.throws(()=>readPublicGarden(altered(change)),/INVALID_PUBLIC_RESEARCH_SPECIMEN/);
});
test("crossing export remains review-only and contains no contact action",()=>{
 const view=readPublicGarden(FICTIONAL_DEMO);
 const draft=crossingDraft(view.cards[0]);
 assert.equal(draft.state,"DRAFT_NOT_SAVED_NOT_SENT");
 assert.equal(draft.owner_decision,"UNREQUESTED");
 assert.equal(draft.permissions.crm_write,false);
 assert.equal(draft.permissions.outreach,false);
 assert.equal(draft.candidate.source.url,"https://example.org/example-property-care");
 assert.throws(()=>crossingDraft({...view.cards[0],stage:"REVIEWED"}));
});
