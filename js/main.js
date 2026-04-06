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

  // --- Floating CTA ---
  var floatCta = document.getElementById('floatCta');
  var hero = document.getElementById('heroSection');
  var diagSection = document.getElementById('contact');
  var floatObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.target === hero) {
        if (!e.isIntersecting) {
          // Check if contact section is visible
          var dRect = diagSection.getBoundingClientRect();
          var diagVisible = dRect.top < window.innerHeight && dRect.bottom > 0;
          floatCta.classList.toggle('show', !diagVisible);
        } else {
          floatCta.classList.remove('show');
        }
      }
    });
  }, { threshold: 0 });
  floatObs.observe(hero);

  // Hide float CTA when contact section is visible
  var diagObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) floatCta.classList.remove('show');
      else if (!hero.getBoundingClientRect().bottom > 0) floatCta.classList.add('show');
    });
  }, { threshold: 0.1 });
  diagObs.observe(diagSection);

  // --- Mobile menu ---
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('mobileOverlay');

  function toggleMenu() {
    var open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    overlay.style.display = open ? 'block' : 'none';
    requestAnimationFrame(function() {
      overlay.classList.toggle('open', open);
    });
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function closeMenu() {
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    overlay.classList.remove('open');
    setTimeout(function() { overlay.style.display = 'none'; }, 300);
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', closeMenu);
  mobileMenu.querySelectorAll('a').forEach(function(a) {
    a.addEventListener('click', closeMenu);
  });

})();
