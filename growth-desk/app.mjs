import {FICTIONAL_DEMO} from "../neighbor-weave/core.mjs";
import {createDesk,reviewLead,makeIntroduction,composeWillowNote,dryRunCorrespondence,
  makeReviewPacket,NOTE_SCHEMA,GATE_SCHEMA} from "./core.mjs";

const $=selector=>document.querySelector(selector);
const node=(tag,value)=>{const element=document.createElement(tag);element.textContent=String(value??"");return element;};
let desk=createDesk(FICTIONAL_DEMO);
let selectedId=desk.leads[0]?.card.id||null;
let introduction=null,publications=null,visibleFormat="email";
const updateStatus=(id,value)=>{$(id).textContent=value;};
function selected(){return desk.leads.find(x=>x.card.id===selectedId)||null;}
function showLead(){
  const entry=selected(),detail=$("#candidate-detail");
  detail.replaceChildren();
  if(!entry){detail.append(node("p","No source-linked research candidate selected."));return;}
  const card=entry.card;
  for(const [label,text] of [
    ["Source observation",card.source.observed],
    ["Potential neighbor benefit",card.two_way.to_neighbor],
    ["Potential Willow benefit",card.two_way.to_willow],
    ["Questions",card.uncertainties.join("; ")],
    ["Local review",entry.review+(entry.reason?" — "+entry.reason:"")]
  ]){
    const p=document.createElement("p"),strong=node("strong",label+": ");
    p.append(strong,document.createTextNode(text));detail.append(p);
  }
  const link=document.createElement("a");link.href=card.source.url;
  link.target="_blank";link.rel="noopener noreferrer";
  link.textContent="Public source (checked "+card.source.checked_on+")";
  detail.append(link);
  $("#lead-stage").textContent=card.stage;
}
function renderLeads(){
  const list=$("#candidate-list");list.replaceChildren();
  for(const entry of desk.leads){
    const card=entry.card,button=document.createElement("button");
    button.type="button";button.className="candidate"+(card.id===selectedId?" active":"");
    const a=node("strong",card.name),b=node("span",card.region+" · "+card.type);
    const c=node("span","Local note: "+entry.review+" · source-only, no introduction");
    button.append(a,b,c);
    button.addEventListener("click",()=>{
      selectedId=card.id;introduction=null;$("#intro-preview").value="";
      updateStatus("#intro-status","No message drafted for this candidate.");
      renderLeads();
    });
    list.append(button);
  }
  $("#lead-count").textContent=String(desk.leads.length);
  $("#review-count").textContent=String(desk.leads.filter(x=>x.review!=="UNREVIEWED").length);
  showLead();
}
function installGarden(raw){
  const fresh=createDesk(raw);desk=fresh;
  selectedId=desk.leads[0]?.card.id??null;
  introduction=null;$("#intro-preview").value="";
  updateStatus("#review-status","A new local research specimen was loaded. No business relationship is confirmed.");
  updateStatus("#intro-status","Nothing sent. Choose a candidate and draft an introduction.");
  renderLeads();
}
$("#garden-file").addEventListener("change",async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try {
    if(file.size>65536)throw Error("TOO_LARGE");
    installGarden(JSON.parse(await file.text()));
  } catch {
    updateStatus("#review-status","File rejected. Only small, public-source STATIC SEED Neighbor Garden specimens are supported.");
  } finally {event.target.value="";}
});
$("#reset-demo").addEventListener("click",()=>installGarden(FICTIONAL_DEMO));
$("#record-review").addEventListener("click",()=>{
  const entry=selected(),reason=$("#review-reason").value.trim();
  if(!entry)return;
  if(!reason){updateStatus("#review-status","Explain the evidence or open question before recording a review.");return;}
  try {
    const result=reviewLead(desk,{
      command_id:crypto.randomUUID(),lead_id:entry.card.id,
      action:$("#review-decision").value,reason,expected_revision:desk.revision
    });
    desk=result.desk;
    renderLeads();
    updateStatus("#review-status","Local simulated receipt "+desk.events.at(-1).receipt+" recorded; no owner authorization or CRM sync.");
  } catch(error) {
    updateStatus("#review-status","Review not recorded: "+error.message);
  }
});
function introOffer(){return {service:$("#intro-service").value,
  value_to_neighbor:$("#intro-value").value,question:$("#intro-question").value};}
function draftIntro(){
  const entry=selected();if(!entry)throw Error("Choose a candidate first.");
  const x=makeIntroduction(entry.card,introOffer());
  introduction=x;
  $("#intro-preview").value="SUBJECT: "+x.subject+"\n\n"+x.body;
  updateStatus("#intro-status","Prepared locally. No contact selected, consent inferred, or message sent.");
  return x;
}
$("#make-intro").addEventListener("click",()=>{
  try{draftIntro();}catch(error){updateStatus("#intro-status","Could not draft: "+error.message);}
});
async function copyText(text,statusSelector){
  if(!text){updateStatus(statusSelector,"Nothing to copy yet.");return;}
  try {
    await navigator.clipboard.writeText(text);
    updateStatus(statusSelector,"Copied to clipboard. Still not sent or approved.");
  } catch {
    updateStatus(statusSelector,"Clipboard unavailable; select and copy the visible draft manually.");
  }
}
$("#copy-intro").addEventListener("click",()=>copyText($("#intro-preview").value,"#intro-status"));
function downloadJson(data,filename){
  const dataString=JSON.stringify(data,null,2),blob=new Blob([dataString],{type:"application/json"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$("#export-review").addEventListener("click",()=>{
  try {
    const entry=selected();if(!entry)throw Error("Choose a candidate.");
    // Export is explicitly a proposal, never a WillowConnect command or import.
    const packet=makeReviewPacket(desk,entry.card.id,introOffer());
    downloadJson(packet,"willow-growth-review-"+entry.card.id+".json");
    updateStatus("#intro-status","DRAFT review packet saved to your device. Not transmitted or imported.");
  } catch(error){updateStatus("#intro-status","Could not export: "+error.message);}
});
function todayLocal(){
  const now=new Date(),local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,10);
}
$("#note-week").value=todayLocal();
function note(){
  return {schema:NOTE_SCHEMA,week_of:$("#note-week").value,
    service:$("#note-service").value,observation:$("#note-observation").value,
    tip:$("#note-tip").value,availability:$("#note-availability").value,
    availability_status:$("#availability-status").value,
    owner_checked:$("#note-checked").checked,action_url:$("#note-url").value};
}
function renderPublication(){
  $("#publication-preview").value=publications?.variants?.[visibleFormat]??"";
  for(const button of document.querySelectorAll("[data-format]")){
    button.classList.toggle("selected",button.dataset.format===visibleFormat);
    button.setAttribute("aria-pressed",String(button.dataset.format===visibleFormat));
  }
  updateStatus("#publication-disclosure",publications?.disclosure||
    "Drafting is separate from publishing, provider authorization or customer booking.");
}
$("#compose-update").addEventListener("click",()=>{
  try {
    publications=composeWillowNote(note());
    renderPublication();
    updateStatus("#note-status",publications.status+
      " · All publication decisions remain with Willow's owner.");
  } catch(error) {
    publications=null;renderPublication();
    updateStatus("#note-status","Could not compose: "+error.message);
  }
});
for(const button of document.querySelectorAll("[data-format]")){
  button.addEventListener("click",()=>{visibleFormat=button.dataset.format;renderPublication();});
}
$("#copy-publication").addEventListener("click",()=>copyText($("#publication-preview").value,"#publication-disclosure"));
$("#read-catalog").addEventListener("click",async()=>{
  const list=$("#catalog-results");
  list.replaceChildren();updateStatus("#catalog-status","Checking the optional approved same-origin read-only endpoint…");
  try {
    const response=await fetch("/api/willow-catalog",{method:"GET",credentials:"omit",cache:"no-store"});
    if(!response.ok||!response.headers.get("content-type")?.includes("application/json"))
      throw Error("Bridge disabled or unavailable.");
    const data=await response.json();
    if(data.ok!==true||data.schema!=="willowlab.catalog-read/1"||
      !Number.isSafeInteger(data.revision)||!Array.isArray(data.records)||data.records.length>200)
      throw Error("Unexpected or unavailable public catalog.");
    for(const item of data.records){
      if(typeof item.name!=="string"||typeof item.id!=="string")throw Error("Malformed service entry.");
    }
    for(const item of data.records){
      const li=document.createElement("li"),button=node("button",item.name+" ("+item.id+")");
      button.type="button";
      button.addEventListener("click",()=>{
        $("#note-service").value=item.name;
        $("#intro-service").value=item.name;
        updateStatus("#catalog-status","Selected public service "+item.id+
          " from revision "+data.revision+". Verify offering and scope before using.");
      });
      li.append(button);list.append(li);
    }
    updateStatus("#catalog-status","Public development catalog revision "+data.revision+
      ", "+data.records.length+" service labels. No prices or records imported.");
  } catch {
    list.replaceChildren();
    updateStatus("#catalog-status","Catalog bridge not installed, not authorized or unavailable. Local drafting still works.");
  }
});
const dummyEvidence="sha256:"+"c".repeat(64);
function gateScenario(which){
  const base={schema:GATE_SCHEMA,purpose:"marketing",source_event_id:"fictional:event001",
    subject_ref:"opaque:sample-contact",consent:"unknown",evidence_ref:null,
    suppressed:false,owner_approved:false,recipient_verified:false,provider_available:false};
  let seen=[];
  switch(which){
    case "unapproved":return {input:base,seen};
    case "unknown":return {input:{...base,owner_approved:true,
      recipient_verified:true,provider_available:true},seen};
    case "suppressed":return {input:{...base,owner_approved:true,
      consent:"revoked",evidence_ref:dummyEvidence,suppressed:true,
      recipient_verified:true,provider_available:true},seen};
    case "missing-destination":return {input:{...base,owner_approved:true,
      consent:"granted",evidence_ref:dummyEvidence,provider_available:true},seen};
    case "provider-down":return {input:{...base,owner_approved:true,
      consent:"granted",evidence_ref:dummyEvidence,recipient_verified:true},seen};
    case "eligible":return {input:{...base,owner_approved:true,
      consent:"granted",evidence_ref:dummyEvidence,
      recipient_verified:true,provider_available:true},seen};
    case "duplicate":
      seen=["dry-run:marketing:fictional:event001"];
      return {input:{...base,owner_approved:true,
        consent:"granted",evidence_ref:dummyEvidence,
        recipient_verified:true,provider_available:true},seen};
    case "intro":return {input:{...base,purpose:"individual-introduction",
      owner_approved:true,recipient_verified:true,provider_available:true},seen};
    default:throw Error("Unknown fictional gate scenario.");
  }
}
$("#run-gate").addEventListener("click",()=>{
  try {
    const run=gateScenario($("#gate-scenario").value);
    const result=dryRunCorrespondence(run.input,run.seen);
    updateStatus("#gate-result",result.status);
    updateStatus("#gate-reason",result.reason+
      " This WillowLab control has no sender, CRM writer or operational provider connection.");
  } catch(error) {
    updateStatus("#gate-result","HELD");
    updateStatus("#gate-reason",error.message);
  }
});
renderLeads();
renderPublication();
