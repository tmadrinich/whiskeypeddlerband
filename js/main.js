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
  onScroll(); // run once on load
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
   PARTIALS: Load header & footer
   Reads data-partial="partials/header.html" on any element.
   =========================== */
(async function loadPartials() {
  const slots = document.querySelectorAll('[data-partial]');

  for (const slot of slots) {
    const path = slot.getAttribute('data-partial');
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      const html = await res.text();
      slot.outerHTML = html;
    } catch (err) {
      console.warn('Partial load error:', err);
    }
  }

  // Re-run scroll check after header loads
  const header = document.querySelector('.site-header');
  if (header && window.scrollY > 20) header.classList.add('scrolled');

  // Re-run footer year after footer loads
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
