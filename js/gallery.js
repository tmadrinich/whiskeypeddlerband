/* ===========================
   GALLERY: auto-load photos from assets/gallery/
   Usage: <div data-gallery></div>            -> all photos
          <div data-gallery data-limit="8"></div> -> first 8 only
   Requires window.SITE_BASE to be set before this script.
   =========================== */
(function () {
  var REPO = 'tmadrinich/whiskeypeddlerband';
  var BRANCH = 'main';
  var FOLDER = 'assets/gallery';
  var CACHE_KEY = 'wpb-gallery-list-v2';
  var CACHE_TTL = 5 * 60 * 1000; // re-check the folder every 5 minutes

  var containers = document.querySelectorAll('[data-gallery]');
  if (!containers.length) return;

  var base = window.SITE_BASE || '';
  var photos = [];
  var current = 0;
  var lightbox, lbImg, lbCount;

  function isImage(name) {
    return /\.(jpe?g|png|webp|gif|avif)$/i.test(name);
  }

  function loadList() {
    try {
      var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY));
      if (cached && cached.names && Date.now() - cached.t < CACHE_TTL) {
        return Promise.resolve(cached.names);
      }
    } catch (e) {}

    var url = 'https://api.github.com/repos/' + REPO + '/contents/' + FOLDER + '?ref=' + BRANCH;
    return fetch(url)
      .then(function (res) {
        if (res.status === 404) return [];
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (items) {
        var names = items
          .filter(function (i) { return i.type === 'file' && isImage(i.name); })
          .map(function (i) { return i.name; })
          .sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true }); });
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), names: names })); } catch (e) {}
        return names;
      });
  }

  function buildLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Photo viewer');
    lightbox.innerHTML =
      '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" aria-label="Previous photo">&#8249;</button>' +
      '<img alt="" />' +
      '<button class="lb-next" aria-label="Next photo">&#8250;</button>' +
      '<div class="lb-count"></div>';
    document.body.appendChild(lightbox);

    lbImg = lightbox.querySelector('img');
    lbCount = lightbox.querySelector('.lb-count');

    lightbox.querySelector('.lb-close').addEventListener('click', close);
    lightbox.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    lightbox.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) close(); });

    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    var startX = null;
    lightbox.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  function show(i) {
    current = (i + photos.length) % photos.length;
    lbImg.src = photos[current];
    lbCount.textContent = (current + 1) + ' / ' + photos.length;
  }
  function open(i) {
    show(i);
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
  }

  function render(container, names) {
    container.innerHTML = '';
    if (!names.length) {
      container.innerHTML = '<p class="gallery-status">No photos yet — check back soon.</p>';
      return;
    }

    var limit = parseInt(container.getAttribute('data-limit'), 10);
    var shown = limit > 0 ? names.slice(0, limit) : names;

    var isCarousel = container.getAttribute('data-mode') === 'carousel';
    var grid = document.createElement('div');
    grid.className = isCarousel ? 'gallery-track' : 'gallery-grid';

    shown.forEach(function (n, i) {
      var btn = document.createElement('button');
      btn.className = 'gallery-item';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open photo ' + (i + 1));

      var img = document.createElement('img');
      img.src = photos[i];
      img.alt = 'Whiskey Peddler live photo ' + (i + 1);
      img.loading = isCarousel ? 'eager' : 'lazy';
      img.decoding = 'async';

      btn.appendChild(img);
      btn.addEventListener('click', function () { open(i); });
      grid.appendChild(btn);
    });

    if (isCarousel) buildCarousel(container, grid);
    else container.appendChild(grid);
  }

  function buildCarousel(container, track) {
    var wrap = document.createElement('div');
    wrap.className = 'gallery-carousel';

    var prev = document.createElement('button');
    prev.className = 'gc-arrow gc-prev';
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Scroll left');
    prev.innerHTML = '&#8249;';

    var next = document.createElement('button');
    next.className = 'gc-arrow gc-next';
    next.type = 'button';
    next.setAttribute('aria-label', 'Scroll right');
    next.innerHTML = '&#8250;';

    wrap.appendChild(prev);
    wrap.appendChild(track);
    wrap.appendChild(next);
    container.appendChild(wrap);

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var interval = parseInt(container.getAttribute('data-interval'), 10) || 4000;
    var timer = null;

    function step() { return Math.max(track.clientWidth * 0.8, 200); }
    function atStart() { return track.scrollLeft <= 4; }
    function atEnd() { return track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }

    function advance() {
      if (atEnd()) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: step(), behavior: 'smooth' });
    }
    function back() {
      if (atStart()) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
      else track.scrollBy({ left: -step(), behavior: 'smooth' });
    }

    function start() { if (!timer && !reduce) timer = setInterval(advance, interval); }
    function stop() { clearInterval(timer); timer = null; }

    prev.addEventListener('click', back);
    next.addEventListener('click', advance);

    // Pause while the visitor is interacting
    wrap.addEventListener('mouseenter', stop);
    wrap.addEventListener('mouseleave', start);
    wrap.addEventListener('focusin', stop);
    wrap.addEventListener('focusout', start);
    wrap.addEventListener('touchstart', stop, { passive: true });
    wrap.addEventListener('touchend', function () { setTimeout(start, 4000); }, { passive: true });

    start();
  }

  containers.forEach(function (c) {
    c.innerHTML = '<p class="gallery-status">Loading photos…</p>';
  });

  loadList()
    .then(function (names) {
      photos = names.map(function (n) { return base + FOLDER + '/' + encodeURIComponent(n); });
      if (names.length) buildLightbox();
      containers.forEach(function (c) { render(c, names); });
    })
    .catch(function () {
      containers.forEach(function (c) {
        c.innerHTML = '<p class="gallery-status">Couldn\'t load photos right now. Try refreshing.</p>';
      });
    });
})();
