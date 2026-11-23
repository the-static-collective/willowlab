// STATIC WORKBENCH 001 — standalone, in-memory, fictional demonstration.
// No real identity, persistence, permission enforcement, API calls, or deployments.
export const MODULES = Object.freeze(["home","frontier","work","proof","decisions","return","radio","events","research"]);
export const STAGES = Object.freeze(["CAPTURED","PROPOSED","APPROVED","IMPLEMENTED","VERIFIED","AVAILABLE","HELD"]);
export const TRANSITIONS = Object.freeze({
  PROPOSE: {from:"CAPTURED",to:"PROPOSED",actor:"builder"},
  APPROVE: {from:"PROPOSED",to:"APPROVED",actor:"owner"},
  IMPLEMENT: {from:"APPROVED",to:"IMPLEMENTED",actor:"builder"},
  VERIFY: {from:"IMPLEMENTED",to:"VERIFIED",actor:"tester",requiresEvidence:true},
  AUTHORIZE_AVAILABILITY: {from:"VERIFIED",to:"AVAILABLE",actor:"owner",requiresEvidence:true},
  HOLD: {from:["CAPTURED","PROPOSED","APPROVED","IMPLEMENTED","VERIFIED"],to:"HELD",actor:"owner",requiresEvidence:true},
  REOPEN: {from:"HELD",to:"PROPOSED",actor:"owner",requiresEvidence:true}
});
const BASE = ["home","frontier","work","proof","decisions","return"];
const clone = value => JSON.parse(JSON.stringify(value));
const error=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
const home=(id,name,description,special,items)=>({
  id,name,description,modules:[...BASE,...special],items
});
const item=(id,title,status="CAPTURED")=>({id,title,status,evidence:[],history:[]});
export function initialLab(){
  return {schema:"static.workbench-demo/0.1",demo:true,revision:0,
    homes:[
      home("seed","Seed Home","A fictional prototype for organizing a small creative initiative.",[],[item("first-door","Test one useful door")]),
      home("radio","Radio Sandbox","Fictional station workbench; not connected to HUMKIN broadcasting.",["radio"],[item("radio-program","Examine a shared-program transition","PROPOSED")]),
      home("gathering","Community Lab","Fictional participation workbench; not connected to real event systems.",["events"],[item("welcome","Create a first-visitor journey")])
    ],events:[]};
}
export function applyCommand(state,command){
  if(!state || state.schema!=="static.workbench-demo/0.1" || !state.demo)error("INVALID","A demo state is required");
  if(!command || typeof command!=="object")error("INVALID","A command is required");
  const {type,actor,commandId,expectedRevision,homeId,itemId,payload={}}=command;
  if(typeof commandId!=="string" || !commandId.trim())error("INVALID","A command ID is required");
  const fingerprint=JSON.stringify({type,actor,homeId,itemId,payload});
  const duplicate=state.events.find(e=>e.commandId===commandId);
  if(duplicate){
    if(duplicate.fingerprint!==fingerprint)error("CONFLICT","Reused command ID has different contents");
    return {state,receipt:duplicate.receipt,duplicate:true};
  }
  if(expectedRevision!==state.revision)error("STALE_REVISION","The demo state changed. Refresh before trying again.");
  const next=clone(state);
  let subject=null,from=null,to=null;
  if(type==="ADD_HOME"){
    if(actor!=="designer")error("FORBIDDEN","Only the simulated designer role can add a home");
    const id=String(payload.id||"").trim();
    const name=String(payload.name||"").trim();
    const description=String(payload.description||"").trim();
    const special=Array.isArray(payload.specialModules)?payload.specialModules:[];
    if(!/^[a-z0-9-]{3,48}$/.test(id) || name.length<2 || name.length>80 || description.length>220)
      error("INVALID","Use a unique home ID and a name of 2–80 characters");
    if(next.homes.some(h=>h.id===id))error("CONFLICT","That home ID already exists");
    if(special.some(m=>!MODULES.includes(m)))error("INVALID","Unrecognized module");
    next.homes.push(home(id,name,description,[...new Set(special.filter(m=>!BASE.includes(m)))],[]));
    subject=id;to="HOME_CREATED";
  }else if(type==="ADD_ITEM"){
    if(actor!=="builder")error("FORBIDDEN","Only the simulated builder role can add work");
    const h=next.homes.find(h=>h.id===homeId);
    if(!h)error("NOT_FOUND","Unknown home");
    const id=String(payload.id||"").trim(),title=String(payload.title||"").trim();
    if(!/^[a-z0-9-]{3,48}$/.test(id) || title.length<3 || title.length>140)
      error("INVALID","Use an item ID and a title of 3–140 characters");
    if(h.items.some(i=>i.id===id))error("CONFLICT","Work item already exists in this home");
    h.items.push(item(id,title));subject=id;to="CAPTURED";
  }else{
    const rule=TRANSITIONS[type];
    if(!rule)error("UNKNOWN_COMMAND","Unknown demo operation");
    if(rule.actor!==actor)error("FORBIDDEN","The selected simulated role cannot make that transition");
    const h=next.homes.find(h=>h.id===homeId);
    if(!h)error("NOT_FOUND","Unknown home");
    const w=h.items.find(i=>i.id===itemId);
    if(!w)error("NOT_FOUND","Unknown work item");
    if(!(Array.isArray(rule.from)?rule.from:[rule.from]).includes(w.status))
      error("HOLD","This transition cannot follow status "+w.status);
    const evidence=String(payload.evidence||"").trim();
    if(rule.requiresEvidence && evidence.length<8)
      error("EVIDENCE_REQUIRED","Include a meaningful demo evidence reference or reason (8+ characters)");
    from=w.status;w.status=rule.to;to=w.status;subject=w.id;
    if(evidence)w.evidence.push({action:type,reference:evidence,demo:true});
    w.history.push({action:type,actor,from,to,reference:evidence||null,demo:true});
  }
  next.revision++;
  const receipt={schema:"static.workbench-receipt/0.1",id:"DEMO-R-"+String(next.revision).padStart(4,"0"),
    revision:next.revision,applied:true,demo:true,production:false};
  next.events.push({commandId,fingerprint,type,actor,homeId:homeId||subject,itemId:itemId||null,
    subject,from,to,receipt});
  return {state:next,receipt,duplicate:false};
}
export function humanQueue(state){
  return state.homes.flatMap(h=>h.items.flatMap(w=>{
    const nextAction=w.status==="PROPOSED"?"Review proposed work":
      w.status==="VERIFIED"?"Decide whether to make available":
      w.status==="HELD"?"Review the hold":null;
    return nextAction?[{homeId:h.id,home:h.name,itemId:w.id,title:w.title,action:nextAction,status:w.status}]:[];
  }));
}
export function handoff(state,homeId){
  const h=state.homes.find(h=>h.id===homeId);
  if(!h)error("NOT_FOUND","Unknown home");
  return {schema:"static.workbench-handoff/0.1",demo:true,homeId:h.id,home:h.name,
    revision:state.revision,modules:h.modules,
    items:h.items.map(w=>({id:w.id,title:w.title,status:w.status,lastEvidence:w.evidence.at(-1)||null,
      next:w.status==="CAPTURED"?"Builder may propose":
        w.status==="PROPOSED"?"Simulated owner review":
        w.status==="APPROVED"?"Builder may implement":
        w.status==="IMPLEMENTED"?"Tester needs evidence":
        w.status==="VERIFIED"?"Simulated owner availability decision":
        w.status==="AVAILABLE"?"No more demo transitions":"Simulated owner must resolve hold"})),
    latestReceipt:state.events.filter(e=>e.homeId===h.id).at(-1)?.receipt||null,
    caveat:"A fictional in-memory handoff, not verified project status or real permission."};
}
