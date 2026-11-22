import {buildTimeline,project,LABELS,DEMO_STEPS} from './core.mjs';
const snapshots=buildTimeline();
let step=7, surface='connect';
const $=id=>document.getElementById(id);
const clean=text=>String(text??'—').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty=s=>s==null?'Not yet':String(s).replaceAll('_',' ').replaceAll('demo only','(demo)').replace(/\b[a-z]/g,x=>x.toUpperCase());
function item(label,value){return `<div class="detail-row"><span class="left">${clean(label)}</span><strong class="right">${clean(value)}</strong></div>`}
function banner(s){return `<p class="role-banner">${clean(s)}</p>`}
function rooms(items){return `<div class="rooms">${items.map(r=>`<span>${clean(r)}</span>`).join('')}</div>`}
function showProjection(state){let v=project(state,surface);
 let heading,sub,eyebrow,symbol,html='',hold='';
 if(surface==='website'){
  heading='A request worth remembering';sub='Before a customer signs in, show only what they sent and whether it arrived.';eyebrow='PUBLIC SITE / INQUIRY';symbol='↗';
  html=banner('The public website holds a request receipt—not a full customer file, not an estimate, not a confirmed visit.')+
   item('Service of interest',v.service)+item('Inquiry status',pretty(v.inquiryStatus))+item('Request receipt',v.receipt??'Awaiting customer submission');
  if(v.receipt) html+=item('Next step','Office review; not yet a booking');
 }
 if(surface==='canopy'){
  heading='A clearer conversation';sub='The office remembers what was asked, reviewed, and actually issued.';eyebrow='CRM / OFFICE VIEW';symbol='◌';
  html=banner('Scope, customer context and estimate versions live with their owning business records. The card does not invent prices.')+
   item('Fictional customer',v.customer.name)+item('Service / catalog',`${v.scope.name} · ${v.scope.catalogRevision}`)+
   item('Bathroom interest',`${v.scope.bathrooms} · ${v.scope.propertyType}`)+item('Inquiry',pretty(v.inquiry.status))+
   item('Estimate',`${pretty(v.estimate.status)}${v.estimate.revision?' · '+v.estimate.revision:''}`)+item('Visit',pretty(v.visitStatus));
  if(state.visit.status==='needs_office_review')hold='Review the crew’s additional-scope request. An unapproved add-on cannot silently change terms, price, or work.';
 }
 if(surface==='crew'){
  heading='Only the visit you’re assigned';sub='Clear work, fewer distractions, and a safe route back to the office.';eyebrow='FIELD / ASSIGNED CREW';symbol='⌂';
  html=v.assignment?banner('One visit only. Completing this visit never closes future recurring visits.')+
   item('Assignment',v.assignment.crew)+item('Visit',v.assignment.visitId)+item('Scheduled',v.assignment.date)+
   item('Work state',pretty(v.assignment.status))+rooms(v.assignment.rooms)+item('Field exception',pretty(v.assignment.exception)):
   `<div class="empty">No assigned visit is visible at this revision. The field application must not retrieve other customers or unassigned visits.</div>`;
  if(state.visit.status==='needs_office_review')hold='Work is held for office review. Crew notes do not approve new scope, pricing, or changes to the agreement.';
 }
 if(surface==='mywillow'){
  heading='Your clean, at a glance';sub='Customers see approved commitments and clear next steps—not office drafts.';eyebrow='CLIENT PORTAL / VERIFIED VIEW';symbol='♡';
  html=banner('This is a verified-client *example*. Actual property access and identity checks must happen on the server.')+
   item('Welcome',v.customerName)+item('Your service',v.service)+
   item('Estimate and terms',v.estimate?`${pretty(v.estimate.status)} · ${v.estimate.termsRevision??'Terms pending'}`:'Not issued to you yet')+
   item('Next visit',v.visit?`${v.visit.date} · ${pretty(v.visit.status)}`:'Not booked')+
   item('Billing',v.finance?`${pretty(v.finance.status)} · ${v.finance.invoiceId}`:'No issued invoice')+
   item('Next clean',pretty(v.recurrence.status));
  if(state.estimate.status==='accepted'&&state.visit.status==='not_booked')hold='Your estimate has been accepted, but no visit has been confirmed yet. This distinction prevents accidental bookings.';
 }
 if(surface==='connect'){
  heading='One record. Five grounded perspectives.';sub='The coordinator tracks identity, revisions, events and receipts without taking other apps’ decisions.';eyebrow='SHARED / COORDINATION VIEW';symbol='✦';
  html=banner('Independent lifecycle lanes prevent “approved estimate,” “scheduled,” “completed,” and “invoiced” from collapsing into one misleading status.')+
   item('Customer / scope',`${v.customer.name} · ${v.service.catalogRevision}`)+item('Source inquiry',`${pretty(v.inquiry.status)} · ${v.inquiry.receipt??'no receipt'}`)+
   item('Estimate / terms',`${pretty(v.estimate.status)} · ${v.estimate.termsRevision??'not issued'}`)+
   item('Current visit',`${pretty(v.visit.status)} · ${v.visit.id??'not created'}`)+
   item('Financial record',`${pretty(v.finance.status)} · ${v.finance.authority}`)+item('Repeat service',pretty(v.recurrence.status));
  if(state.finance.status==='draft'&&state.finance.authority==='UNDECIDED')hold='Financial system-of-record is an open owner decision. Invoice drafts do not become issued invoices until authority is selected. The next simulation step is explicitly fake, not a provider choice.';
  if(state.visit.status==='needs_office_review')hold='Additional-scope request is HELD. Neither field evidence nor network delivery is sufficient to authorize a business change.';
 }
 $('surface-eyebrow').textContent=eyebrow;$('plan-head').textContent=heading;$('surface-subtitle').textContent=sub;$('view-symbol').textContent=symbol;
 $('view-heading').textContent=LABELS[surface]+' / '+({website:'Inquiry',canopy:'Customer desk',crew:'Assigned visit',mywillow:'My clean',connect:'Coordination'}[surface]);
 $('location').textContent=surface==='website'||surface==='crew'?'Southern Minnesota (public)':state.customer.location;
 $('headline-status').textContent= surface==='website'?pretty(state.inquiry.status):surface==='crew'?pretty(state.visit.status):surface==='mywillow'?pretty(state.estimate.status):pretty(state.visit.status);
 $('role-content').innerHTML=html;
 $('view-boundary').textContent=v.note;
 $('hold').hidden=!hold;$('hold').innerHTML=hold?`<strong>REVIEW REQUIRED / NOT AUTOMATIC</strong>${clean(hold)}`:'';
}
const milestone=(name,status)=>({name,status});
function renderStages(p){let st=[milestone('Inquiry',p.inquiry.status),milestone('Estimate',p.estimate.status),milestone('Visit',p.visit.status),milestone('Billing',p.finance.status),milestone('Next',p.recurrence.status)];$('stages').innerHTML=st.map(s=>{let cls=s.status==='needs_office_review'||(s.name==='Billing'&&s.status==='draft')?'holdstage':!['not_received','not_started','not_booked','not_proposed'].includes(s.status)?'done':'';return `<div class="stage ${cls}"><span class="label">${s.name}</span><span class="value">${clean(pretty(s.status))}</span></div>`}).join('')}
function renderPromise(p){
  const pgrid=$('promise-grid');
  if(surface==='website'||(surface==='crew'&&!p.visit.assignedCrew)){
    pgrid.innerHTML='<div class="promise-private">This comparison stays in authorized customer, office, or assigned-worker views. A public receipt alone cannot disclose a household work plan.</div>';return;
  }
  const roomNames=p.service.rooms.map(clean).join(' · ');
  const issued=['issued','accepted'].includes(p.estimate.status);
  const exists=p.visit.status!=='not_booked';
  const complete=p.visit.status==='reviewed_complete';
  const held=p.visit.status==='needs_office_review';
  let approved=issued?`Approved scope snapshot: ${roomNames}. The estimate and applicable terms remain pinned to their original revisions.`:'Only a draft or request exists; approved scope is not yet published.';
  let observed=held?'Crew flagged an additional request. The agreed scope remains unchanged until separate office review.':complete?'Crew submitted evidence; office reviewed this single Visit. Any scope differences remain auditable.':exists?'This individual Visit is scheduled or in progress; there is no reviewed outcome yet.':'No completed Visit exists. This column is intentionally empty.';
  // Client projections never show raw crew observations before approved completion.
  if(surface==='mywillow'&&!complete)observed='A reviewed completion summary is not yet available to the client.';
  const columns=[
   {index:'01 / REQUESTED',title:'What was asked',desc:`${roomNames}. A customer’s initial interest is not a final contract.`,status:p.inquiry.receipt?'Received inquiry':'Awaiting request'},
   {index:'02 / AGREED',title:'What was approved',desc:approved,status:issued?`${p.estimate.revision} · ${p.estimate.termsRevision}`:'Not issued'},
   {index:'03 / OBSERVED',title:'What happened',desc:observed,status:held?'OFFICE REVIEW HOLD':complete?'Reviewed complete':'Pending',held:held&&surface!=='mywillow'},
  ];
  pgrid.innerHTML=columns.map(c=>`<article class="promise-column ${c.held?'hold-promise':''}"><span class="promise-label">${clean(c.index)}</span><h4>${clean(c.title)}</h4><p>${c.desc}</p><span class="promise-state">${clean(c.status)}</span></article>`).join('');
}
function renderHistory(p){const accessible=p.events.filter(e=>surface==='connect'||(surface==='canopy'&&['website','canopy','mywillow','connect'].includes(e.actor))||(surface==='crew'&&e.actor==='crew')||(surface==='mywillow'&&['ISSUE_ESTIMATE','ACCEPT_ESTIMATE','CONFIRM_VISIT','REVIEW_COMPLETION','ISSUE_INVOICE','PROPOSE_RECURRENCE','AUTHORIZE_RECURRENCE'].includes(e.type))||(surface==='website'&&e.type==='SUBMIT_INQUIRY'));
 $('events').innerHTML=accessible.length?accessible.slice().reverse().slice(0,7).map(e=>`<li><span class="event-index">${String(e.revision).padStart(2,'0')}</span><span class="event-main"><strong>${clean(DEMO_STEPS[e.revision-1]?.[1]??e.type)}</strong><small>${clean(LABELS[e.actor])} · revision ${e.revision}</small></span>${surface==='connect'?`<span class="event-receipt">${clean(e.receipt.id)}</span>`:''}</li>`).join(''):`<li><span class="event-index">—</span><span class="event-main"><strong>No visible events yet</strong><small>Earlier or private events are not shown here.</small></span></li>`;
}
function render(){const p=snapshots[step];document.querySelectorAll('[data-surface]').forEach(b=>{let chosen=b.dataset.surface===surface;b.setAttribute('aria-selected',String(chosen));b.tabIndex=chosen?0:-1});
 $('plan-id').textContent=p.planId;$('card-revision').textContent='REVISION '+String(p.revision).padStart(2,'0');$('service-name').textContent=p.service.name;
 $('counter').textContent=String(p.events.length).padStart(2,'0');
 renderStages(p);showProjection(p);renderHistory(p);renderPromise(p);
 const pair=DEMO_STEPS[step-1];$('story-title').textContent=pair?pair[1]:'Before the first inquiry';
 $('story-detail').textContent=pair?'An attributed demonstration command produced a separate simulated receipt. No operational record was changed.':'No request has been received yet. The public site may collect an inquiry, but it cannot promise a booking.';
 $('step-owner').textContent=pair?LABELS[p.events.at(-1)?.actor]:'PUBLIC WEBSITE';
 $('step-label').textContent=`Step ${step} of ${DEMO_STEPS.length}`;$('progress-pct').textContent=Math.round(step/DEMO_STEPS.length*100)+'%';$('progress-fill').style.width=(step/DEMO_STEPS.length*100)+'%';
 $('scrubber').value=String(step);$('prev').disabled=step===0;$('next').disabled=step===DEMO_STEPS.length;
 $('journey-lesson').textContent=step===9?'A crew observation can put this visit on hold without rewriting its approved scope.':step===13?'A reviewed visit can produce an invoice draft; provider authority is still undecided.':step>=17?'Recurrence is a separate invitation and customer decision, not a side effect of payment.':'The same source event can inform different views without giving every participant the same permissions.';
}
document.querySelectorAll('[data-surface]').forEach(button=>button.addEventListener('click',()=>{surface=button.dataset.surface;render()}));
$('prev').addEventListener('click',()=>{step=Math.max(0,step-1);render()});$('next').addEventListener('click',()=>{step=Math.min(DEMO_STEPS.length,step+1);render()});
$('scrubber').addEventListener('input',e=>{step=Number(e.target.value);render()});
$('export').addEventListener('click',()=>{const payload={disclaimer:'SYNTHETIC CONCEPT ONLY. DO NOT IMPORT AS REAL CUSTOMER DATA.',source:'Independent Willow Clean Plan Card concept',plan:snapshots[step]};let blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`willow-plan-fictional-rev-${step}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)});
render();
