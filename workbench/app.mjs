import {initialLab,applyCommand,TRANSITIONS,humanQueue,handoff} from "./core.mjs";
let state=initialLab(), selectedHome="seed", selectedItem="first-door", commandNumber=0;
const byId=id=>document.getElementById(id);
const el=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
};
const statusNames={CAPTURED:"Captured",PROPOSED:"Proposed",APPROVED:"Approved",IMPLEMENTED:"Implemented",
  VERIFIED:"Verified",AVAILABLE:"Available in demo",HELD:"Held"};
const actions={PROPOSE:"Simulate a proposal",APPROVE:"Simulate owner approval",
  IMPLEMENT:"Simulate implementation",VERIFY:"Simulate tester verification",
  AUTHORIZE_AVAILABILITY:"Simulate owner availability decision",HOLD:"Put on hold",REOPEN:"Reopen for review"};
function slug(text){
  const base=String(text).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,36);
  return base.length>=3?base:"new-home";
}
function freshId(existing,preferred){
  let result=preferred,n=2;
  while(existing.includes(result)){result=preferred+"-"+n;n++;}
  return result;
}
function notice(message,isError=false){
  const area=byId("notice");area.textContent=message;area.classList.toggle("error",isError);
}
function command(type,actor,homeId,itemId,payload){
  return {type,actor,homeId,itemId,payload,commandId:"local-"+(++commandNumber),expectedRevision:state.revision};
}
function run(cmd){
  try{
    const result=applyCommand(state,cmd);
    state=result.state;
    notice(result.duplicate?"Exact replay: no new event.":"Local demo receipt "+result.receipt.id+" created.");
    render();
  }catch(e){notice((e.code||"ERROR")+": "+e.message,true);}
}
function home(){return state.homes.find(h=>h.id===selectedHome);}
function work(){return home()?.items.find(w=>w.id===selectedItem);}
function render(){
  const selected=home();
  if(!selected){selectedHome=state.homes[0].id;return render();}
  if(!selected.items.some(i=>i.id===selectedItem))selectedItem=selected.items[0]?.id||null;
  byId("home-title").textContent=selected.name;
  byId("home-description").textContent=selected.description||"An independent fictional home. Add a work item below.";
  const tabs=byId("home-tabs");tabs.replaceChildren();
  for(const h of state.homes){
    const button=el("button","home-tab"+(h.id===selectedHome?" active":""),h.name);
    button.type="button";button.setAttribute("aria-pressed",String(h.id===selectedHome));
    button.addEventListener("click",()=>{selectedHome=h.id;selectedItem=h.items[0]?.id||null;render();});
    const count=el("span","home-count",h.items.length+" work");
    button.append(count);tabs.append(button);
  }
  const modules=byId("module-list");modules.replaceChildren();
  for(const mod of selected.modules){modules.append(el("span","module",mod));}
  const list=byId("item-list");list.replaceChildren();
  if(selected.items.length===0)list.append(el("p","empty","No work captured. Add the first small experiment."));
  for(const w of selected.items){
    const button=el("button","item"+(w.id===selectedItem?" active":""));
    button.type="button";button.setAttribute("aria-pressed",String(w.id===selectedItem));
    button.append(el("span","item-title",w.title),el("span","state state-"+w.status.toLowerCase(),statusNames[w.status]));
    button.addEventListener("click",()=>{selectedItem=w.id;render();});
    list.append(button);
  }
  renderInspector();renderQueue();renderEvents();
  byId("return-packet").textContent=JSON.stringify(handoff(state,selectedHome),null,2);
}
function renderInspector(){
  const host=byId("item-inspector");host.replaceChildren();
  const w=work();
  if(!w){host.append(el("p","empty","Select or capture an item to explore its lifecycle."));return;}
  host.append(el("h3","inspector-title",w.title));
  const summary=el("p","support-copy","Status: "+statusNames[w.status]+". All roles and approvals are fictional; no real permission is granted.");
  host.append(summary);
  const evidence=el("input","evidence-entry");
  evidence.type="text";evidence.placeholder="Evidence reference or reason (when required)";
  evidence.setAttribute("aria-label","Fictional evidence reference or reason");
  evidence.maxLength=200;
  host.append(evidence);
  const actionsWrap=el("div","action-row");
  for(const [type,rule] of Object.entries(TRANSITIONS)){
    if(!(Array.isArray(rule.from)?rule.from:[rule.from]).includes(w.status))continue;
    const button=el("button","button "+(rule.actor==="owner"?"accent":"dark"),actions[type]);
    button.type="button";
    button.addEventListener("click",()=>{
      const payload=rule.requiresEvidence?{evidence:evidence.value}:{};
      run(command(type,rule.actor,selectedHome,w.id,payload));
    });
    actionsWrap.append(button);
  }
  host.append(actionsWrap);
  const roleNote=el("p","role-note","Labels identify simulated actors: builder, owner, tester. This is not authentication, deployment, or official approval.");
  host.append(roleNote);
  if(w.evidence.length){
    const proof=el("ul","evidence-list");
    for(const e of w.evidence){proof.append(el("li","",e.action+" · "+e.reference));}
    host.append(el("h4","proof-label","Attached demo evidence references"),proof);
  }
}
function renderQueue(){
  const host=byId("human-queue");host.replaceChildren();
  const queue=humanQueue(state);
  if(!queue.length){host.append(el("p","empty","No demo decisions awaiting review."));return;}
  for(const task of queue){
    const row=el("button","queue-item");
    row.type="button";row.append(el("strong","",task.title),el("small","",task.home+" · "+task.action));
    row.addEventListener("click",()=>{selectedHome=task.homeId;selectedItem=task.itemId;render();byId("item-inspector").scrollIntoView({block:"nearest",behavior:"smooth"});});
    host.append(row);
  }
}
function renderEvents(){
  const host=byId("event-log");host.replaceChildren();
  if(!state.events.length){host.append(el("p","empty","The event trail begins after a demo action."));return;}
  for(const event of [...state.events].reverse().slice(0,8)){
    const box=el("div","event");
    box.append(el("span","event-id",event.receipt.id),el("strong","",event.type.replace(/_/g," ")));
    box.append(el("small","",event.actor+" · "+event.homeId+(event.to?" · "+event.to:"")));
    host.append(box);
  }
}
byId("home-form").addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget,fd=new FormData(form),name=String(fd.get("name")||"").trim();
  const id=freshId(state.homes.map(h=>h.id),slug(name));
  const special=String(fd.get("special")||"");
  run(command("ADD_HOME","designer",null,null,{id,name,description:String(fd.get("description")||"").trim(),
    specialModules:special?[special]:[]}));
  if(state.homes.some(h=>h.id===id)){selectedHome=id;selectedItem=null;form.reset();byId("new-home").open=false;render();}
});
byId("work-form").addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget,fd=new FormData(form),title=String(fd.get("title")||"").trim();
  const id=freshId(home().items.map(i=>i.id),slug(title));
  run(command("ADD_ITEM","builder",selectedHome,null,{id,title}));
  if(home().items.some(i=>i.id===id)){selectedItem=id;form.reset();render();}
});
byId("copy-packet").addEventListener("click",async()=>{
  try{
    await navigator.clipboard.writeText(byId("return-packet").textContent);
    notice("Fictional return packet copied. No remote upload.");
  }catch(_){notice("Clipboard not available here. Select the return packet text to copy.",true);}
});
byId("reset").addEventListener("click",()=>{
  state=initialLab();selectedHome="seed";selectedItem="first-door";commandNumber=0;
  render();notice("Demo reset. No remote state was changed.");
});
render();
