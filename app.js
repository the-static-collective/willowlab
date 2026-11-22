/* Willow public site prototype. No analytics, tracking, storage, API calls, or customer-data submission. */
(() => {
  'use strict';
  const dialog = document.getElementById('estimateDialog');
  const form = document.getElementById('estimateForm');
  const error = document.getElementById('formError');
  const back = document.getElementById('formBack');
  const next = document.getElementById('formNext');
  const progressText = document.getElementById('progress-label');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const review = document.getElementById('reviewSummary');
  const copyStatus = document.getElementById('copyStatus');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuToggle = document.querySelector('.menu-toggle');
  let step = 1;
  let previouslyFocused = null;

  document.getElementById('year').textContent = String(new Date().getFullYear());

  function setMenu(open) {
    mobileMenu.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  menuToggle.addEventListener('click', () => setMenu(mobileMenu.hidden));
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));

  function openDialog(service) {
    previouslyFocused = document.activeElement;
    if (service) {
      const options = { regular: 'Regular home care', deep: 'Deep cleaning', move: 'Move-out cleaning' };
      const wanted = options[service];
      const target = [...form.querySelectorAll('input[name="service"]')].find(radio => radio.value === wanted);
      if (target) target.checked = true;
    }
    error.textContent = '';
    copyStatus.textContent = '';
    setMenu(false);
    setStep(1);
    if (!dialog.open) dialog.showModal();
  }
  document.querySelectorAll('[data-open-quote]').forEach(el => el.addEventListener('click', () => openDialog(null)));
  document.querySelectorAll('[data-service]').forEach(el => el.addEventListener('click', () => openDialog(el.dataset.service)));
  document.querySelectorAll('[data-close-dialog]').forEach(el => el.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus(); });

  function setStep(n) {
    step = n;
    form.querySelectorAll('.form-step').forEach(section => {
      const show = Number(section.dataset.step) === n;
      section.hidden = !show;
      section.classList.toggle('active', show);
    });
    progressText.textContent = `Step ${n} of 4`;
    progressPercent.textContent = `${n * 25}%`;
    progressFill.style.width = `${n * 25}%`;
    back.hidden = n === 1;
    next.hidden = n === 4;
    error.textContent = '';
    if (n === 4) populateReview();
  }

  function validateStep(n) {
    if (n === 1 && !form.querySelector('input[name="service"]:checked')) {
      error.textContent = 'Please choose a cleaning service to continue.';
      return false;
    }
    const section = form.querySelector(`.form-step[data-step="${n}"]`);
    for (const field of section.querySelectorAll('input[required], select[required]')) {
      if (!field.checkValidity()) {
        error.textContent = field.validity.typeMismatch ? 'Please enter a valid email address.' : 'Please complete the highlighted fields before continuing.';
        field.focus();
        return false;
      }
    }
    if (n === 2) {
      const interest = form.elements.namedItem('bathroomInterest').value;
      const count = form.elements.namedItem('bathrooms').value;
      if ((interest === 'no' && !['0','unknown'].includes(count)) || (interest === 'yes' && count === '0')) {
        error.textContent = 'Please make the bathroom choices agree, or choose Not sure yet.';
        form.elements.namedItem('bathrooms').focus();
        return false;
      }
    }
    return true;
  }
  next.addEventListener('click', () => { if (validateStep(step) && step < 4) setStep(step + 1); });
  back.addEventListener('click', () => { if (step > 1) setStep(step - 1); });
  form.addEventListener('submit', event => event.preventDefault());

  const fields = ['service', 'propertyType', 'bedrooms', 'bathroomInterest', 'bathrooms', 'area', 'timing', 'notes', 'name', 'email', 'phone', 'replyPermission'];
  const labels = {service:'Service',propertyType:'Property type',bedrooms:'Bedrooms',bathroomInterest:'Bathroom cleaning',bathrooms:'Bathrooms to clean',area:'City or ZIP',timing:'Preferred timing',notes:'Notes',name:'Name',email:'Email',phone:'Phone',replyPermission:'Reply permission'};
  function readData() {
    const data = {};
    for (const key of fields) {
      const entry = key === 'service' ? form.querySelector('input[name="service"]:checked') : form.elements.namedItem(key);
      data[key] = entry ? (key === 'replyPermission' ? (entry.checked ? 'Yes — this request only' : 'No') : String(entry.value || '').trim()) : '';
    }
    return data;
  }
  function populateReview() {
    review.replaceChildren();
    const data = readData();
    for (const key of fields) {
      if (!data[key]) continue;
      const line = document.createElement('div');
      line.className = 'review-row';
      const heading = document.createElement('strong');
      heading.textContent = labels[key];
      const value = document.createElement('span');
      value.textContent = data[key];
      line.append(heading, value);
      review.appendChild(line);
    }
  }
  // Fictional fixture only. Never export entered customer data as a test record.
  document.getElementById('downloadFixture').addEventListener('click', () => {
    const fixture = {
      warning: 'SYNTHETIC FIXTURE — NOT A WILLOW CONNECT API PAYLOAD',
      source_document: 'WMS-MASTER, C-01 practice inquiry, SYN-INQ-01/WCS-FX',
      canonical_schema: 'UNVERIFIED — map through owner-approved C-01 contract',
      request: {
        selected_service_label: 'Deep cleaning',
        service_id: null,
        catalog_revision: null,
        property_type_interest: 'House',
        bathroom_interest: 'yes',
        bathroom_count: 2,
        area: 'Mankato, MN',
        name: 'Example Customer',
        email: 'customer@example.invalid',
        response_permission: true,
        response_permission_text_version: 'REQUIRES_OWNER_APPROVAL'
      },
      outcome: 'NOT SENT — NO RECEIPT — NO BOOKING'
    };
    const blob = new Blob([JSON.stringify(fixture, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href=url; anchor.download='willow-c01-fictional-example.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    URL.revokeObjectURL(url);
    copyStatus.textContent = 'Fictional example downloaded. No actual request was sent.';
  });
  document.getElementById('copyRequest').addEventListener('click', async () => {
    const values = readData();
    const text = 'Willow Cleaning Services — estimate request (UNSENT DEMO)\n\n' + fields.filter(key => values[key]).map(key => `${labels[key]}: ${values[key]}`).join('\n') + '\n\nThis is a copied preview, not a submitted request.';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const hidden = document.createElement('textarea');
        hidden.value = text;
        hidden.setAttribute('readonly', '');
        hidden.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(hidden);
        hidden.select();
        if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
        hidden.remove();
      }
      copyStatus.textContent = 'Request copied. This did not send anything to Willow.';
    } catch {
      copyStatus.textContent = 'Your browser could not copy the request. You can select and copy the details above.';
    }
  });
})();
