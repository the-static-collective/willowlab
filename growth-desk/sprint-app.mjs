import {newSprint,loadStarterAtlas,addCandidate,reviewCandidate,planForReview,
  logManualContact,resolveFollowup,sprintQueue,exportSprint,importSprint,
  toWmsProposal} from "./sprint.mjs";

const $=selector=>document.querySelector(selector);
const key="willowlab:partner-sprint:v1";
const addText=(tag,content)=>{const e=document.createElement(tag);e.textContent=String(content??"");return e;};
const setStatus=(selector,text)=>{$(selector).textContent=text;};
const nowLocal=()=>{const d=new Date(),x=new Date(d.getTime()-d.getTimezoneOffset()*60000);
  return x.toISOString().slice(0,10);};
const plusDays=(days)=>{const d=new Date(nowLocal()+"T12:00:00");
  d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);};
let state=newSprint(),selectedId=null,lastDraft=null,storageAvailable=true;
try{
  const saved=localStorage.getItem(key);
  if(saved)state=importSprint(JSON.parse(saved));
}catch{
  storageAvailable=false;
}
$("#candidate-checked").value=nowLocal();
$("#contact-date").value=nowLocal();
$("#followup-date").value=plusDays(7);
let initialStatus=storageAvailable?
  "Ready. Public-source prospect notes are saved in this browser only.":
  "Browser storage is unavailable or unreadable. You can still work in memory and export your board.";

function notify(message){setStatus("#board-status",message);}
function persist(){
  try {
    localStorage.setItem(key,JSON.stringify(exportSprint(state)));
    storageAvailable=true;
    return true;
  }catch{
    storageAvailable=false;
    return false;
  }
}
function download(data,filename){
  const payload=JSON.stringify(data,null,2),blob=new Blob([payload],{type:"application/json"}),
    url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function copyText(text,status){
  if(!text){setStatus(status,"Nothing to copy. Draft a note first.");return;}
  try{
    await navigator.clipboard.writeText(text);
    setStatus(status,"Copied the draft. Nothing was sent.");
  }catch{
    setStatus(status,"Clipboard unavailable. Select the visible draft and copy it manually.");
  }
}
const getSelected=()=>state.candidates.find(x=>x.public.id===selectedId)||null;
const label={
  RESEARCH_SOURCE:"Inspect source",OWNER_REVIEW_AND_DRAFT:"Owner review + draft",
  FOLLOWUP_DUE:"Follow-up due",FOLLOWUP_SCHEDULED:"Follow-up scheduled",
  REVIEW_OUTCOME:"Review outcome",HELD:"Held",CLOSED:"Closed"
};
function addDetail(label,value,container){
  const p=document.createElement("p");
  p.append(addText("strong",label+": "),document.createTextNode(String(value??"")));
  container.append(p);
}
function renderSelected(){
  const entry=getSelected(),root=$("#selected-view");
  root.replaceChildren();
  for (const selector of ["#save-decision","#draft-next","#export-packet","#log-contact","#resolve-followup"]){
    $(selector).disabled=!entry;
  }
  if(!entry){
    root.append(addText("p","Select a public-source business to review."));
    setStatus("#selected-stage","NOT SELECTED");
    setStatus("#followup-overview","No business selected.");
    return;
  }
  const c=entry.public;
  root.append(addText("h3",c.name));
  addDetail("Region",c.region,root);
  addDetail("Observed from source",c.observation,root);
  addDetail("Possible fit (not verified)",c.hypothesis,root);
  addDetail("Question to resolve",c.open_question,root);
  addDetail("Local review",entry.review||"UNREVIEWED",root);
  if(entry.review_reason)addDetail("Reason",entry.review_reason,root);
  if(entry.manual_contact){
    addDetail("Contact record","Operator self-reported "+entry.manual_contact.channel+
      " on "+entry.manual_contact.occurred_on+". No provider confirmation.",root);
  }
  const a=document.createElement("a");a.href=c.source_url;
  a.rel="noopener noreferrer";a.target="_blank";
  a.textContent="Open public source (checked "+c.checked_on+")";
  const link=document.createElement("p");link.className="source-time";link.append(a);root.append(link);
  setStatus("#selected-stage","RESEARCH · "+(entry.review||"UNREVIEWED"));
  if(entry.manual_contact){
    setStatus("#followup-overview","An operator reported manual contact on "+
      entry.manual_contact.occurred_on+". Follow-up date: "+
      entry.manual_contact.followup_on+". Status: "+entry.followup_state+
      ". This does not confirm delivery, consent or a business relationship.");
  }else{
    setStatus("#followup-overview","No manually reported contact. Start with source review and an owner-approved introduction.");
  }
  $("#resolve-followup").disabled=!(entry.manual_contact&&entry.followup_state==="OPEN");
  $("#log-contact").disabled=!!entry.manual_contact||entry.review!=="SHORTLIST";
}
function renderQueue(){
  const today=nowLocal(),q=sprintQueue(state,today),
    filter=$("#queue-filter").value,
    visible=q.filter(x=>filter==="all"||
      filter==="due"&&x.next==="FOLLOWUP_DUE"||
      filter==="shortlist"&&x.next==="OWNER_REVIEW_AND_DRAFT"||
      filter==="unreviewed"&&x.next==="RESEARCH_SOURCE"||
      filter==="closed"&&["CLOSED","HELD"].includes(x.next));
  setStatus("#metric-total",String(q.length));
  setStatus("#metric-review",String(state.candidates.filter(x=>x.review==="SHORTLIST").length));
  setStatus("#metric-due",String(q.filter(x=>x.next==="FOLLOWUP_DUE").length));
  const list=$("#queue-list");list.replaceChildren();
  if(!visible.length){
    list.append(addText("p","No candidates in this filter. Load starter research or add a public business."));
  }
  for(const candidate of visible){
    const b=document.createElement("button");b.className="sprint-item";b.type="button";
    b.setAttribute("aria-current",String(candidate.id===selectedId));
    b.append(addText("strong",candidate.name),
      addText("span",candidate.region),
      addText("span",label[candidate.next]||candidate.next));
    b.lastChild.className="action-label";
    if(candidate.followup_on)b.append(addText("span","Review date: "+candidate.followup_on));
    b.addEventListener("click",()=>{
      selectedId=candidate.id;lastDraft=null;
      $("#draft-output").value="";
      $("#decision-reason").value="";
      setStatus("#draft-status","No draft generated for this selection.");
      render();
    });
    list.append(b);
  }
}
function render(){
  if(selectedId&&!getSelected())selectedId=null;
  renderQueue();renderSelected();
}
function changed(message){
  const ok=persist();
  render();
  notify(message+(ok?" Saved only in this browser.":" Browser saving unavailable; export the board."));
}
function execute(action,message){
  try{
    const output=action();
    state=output.state;
    changed(message+(output.duplicate?" Original event replayed.":""));
  }catch(error){
    notify("No change: "+error.message);
  }
}
$("#queue-filter").addEventListener("change",renderQueue);
$("#load-starters").addEventListener("click",()=>{
  execute(()=>{
    const x=loadStarterAtlas(state);
    if(!selectedId&&x.added)selectedId=x.state.candidates[0].public.id;
    return x;
  },"Sourced research added. These organizations are not Willow partners.");
});
$("#new-prospect").addEventListener("submit",event=>{
  event.preventDefault();
  const name=$("#candidate-name").value.trim(),
    normalized=name.toLowerCase().normalize("NFKD")
      .replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48);
  if(!normalized){notify("Business name cannot form a valid research ID.");return;}
  const candidate={
    id:normalized+"-"+crypto.randomUUID().slice(0,8),
    name,region:$("#candidate-region").value,category:$("#candidate-type").value,
    source_url:$("#candidate-url").value,checked_on:$("#candidate-checked").value,
    observation:$("#candidate-observation").value,hypothesis:$("#candidate-fit").value,
    open_question:$("#candidate-question").value
  };
  execute(()=>{
    const result=addCandidate(state,{
      command_id:"added-"+candidate.id,expected_revision:state.revision,candidate
    });selectedId=candidate.id;
    return result;
  },"Public business research added; no contact or partner relationship exists.");
  if(getSelected()&&getSelected().public.id===candidate.id){
    event.target.reset();$("#candidate-checked").value=nowLocal();
  }
});
$("#save-decision").addEventListener("click",()=>{
  if(!selectedId){notify("Choose a candidate first.");return;}
  const c={command_id:crypto.randomUUID(),expected_revision:state.revision,
    id:selectedId,review:$("#decision").value,reason:$("#decision-reason").value};
  execute(()=>reviewCandidate(state,c),"Local research review recorded; no owner authorization inferred.");
  setStatus("#decision-status","Research note saved locally. Colton still decides whether to proceed.");
});
$("#draft-next").addEventListener("click",()=>{
  if(!selectedId){setStatus("#draft-status","Choose a candidate first.");return;}
  try{
    const x=planForReview(state,selectedId);
    lastDraft=x.draft;
    $("#draft-output").value="SUBJECT: "+x.draft.subject+"\n\n"+x.draft.body;
    setStatus("#draft-status","An unsent one-to-one draft is ready for human review. No recipient or message was sent.");
  }catch(error){
    setStatus("#draft-status","Could not draft: "+error.message);
  }
});
$("#copy-next").addEventListener("click",()=>copyText($("#draft-output").value,"#draft-status"));
$("#export-packet").addEventListener("click",()=>{
  if(!selectedId){setStatus("#draft-status","Choose a candidate first.");return;}
  try{
    download(toWmsProposal(state,selectedId),"willow-owner-review-"+selectedId+".json");
    setStatus("#draft-status","Owner-review packet exported locally. This is not a WillowConnect import or approval.");
  }catch(error){setStatus("#draft-status","Could not export: "+error.message);}
});
$("#log-contact").addEventListener("click",()=>{
  if(!selectedId){notify("Choose a candidate first.");return;}
  const contact={
    i_personally_sent_outside_app:$("#manual-attestation").checked,
    owner_approval_attested:$("#owner-attestation").checked,
    channel:$("#contact-channel").value,occurred_on:$("#contact-date").value,
    followup_on:$("#followup-date").value,note:$("#contact-note").value
  };
  const command={command_id:crypto.randomUUID(),expected_revision:state.revision,
    id:selectedId,contact};
  execute(()=>logManualContact(state,command),
    "Operator-reported manual contact logged with follow-up date. No provider record was verified.");
  if(getSelected()?.manual_contact){
    $("#manual-attestation").checked=false;
    $("#owner-attestation").checked=false;
    $("#contact-note").value="";
    setStatus("#contact-status","Saved as self-reported external contact. This app still sent zero messages.");
  }else {
    setStatus("#contact-status","Contact not logged. Requires a prior SHORTLIST, Colton approval attestation and personal sending attestation.");
  }
});
$("#resolve-followup").addEventListener("click",()=>{
  if(!selectedId){notify("Choose a candidate first.");return;}
  const c={command_id:crypto.randomUUID(),expected_revision:state.revision,
    id:selectedId,outcome:$("#followup-outcome").value,reason:$("#followup-reason").value};
  execute(()=>resolveFollowup(state,c),"Operator follow-up outcome recorded. No automatic communication.");
  setStatus("#followup-status",getSelected()?.followup_state==="OPEN"?
    "Follow-up remains open.":"Operator follow-up note saved locally; not verified by a provider.");
});
$("#export-board").addEventListener("click",()=>{
  try{
    download(exportSprint(state),"willow-partner-sprint-"+nowLocal()+".json");
    notify("Portable local research board exported. No customer information or provider receipts.");
  }catch(error){notify("Export refused: "+error.message);}
});
$("#import-board").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(file.size>250000)throw Error("FILE_TOO_LARGE");
    const raw=JSON.parse(await file.text());
    const next=importSprint(raw);
    if(!confirm("Replace the current local research board with this validated file?"))return;
    state=next;selectedId=next.candidates[0]?.public.id||null;
    changed("Validated public-business research file imported. No private customer data or contact list.");
  }catch(error){notify("Import rejected: "+error.message);}
  finally{event.target.value="";}
});
$("#clear-board").addEventListener("click",()=>{
  if(!confirm("Clear this browser's Willow research board? Export it first if you want a copy."))return;
  state=newSprint();selectedId=null;lastDraft=null;
  $("#draft-output").value="";
  try{localStorage.removeItem(key);}catch{storageAvailable=false;}
  render();notify("Local board cleared. No WillowConnect or external records were affected.");
});
render();notify(initialStatus);
