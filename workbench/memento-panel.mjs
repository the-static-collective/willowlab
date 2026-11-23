// Optional same-origin Access-verified MEMENTO lookup + local JSON/specimen inspection.
// Private MEMENTO tokens remain server-side. No browser secrets, storage, or MEMENTO writes.
import {readMementoArtifact,createWorkbenchQuestion,fictionalMementoSpecimen,MAX_ARTIFACT_BYTES} from "./memento.mjs";
export function installMementoPanel({getHomeId,onCapture}){
  const input=document.getElementById("memento-file");
  const status=document.getElementById("memento-status");
  const preview=document.getElementById("memento-preview");
  const capture=document.getElementById("memento-capture");
  const clear=document.getElementById("memento-clear");
  const sample=document.getElementById("memento-sample");
  const listButton=document.getElementById("memento-list-worlds");
  const worldSelect=document.getElementById("memento-world");
  const depthSelect=document.getElementById("memento-depth");
  const readButton=document.getElementById("memento-read-world");
  const liveStatus=document.getElementById("memento-live-status");
  let active=null,attachedHome=null,pinnedIndex=null,sourceHome=null,pendingHome=null,sourcePointer=null,epoch=0;
  const node=(tag,className,text)=>{
    const e=document.createElement(tag);
    if(className)e.className=className;
    if(text!==undefined)e.textContent=String(text);
    return e;
  };
  const reset=(message="No artifact imported.")=>{
    epoch++;
    active=null;attachedHome=null;pinnedIndex=null;sourceHome=null;pendingHome=null;sourcePointer=null;
    input.value="";preview.replaceChildren();
    worldSelect.replaceChildren(node("option","", "Sign in and list worlds first"));
    worldSelect.disabled=true;readButton.disabled=true;
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
    if(sourcePointer){
      preview.append(node("p","memento-source",
        "Source-pinned GitHub read · MEMENTO @ "+sourcePointer.commit_sha.slice(0,12)+
        " · observed "+sourcePointer.observed_at+" · admission: none"));
    }
    preview.append(node("p","memento-meta",artifact.notice));
  }
  // Authenticated endpoint must be same-origin and must pass server-side JWT verification.
  async function readApi(query){
    const response=await fetch("../api/memento?"+query.toString(),{
      method:"GET",credentials:"same-origin",cache:"no-store",redirect:"manual",
      headers:{"Accept":"application/json"}
    });
    if(!response.ok||!response.headers.get("content-type")?.includes("application/json")){
      let code="ACCESS_REQUIRED";
      if(response.headers.get("content-type")?.includes("application/json")){
        const body=await response.json().catch(()=>({}));
        code=String(body.error||"UNAVAILABLE");
      }
      throw new Error(code+" ("+response.status+"). Use the Access sign-in link, or have the bridge configured.");
    }
    return response.json();
  }
  listButton.addEventListener("click",async()=>{
    reset("Requesting a source index through the private endpoint…");
    const home=getHomeId(),requestId=++epoch;
    pendingHome=home;
    liveStatus.textContent="Checking Cloudflare Access and pinned MEMENTO Git revision…";
    listButton.disabled=true;
    try{
      const index=await readApi(new URLSearchParams({mode:"worlds"}));
      if(epoch!==requestId||home!==getHomeId())return;
      if(index?.schema!=="static.memento-source-index/0.1"||
        index.admission!=="none"||
        index.provenance?.repository!=="the-static-collective/MEMENTO"||
        !/^[a-f0-9]{40}$/i.test(index.provenance?.commit_sha||"")||
        !Array.isArray(index.worlds)||index.worlds.length>64)throw Error("Unexpected source index");
      pinnedIndex=index;sourceHome=home;pendingHome=null;
      worldSelect.replaceChildren();
      for(const w of index.worlds){
        if(typeof w.id!=="string"||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(w.id)||
          typeof w.title!=="string")throw Error("Unexpected world metadata");
        const option=node("option","",w.title+" ["+w.id+"]");option.value=w.id;
        worldSelect.append(option);
      }
      worldSelect.disabled=!index.worlds.length;
      readButton.disabled=!index.worlds.length;
      liveStatus.textContent=index.worlds.length+" worlds available at pinned commit "+
        index.provenance.commit_sha.slice(0,12)+". Private data not copied to the repository.";
      status.textContent="Choose a world and explicitly read its context.";
    }catch(error){
      if(epoch!==requestId)return;
      reset("Private source index unavailable; local import and fictional specimen still work.");
      liveStatus.textContent=error.message;
    }finally{listButton.disabled=false;}
  });
  readButton.addEventListener("click",async()=>{
    if(!pinnedIndex||sourceHome!==getHomeId())return;
    const pinned=pinnedIndex.provenance.commit_sha;
    const target=worldSelect.value;
    if(!target)return;
    const home=getHomeId(),requestId=++epoch;
    pendingHome=home;readButton.disabled=true;
    liveStatus.textContent="Reading only scoped metadata at "+pinned.slice(0,12)+"…";
    try{
      const response=await readApi(new URLSearchParams({
        mode:"context",world:target,depth:depthSelect.value,sha:pinned
      }));
      if(epoch!==requestId||home!==getHomeId())return;
      if(response?.provenance?.commit_sha!==pinned||
        response?.provenance?.repository!=="the-static-collective/MEMENTO")
        throw Error("Pinned source changed: refusing to display");
      const view=readMementoArtifact(response);
      active=view;attachedHome=home;sourcePointer=response.provenance;pendingHome=null;
      show(view);capture.disabled=false;clear.hidden=false;
      status.textContent="Authenticated, pinned GitHub read. Nothing admitted or saved.";
      liveStatus.textContent="Source read: "+pinned.slice(0,12)+
        ". Capture a question only if you want its title in your local demo and copied handoff.";
    }catch(error){
      if(epoch!==requestId)return;
      active=null;attachedHome=null;sourcePointer=null;capture.disabled=true;
      preview.replaceChildren();
      liveStatus.textContent=error.message;
      status.textContent="No private source accepted.";
    }finally{readButton.disabled=worldSelect.disabled||!pinnedIndex;}
  });
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
    if((active&&attachedHome!==getHomeId())||
      (pinnedIndex&&sourceHome!==getHomeId())||
      (pendingHome&&pendingHome!==getHomeId())){
      reset("Home changed; private context and pending requests were cleared.");
      liveStatus.textContent="Source context cleared on home change. Reauthorize this lookup for another home.";
    }
  }};
}
