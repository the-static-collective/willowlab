// Local-only adaptation of STATIC SEED v0.2.1 Neighbor Weave's public-research specimen.
// Deliberately no network API, persistence, CRM sync, partner promotion or contact action.
export const SCHEMA = "static-seed.neighbor-garden/v1";
const TYPES = new Set(["recurring-vendor","reciprocal-referral","project-handoff","specialty-peer","community-collaboration"]);
const readText=(value,max=300)=>typeof value==="string"&&value.trim().length>0&&value.length<=max&&!/[\u0000-\u001f]/.test(value);
const requireFact=(condition)=>{if(!condition)throw new Error("INVALID_PUBLIC_RESEARCH_SPECIMEN")};
function sourceUrl(value) {
  requireFact(readText(value,600));
  let u;
  try{u=new URL(value);}catch{throw new Error("INVALID_PUBLIC_RESEARCH_SPECIMEN");}
  requireFact(u.protocol==="https:"&&!u.username&&!u.password&&!u.hash);
  return u.href;
}
export function readPublicGarden(garden){
  requireFact(garden&&typeof garden==="object"&&!Array.isArray(garden));
  requireFact(garden.schema===SCHEMA&&garden.status==="PUBLIC_RESEARCH_SPECIMEN_NOT_COLTON_APPROVED");
  requireFact(garden.actions_taken?.outreach_sent===false&&garden.actions_taken?.partnerships_confirmed===0&&garden.actions_taken?.crm_imports===0);
  requireFact(Array.isArray(garden.leads)&&garden.leads.length>0&&garden.leads.length<=3);
  const cards=garden.leads.map((lead)=>{
    requireFact(lead&&typeof lead==="object"&&!Array.isArray(lead));
    requireFact(readText(lead.id,80)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lead.id));
    requireFact(readText(lead.business_name,120)&&readText(lead.region,120));
    requireFact(TYPES.has(lead.relationship_type));
    requireFact(lead.stage==="DISCOVERED"&&lead.partner_confirmed===false);
    requireFact(lead.introduction_evidence===null&&lead.mutual_trial_evidence===null);
    requireFact(readText(lead.source?.observed,500));
    requireFact(/^\d{4}-\d{2}-\d{2}$/.test(lead.source?.checked_on||""));
    requireFact(readText(lead.proposed_mutual_value?.to_neighbor,500));
    requireFact(readText(lead.proposed_mutual_value?.to_willow,500));
    requireFact(Array.isArray(lead.uncertainties)&&lead.uncertainties.length>0&&lead.uncertainties.length<=8);
    requireFact(lead.uncertainties.every(v=>readText(v,240)));
    // Explicit allowlist: input may carry extra untrusted keys but none are forwarded.
    return {id:lead.id,name:lead.business_name,region:lead.region,type:lead.relationship_type,
      stage:"DISCOVERED",source:{url:sourceUrl(lead.source.url),checked_on:lead.source.checked_on,observed:lead.source.observed},
      two_way:{to_neighbor:lead.proposed_mutual_value.to_neighbor,to_willow:lead.proposed_mutual_value.to_willow},
      uncertainties:[...lead.uncertainties],owner_permission:"NOT_AUTHORIZED",
      contact:"NONE",relationship_confirmed:false};
  });
  requireFact(new Set(cards.map(x=>x.id)).size===cards.length);
  return {schema:"willowlab.neighbor-preview/v1",status:"LOCAL_ONLY_NOT_SAVED_NOT_SENT",cards};
}
export function crossingDraft(card){
  requireFact(card&&card.stage==="DISCOVERED"&&card.owner_permission==="NOT_AUTHORIZED");
  requireFact(readText(card.id,80)&&readText(card.name,120)&&card.source?.url);
  // No state promotions: this is a note that can be manually shown to Colton for review.
  return {schema:"static-seed.neighbor-review-proposal/v1",
    state:"DRAFT_NOT_SAVED_NOT_SENT",
    owner_decision:"UNREQUESTED",
    purpose:"Propose whether to review a public-source reciprocal business fit; no contact or WMS import",
    room:"Business / Partnerships (PROPOSED)",
    candidate:{id:card.id,name:card.name,region:card.region,relationship_type:card.type,
      source:{...card.source},mutual_hypothesis:{...card.two_way},open_questions:[...card.uncertainties]},
    permissions:{outreach:false,crm_write:false,customer_data:false,public_attribution:false},
    next_action:"Colton decides whether the source and fit merit a private review"};
}
export const FICTIONAL_DEMO={
  schema:SCHEMA,status:"PUBLIC_RESEARCH_SPECIMEN_NOT_COLTON_APPROVED",
  actions_taken:{outreach_sent:false,partnerships_confirmed:0,crm_imports:0},
  leads:[{id:"fictional-property-manager",business_name:"Example Property Care (fictional)",region:"Example Minnesota town",
    relationship_type:"recurring-vendor",stage:"DISCOVERED",partner_confirmed:false,
    introduction_evidence:null,mutual_trial_evidence:null,
    source:{url:"https://example.org/example-property-care",checked_on:"2026-11-23",
      observed:"Fictional example: a company offering property management."},
    proposed_mutual_value:{to_neighbor:"Possible turnover cleaning, if requested and within capacity.",
      to_willow:"Possible recurring work, only if the business independently wants it."},
    uncertainties:["Is there an existing cleaning supplier?","Does the service area overlap?"]}]
};
