/* ===========================
   HEADER: Scroll state
   =========================== */
(function () {
  const header = document.querySelector('.site-header');
  if (!header) return;

  function onScroll() {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ===========================
   FOOTER: Dynamic year
   =========================== */
(function () {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();

/* ===========================
   NAV: Highlight current page
   =========================== */
(function () {
  const known = ['about', 'shows', 'press-kit', 'contact'];
  let segments = window.location.pathname.split('/').filter(Boolean);

  if (segments[segments.length - 1] === 'index.html') {
    segments.pop();
  }

  const last = segments[segments.length - 1] || '';
  const key = known.includes(last) ? last : 'home';

  document.querySelectorAll('[data-page]').forEach((link) => {
    if (link.getAttribute('data-page') === key) {
      link.classList.add('active');
    }
  });
})();
