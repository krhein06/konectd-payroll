(() => {
  'use strict';
  const body = document.body;
  const header = document.querySelector('[data-header]');
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  const setHeader = () => header?.classList.toggle('scrolled', window.scrollY > 8);
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  if (navToggle && nav) {
    let lastFocus = null;
    const focusable = () => [...nav.querySelectorAll('a[href],button:not([disabled])')];
    const closeNav = () => {
      body.classList.remove('nav-open');
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open menu');
      if (lastFocus) lastFocus.focus();
    };
    const openNav = () => {
      lastFocus = document.activeElement;
      body.classList.add('nav-open');
      nav.classList.add('open');
      navToggle.setAttribute('aria-expanded', 'true');
      navToggle.setAttribute('aria-label', 'Close menu');
      requestAnimationFrame(() => focusable()[0]?.focus());
    };
    navToggle.setAttribute('aria-label', 'Open menu');
    navToggle.addEventListener('click', () => nav.classList.contains('open') ? closeNav() : openNav());
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) closeNav();
      if (e.key === 'Tab' && nav.classList.contains('open')) {
        const items = focusable();
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = [...document.querySelectorAll('.reveal')];
  if (reducedMotion || !('IntersectionObserver' in window)) revealItems.forEach(el => el.classList.add('is-visible'));
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08, rootMargin: '0px 0px -40px' });
    revealItems.forEach(el => observer.observe(el));
  }

  const params = new URLSearchParams(location.search);
  const attributionKeys = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','gbraid','wbraid'];
  const safeStore = {
    get: k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } },
    set: (k,v) => { try { sessionStorage.setItem(k,v); } catch (_) {} }
  };
  if (!safeStore.get('konectd_first_landing')) safeStore.set('konectd_first_landing', location.href);
  if (!safeStore.get('konectd_first_referrer')) safeStore.set('konectd_first_referrer', document.referrer || 'Direct');
  attributionKeys.forEach(k => { const v = params.get(k); if (v && !safeStore.get('konectd_first_' + k)) safeStore.set('konectd_first_' + k, v); });
  if (params.get('service')) safeStore.set('konectd_service_interest', params.get('service'));

  const fire = (name, detail = {}) => { if (typeof window.gtag === 'function') window.gtag('event', name, detail); };
  document.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('tel:')) fire('click_to_call', { link_url: href });
    else if (href.startsWith('mailto:')) fire('email_click', { link_url: href });
    else if (href.includes('get-started.html')) fire('comparison_cta_click', { link_url: href, link_text: link.textContent.trim() });
    else if (href.includes('partners.html')) fire('partner_cta_click', { link_url: href, link_text: link.textContent.trim() });
  });

  const markLead = source => {
    if (safeStore.get('konectd_lead_event_sent') === '1') return;
    safeStore.set('konectd_form_submitted', '1');
    safeStore.set('konectd_lead_event_sent', '1');
    fire('generate_lead', { lead_source: 'website', lead_type: safeStore.get('konectd_service_interest') || params.get('service') || 'payroll_comparison', submission_source: source });
  };
  window.addEventListener('message', event => {
    const allowed = ['https://forms-prod.apigateway.co','https://www.cdnstyles.com'];
    if (!allowed.includes(event.origin)) return;
    let message = '';
    try { message = JSON.stringify(event.data).toLowerCase(); } catch (_) { return; }
    if (/(submission|form).*(success|submitted|complete)|success.*(submission|form)/.test(message)) markLead('crm_widget');
  });
  if (body.dataset.page === 'thank-you') {
    const fromForm = params.get('submitted') === '1' || safeStore.get('konectd_form_submitted') === '1' || /get-started\.html/i.test(document.referrer);
    if (fromForm) markLead('thank_you_page');
  }

  const crmWrap = document.querySelector('.crm-widget-wrap');
  if (crmWrap) {
    const detect = () => { if (crmWrap.querySelector('iframe,form')) crmWrap.classList.add('is-loaded'); };
    detect();
    new MutationObserver(detect).observe(crmWrap, { childList: true, subtree: true });
  }

  const banner = document.querySelector('[data-cookie-banner]');
  const consentKey = 'konectd_analytics_consent';
  const setConsent = granted => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      if (granted) fire('consent_granted');
    }
  };
  let saved = null;
  try { saved = localStorage.getItem(consentKey); } catch (_) {}
  if (saved === 'granted') setConsent(true);
  if (saved === 'denied') setConsent(false);
  if (!saved && banner) banner.hidden = false;
  const save = v => { try { localStorage.setItem(consentKey, v); } catch (_) {} };
  banner?.querySelector('[data-cookie-accept]')?.addEventListener('click', () => { save('granted'); setConsent(true); banner.hidden = true; });
  banner?.querySelector('[data-cookie-essential]')?.addEventListener('click', () => { save('denied'); setConsent(false); banner.hidden = true; });
  document.querySelectorAll('[data-cookie-settings]').forEach(btn => btn.addEventListener('click', () => { if (banner) banner.hidden = false; }));
})();
