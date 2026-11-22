// Local-only MEMENTO import panel. No network calls, storage, or MEMENTO writes.
import {readMementoArtifact,createWorkbenchQuestion,fictionalMementoSpecimen,MAX_ARTIFACT_BYTES} from "./memento.mjs";
export function installMementoPanel({getHomeId,onCapture}){
  const input=document.getElementById("memento-file");
  const status=document.getElementById("memento-status");
  const preview=document.getElementById("memento-preview");
  const capture=document.getElementById("memento-capture");
  const clear=document.getElementById("memento-clear");
  const sample=document.getElementById("memento-sample");
  let active=null,attachedHome=null;
  const node=(tag,className,text)=>{
    const e=document.createElement(tag);
    if(className)e.className=className;
    if(text!==undefined)e.textContent=String(text);
    return e;
  };
  const reset=(message="No artifact imported.")=>{
    active=null;attachedHome=null;input.value="";preview.replaceChildren();
    status.textContent=message;capture.disabled=true;clear.hidden=true;
  };
  function show(artifact){
    preview.replaceChildren();
    preview.append(node("p","memento-warning","READ ONLY · admission: none · source content is unverified by this importer"));
    preview.append(node("strong","",artifact.kind==="context-pack"?"Context pack":"Return ticket"));
    preview.append(node("p","memento-meta",artifact.summary+" · "+(artifact.coverage||"SCOPED_RETRIEVAL")));
    if(artifact.kind==="context-pack"){
      preview.append(node("p","memento-meta","Origin: "+artifact.origin+" · depth "+artifact.depth));
      const title=node("h4","", "Scoped worlds");
      preview.append(title);
      for(const w of artifact.worlds.slice(0,12)){
        preview.append(node("div","memento-line",w.title+" ["+w.id+"] · "+w.status));
      }
      if(artifact.worlds.length>12)preview.append(node("p","memento-meta","Additional worlds are omitted from this compact preview"));
      if(artifact.edges.length){
        preview.append(node("h4","","Relations (source status, not local admission)"));
        for(const e of artifact.edges.slice(0,10)){
          preview.append(node("div","memento-line",e.from+" → "+e.to+": "+e.relation+" ["+e.source_status+"]"));
        }
      }
    }else{
      preview.append(node("p","memento-line",artifact.question));
      preview.append(node("p","memento-meta","Observed: "+artifact.observed_at+" · coverage: "+artifact.coverage));
      for(const claim of artifact.claims.slice(0,8)){
        preview.append(node("div","memento-line",claim.status+": "+claim.text));
      }
      if(artifact.open_questions.length){
        preview.append(node("h4","","Open questions"));
        for(const q of artifact.open_questions.slice(0,6))preview.append(node("div","memento-line",q));
      }
      preview.append(node("p","memento-meta","Next probe: "+artifact.next_probe.action+
        " · consent: "+artifact.next_probe.consent));
    }
    preview.append(node("p","memento-meta",artifact.notice));
  }
  input.addEventListener("change",async()=>{
    const file=input.files?.[0],home=getHomeId();
    reset("Reading selected local artifact…");
    if(!file)return;
    if(file.size>MAX_ARTIFACT_BYTES){reset("Refused: artifact exceeds 256 KiB.");return;}
    try{
      const text=await file.text();
      if(home!==getHomeId()){reset("The selected home changed; import again for that home.");return;}
      active=readMementoArtifact(text);
      attachedHome=home;
      show(active);
      status.textContent="Local artifact inspected: "+file.name+". No upload or MEMENTO write.";
      capture.disabled=false;clear.hidden=false;
    }catch(error){
      reset((error.code||"INVALID")+": "+error.message);
    }
  });
  capture.addEventListener("click",()=>{
    if(!active||attachedHome!==getHomeId()){reset("Select a local artifact for this home first.");return;}
    onCapture(createWorkbenchQuestion(active));
    status.textContent="Question captured in this fictional home. MEMENTO is unchanged.";
  });
  sample.addEventListener("click",()=>{
    reset("Loading fictional specimen…");
    active=readMementoArtifact(fictionalMementoSpecimen());
    attachedHome=getHomeId();
    show(active);
    status.textContent="Fictional specimen loaded locally. No MEMENTO repository or real records accessed.";
    capture.disabled=false;clear.hidden=false;
  });
  clear.addEventListener("click",()=>reset());
  return {updateHome(){
    if(active&&attachedHome!==getHomeId())reset("Home changed; source context cleared to avoid cross-home leakage.");
  }};
}
