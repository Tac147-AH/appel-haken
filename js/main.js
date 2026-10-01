(function() {
  // --- Site config ---
  var CONFIG = {
    // Optional "Book 20 min" link next to the email fallback in #contact; leave empty to hide it.
    // TODO: Brian — set to your scheduling URL (e.g. a Cal.com or Calendly 20-minute event).
    calendarUrl: ''
  };

  // --- Analytics hook: forwards events to whichever cookieless provider is loaded (see README, "Analytics").
  // A no-op until one is enabled. Events: "CTA Open" {location}, "Form Submit Success" {timing}.
  function track(name, props) {
    try {
      if (typeof window.plausible === 'function') window.plausible(name, { props: props });
      if (window.zaraz && typeof window.zaraz.track === 'function') window.zaraz.track(name, props);
    } catch (err) { /* analytics must never break the page */ }
  }

  // --- Scroll reveal (IntersectionObserver) ---
  const reveals = document.querySelectorAll('.reveal');
  const revealObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        revealObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(function(el) { revealObs.observe(el); });

  // --- Nav scroll shadow ---
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function() {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // --- Header height -> --header-h (anchor offset and mobile menu position) ---
  var root = document.documentElement;
  function syncHeaderHeight() {
    root.style.setProperty('--header-h', Math.ceil(nav.getBoundingClientRect().height) + 'px');
  }
  syncHeaderHeight();
  if ('ResizeObserver' in window) {
    new ResizeObserver(syncHeaderHeight).observe(nav);
  } else {
    window.addEventListener('resize', syncHeaderHeight);
    window.addEventListener('load', syncHeaderHeight);
  }

  // --- Floating CTA (small screens; CSS keeps it display:none on desktop, where the header CTA is always visible) ---
  // Shown once the hero has left the viewport and the reader scrolls back up; hidden while scrolling down
  // (so it never sits over text being read) and while the contact section is in view.
  var floatCta = document.getElementById('floatCta');
  var hero = document.getElementById('heroSection');
  var diagSection = document.getElementById('contact');
  var heroInView = true;
  var contactInView = false;
  var scrollingDown = false;
  var lastScrollY = window.scrollY;
  function updateFloatCta() {
    var show = !heroInView && !contactInView && !scrollingDown;
    floatCta.classList.toggle('show', show);
    floatCta.inert = !show || menuOpen; // not focusable, clickable or announced once hiding starts (the fade-out still plays)
  }
  var floatObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.target === hero) heroInView = e.isIntersecting;
      else if (e.target === diagSection) contactInView = e.isIntersecting;
    });
    updateFloatCta();
  }, { threshold: 0 });
  floatObs.observe(hero);
  floatObs.observe(diagSection);
  window.addEventListener('scroll', function() {
    var y = window.scrollY;
    if (Math.abs(y - lastScrollY) < 12) return; // ignore jitter and small momentum adjustments
    var down = y > lastScrollY;
    lastScrollY = y;
    if (down !== scrollingDown) {
      scrollingDown = down;
      updateFloatCta();
    }
  }, { passive: true });

  // --- Mobile menu ---
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('mobileOverlay');
  var mobileQuery = window.matchMedia('(max-width: 768px)');
  var menuOpen = false;
  var hideTimer = null;

  // While the menu is open, everything outside the header and the menu is inert
  function setBackgroundInert(state) {
    Array.prototype.forEach.call(document.body.children, function(el) {
      if (el === nav || el === mobileMenu || el === overlay || el.tagName === 'SCRIPT') return;
      el.inert = state || (el === floatCta && !floatCta.classList.contains('show'));
    });
  }

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    clearTimeout(hideTimer);
    mobileMenu.hidden = false;
    overlay.hidden = false;
    mobileMenu.inert = false;
    void mobileMenu.offsetWidth; // start from the closed position so the slide-in transition runs
    mobileMenu.classList.add('open');
    overlay.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    setBackgroundInert(true);
    document.body.style.overflow = 'hidden';
    var firstLink = mobileMenu.querySelector('a');
    if (firstLink) firstLink.focus({ preventScroll: true });
  }

  function closeMenu(returnFocus) {
    if (!menuOpen) return;
    menuOpen = false;
    mobileMenu.classList.remove('open');
    overlay.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.inert = true; // unreachable immediately; fully hidden once the slide-out finishes
    setBackgroundInert(false);
    document.body.style.overflow = '';
    if (returnFocus) hamburger.focus();
    var duration = parseFloat(getComputedStyle(mobileMenu).transitionDuration) || 0;
    hideTimer = setTimeout(function() {
      mobileMenu.hidden = true;
      overlay.hidden = true;
    }, duration * 1000);
  }

  hamburger.addEventListener('click', function() {
    if (menuOpen) closeMenu(true);
    else openMenu();
  });
  overlay.addEventListener('click', function() { closeMenu(true); });
  // The header logo (home link) stays reachable while the menu is open; activating it closes the menu and keeps focus on the logo
  nav.querySelector('.nav-logo').addEventListener('click', function() { closeMenu(false); });
  mobileMenu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', function() {
      // In-page links let the browser move focus to the chosen section; other links return focus to the menu button
      closeMenu(a.getAttribute('href').charAt(0) !== '#');
    });
  });
  document.addEventListener('keydown', function(e) {
    if (menuOpen && (e.key === 'Escape' || e.key === 'Esc')) closeMenu(true);
  });

  // Leaving the mobile breakpoint (resize or rotation) while the menu is open resets the navigation
  function onBreakpointChange(e) {
    if (!e.matches) closeMenu(false);
  }
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onBreakpointChange);
  else if (mobileQuery.addListener) mobileQuery.addListener(onBreakpointChange);

  // --- Primary CTAs: the link scrolls to the form (#request); focus then moves to the form heading ---
  var requestHeading = document.getElementById('requestHeading');
  document.querySelectorAll('[data-cta]').forEach(function(a) {
    a.addEventListener('click', function() {
      track('CTA Open', { location: a.getAttribute('data-cta') });
      // Let the in-page navigation run first so focusing does not interrupt the smooth scroll
      setTimeout(function() { requestHeading.focus({ preventScroll: true }); }, 0);
    });
  });

  // --- Optional scheduling link ---
  if (CONFIG.calendarUrl) {
    document.getElementById('calendarLink').href = CONFIG.calendarUrl;
    document.getElementById('calendarWrap').hidden = false;
  }

  // --- Contact form: submit in place; without JS the browser posts to the same endpoint ---
  var form = document.getElementById('requestForm');
  var formError = document.getElementById('requestError');
  var formSuccess = document.getElementById('requestSuccess');
  var submitBtn = form.querySelector('.request-submit');
  var submitLabel = submitBtn.querySelector('.request-submit-label');
  var submitText = submitLabel.textContent;
  var sending = false;

  function showFormError(message) {
    formError.innerHTML = '';
    formError.appendChild(document.createTextNode(message + ' You can also email '));
    var link = document.createElement('a');
    link.href = 'mailto:contact@appelhaken.com';
    link.textContent = 'contact@appelhaken.com';
    formError.appendChild(link);
    formError.appendChild(document.createTextNode('.'));
    formError.hidden = false;
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (sending) return;
    sending = true;
    formError.hidden = true;
    submitBtn.disabled = true;
    submitLabel.textContent = 'Sending…';

    var data = {};
    new FormData(form).forEach(function(value, key) { data[key] = value; });

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(res) {
      return res.json().catch(function() { return {}; }).then(function(body) {
        if (!res.ok || !body.ok) throw { userMessage: body.error };
      });
    }).then(function() {
      track('Form Submit Success', { timing: data.urgency || 'not-specified' });
      form.hidden = true;
      formSuccess.hidden = false;
      formSuccess.focus();
    }).catch(function(err) {
      // Messages from the endpoint are written for people; network failures get the generic one
      showFormError((err && err.userMessage) || 'That didn’t go through.');
    }).then(function() {
      sending = false;
      submitBtn.disabled = false;
      submitLabel.textContent = submitText;
    });
  });

})();
