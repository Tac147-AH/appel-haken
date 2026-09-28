(function() {
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

  // --- Floating CTA: shown once the hero has left the viewport, hidden while the contact section is in view ---
  var floatCta = document.getElementById('floatCta');
  var hero = document.getElementById('heroSection');
  var diagSection = document.getElementById('contact');
  var heroInView = true;
  var contactInView = false;
  var floatObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.target === hero) heroInView = e.isIntersecting;
      else if (e.target === diagSection) contactInView = e.isIntersecting;
    });
    var show = !heroInView && !contactInView;
    floatCta.classList.toggle('show', show);
    floatCta.inert = !show || menuOpen; // not focusable, clickable or announced once hiding starts (the fade-out still plays)
  }, { threshold: 0 });
  floatObs.observe(hero);
  floatObs.observe(diagSection);

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

})();
