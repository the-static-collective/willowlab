import test from "node:test";
import assert from "node:assert/strict";
import {initialLab,applyCommand,humanQueue,handoff,TRANSITIONS} from "../core.mjs";
const c=(s,type,homeId="seed",itemId="first-door",payload={},actor=TRANSITIONS[type]?.actor||"builder",commandId="id-"+s.revision)=>
  ({type,actor,homeId,itemId,payload,commandId,expectedRevision:s.revision});
const move=(s,type,evidence="")=>applyCommand(s,c(s,type,"seed","first-door",evidence?{evidence}:{})).state;
test("fixture is explicitly demo and independent per home",()=>{
  const s=initialLab();assert.equal(s.demo,true);assert.equal(s.homes.length,3);
  assert.equal(s.homes[0].items[0].status,"CAPTURED");
  assert.equal(s.homes[1].items[0].status,"PROPOSED");
});
test("owner gate, builder work, tester evidence, owner availability are separate",()=>{
  let s=initialLab();
  s=move(s,"PROPOSE");
  assert.equal(humanQueue(s)[0].action,"Review proposed work");
  assert.throws(()=>applyCommand(s,c(s,"APPROVE","seed","first-door",{},"builder")),{code:"FORBIDDEN"});
  s=move(s,"APPROVE");s=move(s,"IMPLEMENT");
  assert.throws(()=>move(s,"VERIFY"),{code:"EVIDENCE_REQUIRED"});
  s=move(s,"VERIFY","LOCAL-TEST-0001");
  assert.equal(s.homes[0].items[0].status,"VERIFIED");
  assert.throws(()=>move(s,"AUTHORIZE_AVAILABILITY"),{code:"EVIDENCE_REQUIRED"});
  s=move(s,"AUTHORIZE_AVAILABILITY","OWNER-DEMO-APPROVAL");
  assert.equal(s.homes[0].items[0].status,"AVAILABLE");
  assert.equal(s.events.length,5);
  assert.equal(s.events.at(-1).receipt.production,false);
  assert.equal(s.homes[1].items[0].status,"PROPOSED");
});
test("same command exact replay is a no-op and changed payload conflicts",()=>{
  const s=initialLab(),command=c(s,"PROPOSE","seed","first-door",{},"builder","same");
  const a=applyCommand(s,command),b=applyCommand(a.state,command);
  assert.equal(b.duplicate,true);assert.strictEqual(b.state,a.state);
  assert.deepEqual(b.receipt,a.receipt);
  assert.throws(()=>applyCommand(a.state,{...command,payload:{x:1}}),{code:"CONFLICT"});
});
test("stale revision cannot mutate",()=>{
  const s=move(initialLab(),"PROPOSE");
  assert.throws(()=>applyCommand(s,{...c(s,"APPROVE"),expectedRevision:0}),{code:"STALE_REVISION"});
});
test("cannot skip implementation, verification, or owner gates",()=>{
  const s=initialLab();
  assert.throws(()=>move(s,"VERIFY","TEST-123456"),{code:"HOLD"});
  assert.throws(()=>move(s,"AUTHORIZE_AVAILABILITY","OWNER-123456"),{code:"HOLD"});
  assert.throws(()=>move(s,"APPROVE"),{code:"HOLD"});
});
test("hold requires explanation; reopen does not erase history",()=>{
  let s=initialLab();
  assert.throws(()=>move(s,"HOLD"),{code:"EVIDENCE_REQUIRED"});
  s=move(s,"HOLD","Waiting for safe scope");
  s=move(s,"REOPEN","Reviewed scope again");
  assert.equal(s.homes[0].items[0].status,"PROPOSED");
  assert.deepEqual(s.homes[0].items[0].history.map(e=>e.action),["HOLD","REOPEN"]);
});
test("designer can add modular home; builder adds its own item",()=>{
  let s=initialLab();
  s=applyCommand(s,{type:"ADD_HOME",actor:"designer",commandId:"new-home",expectedRevision:0,
    payload:{id:"little-garden",name:"Little Garden",description:"Fictional workshop",specialModules:["research"]}}).state;
  assert.ok(s.homes.at(-1).modules.includes("research"));
  assert.ok(!s.homes[0].modules.includes("research"));
  s=applyCommand(s,c(s,"ADD_ITEM","little-garden",null,{id:"test-seed",title:"Try a small seed"},"builder")).state;
  assert.equal(s.homes.at(-1).items[0].status,"CAPTURED");
  assert.equal(s.events.length,2);
});
test("reject unknown modules, duplicate homes and duplicate work IDs",()=>{
  let s=initialLab();
  assert.throws(()=>applyCommand(s,{type:"ADD_HOME",actor:"designer",commandId:"bad",expectedRevision:0,
    payload:{id:"new-site",name:"A Site",specialModules:["admin-superpower"]}}),{code:"INVALID"});
  assert.throws(()=>applyCommand(s,{type:"ADD_HOME",actor:"designer",commandId:"bad2",expectedRevision:0,
    payload:{id:"seed",name:"Duplicate"}}),{code:"CONFLICT"});
  assert.throws(()=>applyCommand(s,c(s,"ADD_ITEM","seed",null,{id:"first-door",title:"Duplicate"},"builder")),{code:"CONFLICT"});
});
test("handoff is scoped to one home, not a merged world",()=>{
  const s=initialLab(),h=handoff(s,"radio");
  assert.equal(h.home,"Radio Sandbox");assert.equal(h.items.length,1);
  assert.equal(h.items[0].status,"PROPOSED");
  assert.ok(!JSON.stringify(h).includes("Community Lab"));
  assert.equal(h.latestReceipt,null);
  assert.equal(h.demo,true);
});
