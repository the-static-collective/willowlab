/** Willow Clean Plan Card — independent synthetic prototype.
 * No operational WMS API, identity, signing, or durable persistence is provided.
 */
export const SURFACES = Object.freeze(['website','canopy','crew','mywillow','connect']);
export const LABELS = Object.freeze({
 website:'CleanWithWillow.com', canopy:'Willow Canopy', crew:'Willow Crew',
 mywillow:'My Willow', connect:'Willow Connect'
});
export const ACTIONS = Object.freeze({
 SUBMIT_INQUIRY:'website', REVIEW_INQUIRY:'canopy', DRAFT_ESTIMATE:'canopy',
 ISSUE_ESTIMATE:'canopy', ACCEPT_ESTIMATE:'mywillow', CONFIRM_VISIT:'connect',
 ASSIGN_CREW:'connect', START_VISIT:'crew', FLAG_EXCEPTION:'crew',
 REVIEW_EXCEPTION:'canopy', SUBMIT_COMPLETION:'crew', REVIEW_COMPLETION:'connect',
 PREPARE_INVOICE:'connect', SIMULATE_FINANCE_AUTHORITY:'connect',
 ISSUE_INVOICE:'connect', RECORD_PAYMENT:'connect', PROPOSE_RECURRENCE:'canopy',
 AUTHORIZE_RECURRENCE:'mywillow'
});

export function initialPlan() {
 return {
  schema:'willow.clean-plan-card/0.1', demo:true,
  planId:'WCS-FX-CP-041', revision:0, customer:{id:'CUST-FX-AVERY',name:'Avery Sample',location:'Mankato area (fictional)'},
  service:{id:'SERVICE-FX-HOME',name:'Residential home care',catalogRevision:'CAT-FX-07',
   propertyType:'Single-family home',bathrooms:2,rooms:['Kitchen','Two bathrooms','Common areas','Bedrooms']},
  consent:{responsePurpose:false,marketing:false,version:'CONSENT-FX-1'},
  inquiry:{status:'not_received',receipt:null,review:null},
  estimate:{status:'not_started',id:null,revision:null,termsRevision:null},
  visit:{status:'not_booked',id:null,date:null,assignedCrew:null,exception:'none',checklistRevision:'ROOMS-FX-1'},
  finance:{status:'not_started',authority:'UNDECIDED',invoiceId:null},
  recurrence:{status:'not_proposed',approved:false},
  events:[],
 };
}
export class PlanError extends Error { constructor(code,message){super(message);this.code=code;this.name='PlanError';} }
const fail=(c,m)=>{throw new PlanError(c,m)};
const need=(predicate,message)=>{if(!predicate)fail('HOLD',message)};

/** Creates a new snapshot; previous state is never mutated. Idempotency is exact-key + exact-payload. */
export function applyCommand(current, command) {
 if (!current || !command || typeof command!=='object')fail('INVALID','Plan and command required');
 const {type,actor,commandId,payload={},expectedRevision}=command;
 if (!Object.prototype.hasOwnProperty.call(ACTIONS,type))fail('UNKNOWN_COMMAND','Unsupported command');
 if (ACTIONS[type]!==actor)fail('FORBIDDEN','That surface does not own this decision');
 if (typeof commandId!=='string' || !commandId)fail('INVALID','A commandId is required');
 const fingerprint=JSON.stringify({type,actor,payload});
 const earlier=current.events.find(e=>e.commandId===commandId);
 if (earlier) {
  if (earlier.fingerprint!==fingerprint)fail('CONFLICT','Same command ID with different contents');
  return {plan:current,duplicate:true,receipt:earlier.receipt};
 }
 if (!Number.isInteger(expectedRevision) || expectedRevision!==current.revision)
  fail('STALE_REVISION','Refresh before acting: this plan changed');
 const next=JSON.parse(JSON.stringify(current));
 switch(type) {
  case 'SUBMIT_INQUIRY':
   need(next.inquiry.status==='not_received','Inquiry was already received');
   need(payload.responsePurpose===true,'Separate response-purpose permission is required for this sample');
   next.consent.responsePurpose=true;
   next.inquiry.status='received';next.inquiry.receipt='RECEIPT-FX-001';break;
  case 'REVIEW_INQUIRY':
   need(next.inquiry.status==='received','An inquiry receipt is required');
   next.inquiry.status='reviewed';next.inquiry.review='reviewed_for_estimate';break;
  case 'DRAFT_ESTIMATE':
   need(next.inquiry.status==='reviewed'&&next.estimate.status==='not_started','Office review required before drafting');
   next.estimate.status='draft';next.estimate.id='EST-FX-101';next.estimate.revision='ESTREV-FX-1';break;
  case 'ISSUE_ESTIMATE':
   need(next.estimate.status==='draft','Draft estimate must be reviewed before issue');
   next.estimate.status='issued';next.estimate.termsRevision='TERMS-FX-01';break;
  case 'ACCEPT_ESTIMATE':
   need(next.estimate.status==='issued','Only an issued estimate can be accepted');
   need(payload.verifiedIdentity===true,'Verified customer identity required');
   next.estimate.status='accepted';break;
  case 'CONFIRM_VISIT':
   need(next.estimate.status==='accepted','Accepted estimate required; acceptance alone is not a booking');
   need(next.visit.status==='not_booked','Visit already exists');
   next.visit.status='confirmed';next.visit.id='VIS-FX-201';next.visit.date='Dec 4, 2026 (example)';break;
  case 'ASSIGN_CREW':
   need(next.visit.status==='confirmed','A confirmed visit is required');
   next.visit.status='assigned';next.visit.assignedCrew='Willow Crew A (fictional)';break;
  case 'START_VISIT':
   need(next.visit.status==='assigned','A crew assignment is required');
   next.visit.status='in_progress';break;
  case 'FLAG_EXCEPTION':
   need(next.visit.status==='in_progress','An active visit is required');
   next.visit.status='needs_office_review';next.visit.exception='Additional request not in approved scope';break;
  case 'REVIEW_EXCEPTION':
   need(next.visit.status==='needs_office_review','No exception to review');
   next.visit.status='in_progress';next.visit.exception='Office reviewed; scope unchanged in demo';break;
  case 'SUBMIT_COMPLETION':
   need(next.visit.status==='in_progress','An active visit without unresolved hold is required');
   next.visit.status='submitted_for_review';break;
  case 'REVIEW_COMPLETION':
   need(next.visit.status==='submitted_for_review','An office completion review is required');
   next.visit.status='reviewed_complete';break;
  case 'PREPARE_INVOICE':
   need(next.visit.status==='reviewed_complete','Review this individual visit before preparing invoice');
   need(next.finance.status==='not_started','Invoice draft already exists');
   next.finance.status='draft';next.finance.invoiceId='INV-FX-301';break;
  case 'SIMULATE_FINANCE_AUTHORITY':
   need(next.finance.status==='draft','Prepare draft before finance demo gate');
   need(next.finance.authority==='UNDECIDED','Demo authority already set');
   next.finance.authority='SIMULATION_ONLY—NO_PROVIDER_SELECTED';break;
  case 'ISSUE_INVOICE':
   need(next.finance.status==='draft','Invoice draft required');
   need(next.finance.authority==='SIMULATION_ONLY—NO_PROVIDER_SELECTED','Real financial authority unresolved; no invoice issue');
   next.finance.status='issued_demo_only';break;
  case 'RECORD_PAYMENT':
   need(next.finance.status==='issued_demo_only','Issued demo invoice required');
   next.finance.status='paid_demo_only';break;
  case 'PROPOSE_RECURRENCE':
   need(next.visit.status==='reviewed_complete','Completed and reviewed visit required');
   need(next.recurrence.status==='not_proposed','Already proposed');
   next.recurrence.status='proposed';break;
  case 'AUTHORIZE_RECURRENCE':
   need(next.recurrence.status==='proposed','Proposed recurrence required');
   need(payload.verifiedIdentity===true&&payload.explicitConsent===true,'Explicit client authorization required');
   next.recurrence.status='authorized_not_booked';next.recurrence.approved=true;break;
 }
 next.revision++;
 const receipt={schema:'willow.clean-plan-receipt/0.1',id:`RECEIPT-FX-${String(next.revision).padStart(3,'0')}`,
  planId:next.planId,revision:next.revision,result:'APPLIED_IN_SIMULATOR',production:false};
 next.events.push({eventId:`EVENT-FX-${String(next.revision).padStart(3,'0')}`,commandId,
  fingerprint,type,actor,revision:next.revision,payload:JSON.parse(JSON.stringify(payload)),receipt,
  at:`2026-11-22T${String(13+Math.floor((next.revision-1)/10)).padStart(2,'0')}:${String((next.revision*3)%60).padStart(2,'0')}:00-06:00`});
 return {plan:next,duplicate:false,receipt};
}

export const DEMO_STEPS = Object.freeze([
 ['SUBMIT_INQUIRY','A new request is received',{responsePurpose:true}],
 ['REVIEW_INQUIRY','Canopy reviews the inquiry',{}],
 ['DRAFT_ESTIMATE','Prepare estimate (not yet issued)',{}],
 ['ISSUE_ESTIMATE','Issue versioned estimate and terms',{}],
 ['ACCEPT_ESTIMATE','Customer accepts the issued revision',{verifiedIdentity:true}],
 ['CONFIRM_VISIT','Connect confirms a separate booking',{}],
 ['ASSIGN_CREW','Dispatch assigns the individual visit',{}],
 ['START_VISIT','Crew begins the visit',{}],
 ['FLAG_EXCEPTION','Crew flags work outside the approved scope',{}],
 ['REVIEW_EXCEPTION','Office reviews the exception (no scope change)',{}],
 ['SUBMIT_COMPLETION','Crew submits completion evidence',{}],
 ['REVIEW_COMPLETION','Office accepts completion of this visit',{}],
 ['PREPARE_INVOICE','Prepare an invoice draft (not issued)',{}],
 ['SIMULATE_FINANCE_AUTHORITY','Demo-only finance authorization boundary',{}],
 ['ISSUE_INVOICE','Issue a fictional invoice in the simulator',{}],
 ['RECORD_PAYMENT','Record a fictional payment',{}],
 ['PROPOSE_RECURRENCE','Propose recurring service',{}],
 ['AUTHORIZE_RECURRENCE','Customer explicitly authorizes recurrence',{verifiedIdentity:true,explicitConsent:true}],
]);
export function buildTimeline(){let plan=initialPlan();const snapshots=[plan];for(let i=0;i<DEMO_STEPS.length;i++){let [type,,payload]=DEMO_STEPS[i];plan=applyCommand(plan,{type,actor:ACTIONS[type],payload,commandId:`demo-step-${i+1}`,expectedRevision:plan.revision}).plan;snapshots.push(plan)}return snapshots;}

/** Information projections only. Real authorization must be checked server-side before fetching any records. */
export function project(plan,surface){
 if(!SURFACES.includes(surface))fail('INVALID','Unknown surface');
 const core={schema:'willow.clean-plan-view/0.1',surface,planId:plan.planId,revision:plan.revision,
  service:plan.service.name,demo:true};
 if(surface==='website')return {...core,inquiryStatus:plan.inquiry.status,receipt:plan.inquiry.receipt,
  note:'Public inquiry receipt only; no signed-in customer details'};
 if(surface==='mywillow')return {...core,customerName:plan.customer.name,
  estimate:plan.estimate.status==='not_started'||plan.estimate.status==='draft'?null:{status:plan.estimate.status,ref:plan.estimate.id,termsRevision:plan.estimate.termsRevision},
  visit:['confirmed','assigned','in_progress','needs_office_review','submitted_for_review','reviewed_complete'].includes(plan.visit.status)?{status:plan.visit.status==='reviewed_complete'?'completed':plan.visit.status,date:plan.visit.date}:null,
  finance:plan.finance.status.includes('issued')||plan.finance.status.includes('paid')?{status:plan.finance.status,invoiceId:plan.finance.invoiceId}:null,
  recurrence:{status:plan.recurrence.status},
  note:'Private client view after server-side property and identity grant'};
 if(surface==='crew')return {...core,assignment:plan.visit.assignedCrew?{crew:plan.visit.assignedCrew,visitId:plan.visit.id,date:plan.visit.date,status:plan.visit.status,
  rooms:plan.service.rooms,exception:plan.visit.exception}:null,
  note:'Only assigned visits and relevant rooms are shown'};
 if(surface==='canopy')return {...core,customer:plan.customer,scope:plan.service,
  inquiry:plan.inquiry,estimate:plan.estimate,visitStatus:plan.visit.status,
  next:'Review/estimate/follow up. Booking, pricing, and finance remain separate authorities'};
 return {...core,customer:plan.customer,service:plan.service,inquiry:plan.inquiry,
  estimate:plan.estimate,visit:plan.visit,finance:plan.finance,recurrence:plan.recurrence,
  receipts:plan.events.map(e=>({eventId:e.eventId,commandId:e.commandId,revision:e.revision,actor:e.actor,receiptId:e.receipt.id})),
  note:'Illustrative coordination view; provider and access-control integrations NOT connected'};
}
