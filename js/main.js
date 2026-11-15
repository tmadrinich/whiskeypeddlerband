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

  /* NAV: Phone menu toggle */
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.getElementById('nav-menu');
  if (header && toggle && menu) {
    const setOpen = (open) => {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
      header.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    // Close if the window grows past the phone layout
    window.matchMedia('(min-width: 821px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* NAV: Highlight current page */
  const known = ['about', 'shows', 'songs', 'private-events', 'press-kit', 'contact'];
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
