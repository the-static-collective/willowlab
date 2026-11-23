import {FICTIONAL_DEMO,readPublicGarden,crossingDraft} from "./core.mjs";
const $=(s)=>document.querySelector(s);
const status=$("#status"),cards=$("#cards"),input=$("#local");
let view=null;
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function show(raw){
  try {
    view=readPublicGarden(raw);
    cards.replaceChildren();
    for (const card of view.cards) {
      const article=document.createElement("article");
      article.append(node("h2",card.name),node("p",card.region+" · "+card.type+" · "+card.stage+" (public discovery only)"));
      const dl=document.createElement("dl");
      const fields=[
        ["Observed public service",card.source.observed],
        ["Potential value to neighbor",card.two_way.to_neighbor],
        ["Potential value to Willow",card.two_way.to_willow],
        ["Unresolved",card.uncertainties.join("; ")],
        ["Owner permission",card.owner_permission],
        ["Stage evidence","None; no introduction or trial"]
      ];
      for(const [key,val] of fields){dl.append(node("dt",key),node("dd",val));}
      article.append(dl);
      const reference=document.createElement("a");
      reference.href=card.source.url;reference.target="_blank";reference.rel="noopener noreferrer";
      reference.textContent="Original stated source (checked "+card.source.checked_on+")";
      article.append(reference);
      const actions=document.createElement("p"),exportButton=document.createElement("button");
      exportButton.type="button";exportButton.textContent="Save proposed owner-review card";
      exportButton.addEventListener("click",()=>downloadProposal(card));
      actions.append(exportButton);article.append(actions);cards.append(article);
    }
    status.textContent=view.cards.length+" public research specimen(s) loaded. No owner decision, contact, persistence, or WMS write.";
  } catch {
    view=null;cards.replaceChildren();
    status.textContent="Not a supported STATIC SEED v2.1 public-research specimen. No card loaded.";
  }
}
function downloadProposal(card){
  const packet=crossingDraft(card);
  const file=new Blob([JSON.stringify(packet,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(file),link=document.createElement("a");
  link.href=url;link.download="neighbor-review-"+card.id+".json";
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent="Proposed card created locally. NOT SENT to Colton; NOT SAVED in WillowConnect.";
}
$("#fictional").addEventListener("click",()=>show(FICTIONAL_DEMO));
input.addEventListener("change",async()=>{
  const file=input.files?.[0];
  if(!file)return;
  try {
    if(file.size>65536)throw Error("too large");
    show(JSON.parse(await file.text()));
  } catch {
    view=null;cards.replaceChildren();
    status.textContent="File rejected or unreadable. Only small, public-research JSON specimens are supported.";
  }
  input.value="";
});
