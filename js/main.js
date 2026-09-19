/* ===========================
   PARTIALS: Load header + footer
   =========================== */
(async function () {
  const base = window.SITE_BASE || '';

  async function inject(id, file) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const res = await fetch(base + 'partials/' + file);
      if (!res.ok) throw new Error(res.status);
      el.innerHTML = (await res.text()).replaceAll('{{base}}', base);
    } catch (err) {
      console.error('Partial failed:', file, err);
    }
  }

  await Promise.all([
    inject('site-header', 'header.html'),
    inject('site-footer', 'footer.html'),
  ]);

  initSite();
})();

function initSite() {
  /* HEADER: Scroll state */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* FOOTER: Dynamic year */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* NAV: Highlight current page */
  const known = ['about', 'shows', 'press-kit', 'contact'];
  const segments = window.location.pathname.split('/').filter(Boolean);

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
}
