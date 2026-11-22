import test from "node:test";
import assert from "node:assert/strict";
import {readMementoArtifact,createWorkbenchQuestion,MAX_ARTIFACT_BYTES} from "../memento.mjs";
const context=()=>({
  schema:"memento.context-pack/v0",origin_world:"fictional-a",depth:1,admission:"none",
  worlds:[
    {id:"fictional-a",title:"Fictional World A",status:"specimen",source_cut:"synthetic:one",admission:"none"},
    {id:"fictional-b",title:"Fictional World B",status:"specimen",source_cut:"synthetic:two",admission:"none"}
  ],
  edges:[{id:"fictional-edge",from:"fictional-a",to:"fictional-b",relation:"possible-neighbor",status:"proposed",admission:"none"}],
  notice:"Synthetic test fixture."
});
const ticket=()=>({
  schema:"memento.return-ticket/v1",question:"What happened in this fictional project?",
  owner:"Fixture Owner",observed_at:"2026-11-22T20:00:00Z",coverage:"OBSERVED_BOUNDED",
  admission:"none",sources:[{id:"src-1",locator:"specimen/fictional.md",source_type:"synthetic",status:"OBSERVED",visibility:"private"}],
  claims:[{text:"One fictional step was observed",status:"OBSERVED",source_ids:["src-1"]},
    {text:"A proposed second step remains open",status:"PROPOSED",source_ids:["src-1"]}],
  open_questions:["Is this approach helpful?"],
  next_probe:{action:"Run a fictional test",falsifier:"Test fails clearly",consent:"read_only",status:"PROPOSED"},
  native_execution:"NOT_RUN"
});
test("context pack can be inspected without promotion of retrieved source status",()=>{
  const result=readMementoArtifact(JSON.stringify(context()));
  assert.equal(result.kind,"context-pack");
  assert.equal(result.admission,"none");assert.equal(result.trusted,false);
  assert.equal(result.worlds.length,2);assert.equal(result.edges[0].source_status,"proposed");
  assert.equal(result.edges[0].admission,"none");
  assert.match(createWorkbenchQuestion(result),/fictional-a/);
});
test("an already admitted source edge is still not admitted into this workbench",()=>{
  const raw=context();raw.edges[0].status="admitted";
  const preview=readMementoArtifact(raw);
  assert.equal(preview.edges[0].source_status,"admitted");
  assert.equal(preview.edges[0].admission,"none");
});
test("return ticket retains its actual evidence status rather than upgrading it",()=>{
  const result=readMementoArtifact(ticket());
  assert.equal(result.kind,"return-ticket");
  assert.equal(result.coverage,"OBSERVED_BOUNDED");
  assert.deepEqual(result.claims.map(c=>c.status),["OBSERVED","PROPOSED"]);
  assert.equal(result.sources[0].visibility,"private");
  assert.match(createWorkbenchQuestion(result),/fictional project/);
  assert.equal(result.admission,"none");
});
test("rejects a declared admission at top level or inside descendants",()=>{
  const bad=context();bad.admission="admit";
  assert.throws(()=>readMementoArtifact(bad),{code:"AUTHORITY_BOUNDARY"});
  const badWorld=context();badWorld.worlds[0].admission="admit";
  assert.throws(()=>readMementoArtifact(badWorld),{code:"AUTHORITY_BOUNDARY"});
  const badEdge=context();badEdge.edges[0].admission="admit";
  assert.throws(()=>readMementoArtifact(badEdge),{code:"AUTHORITY_BOUNDARY"});
});
test("rejects unknown worlds, ambiguous relations, and duplicate identifiers",()=>{
  const bad=context();bad.edges[0].to="missing-world";
  assert.throws(()=>readMementoArtifact(bad),{code:"INVALID"});
  const duplicate=context();duplicate.worlds[1].id="fictional-a";
  assert.throws(()=>readMementoArtifact(duplicate),{code:"DUPLICATE"});
  const noOrigin=context();noOrigin.origin_world="missing-world";
  assert.throws(()=>readMementoArtifact(noOrigin),{code:"INVALID"});
  const badStatus=context();badStatus.edges[0].status="refused";
  assert.throws(()=>readMementoArtifact(badStatus),{code:"INVALID"});
});
test("return tickets cannot cite unknown source IDs",()=>{
  const bad=ticket();bad.claims[0].source_ids=["unknown"];
  assert.throws(()=>readMementoArtifact(bad),{code:"INVALID"});
  const badCoverage=ticket();badCoverage.coverage="ASSUMED_COMPLETE";
  assert.throws(()=>readMementoArtifact(badCoverage),{code:"INVALID"});
});
test("only explicitly supported schemas and bounded JSON can enter",()=>{
  assert.throws(()=>readMementoArtifact({schema:"memento.ledger/v0",admission:"none"}),{code:"UNSUPPORTED_SCHEMA"});
  assert.throws(()=>readMementoArtifact("{broken"),{code:"INVALID_JSON"});
  assert.throws(()=>readMementoArtifact(" ".repeat(MAX_ARTIFACT_BYTES+1)),{code:"TOO_LARGE"});
});
test("captured workbench question cannot itself become a MEMENTO fact",()=>{
  const view=readMementoArtifact(context());
  const title=createWorkbenchQuestion(view);
  assert.match(title,/^Investigate/);
  assert.equal(view.admission,"none");
  assert.throws(()=>createWorkbenchQuestion({...view,admission:"admit"}),{code:"INVALID"});
});
