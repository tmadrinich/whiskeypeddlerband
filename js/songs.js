/* ===========================
   SONG LIST: search + Country / Rock / All filter
   The list itself is plain HTML in songs/index.html.
   This script only shows the controls and hides rows that don't match.
   =========================== */
(function () {
  var controls = document.getElementById('song-controls');
  var search = document.getElementById('song-search');
  var count = document.getElementById('song-count');
  var empty = document.getElementById('song-empty');
  if (!controls || !search) return;

  var buttons = controls.querySelectorAll('.filter-btn');
  var sections = document.querySelectorAll('[data-section]');
  var genre = 'all';

  // Lowercase, drop accents and punctuation so "motley crue" finds "Mötley Crüe"
  function norm(s) {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  var rows = [];
  document.querySelectorAll('.song-list li').forEach(function (li) {
    rows.push({
      el: li,
      text: norm(li.textContent),
      genre: li.closest('.song-group').getAttribute('data-genre'),
    });
  });

  function apply() {
    var q = norm(search.value);
    var shown = 0;

    rows.forEach(function (row) {
      var match = (genre === 'all' || row.genre === genre) && (!q || row.text.indexOf(q) !== -1);
      row.el.hidden = !match;
      if (match) shown++;
    });

    sections.forEach(function (section) {
      var visibleGroups = 0;
      section.querySelectorAll('.song-group').forEach(function (group) {
        var has = !!group.querySelector('li:not([hidden])');
        group.hidden = !has;
        if (has) visibleGroups++;
      });
      section.hidden = visibleGroups === 0;
      section.querySelector('.song-groups').classList.toggle('single', visibleGroups === 1);
    });

    empty.hidden = shown !== 0;
    count.textContent = shown === rows.length
      ? rows.length + ' songs'
      : shown + ' of ' + rows.length + ' songs';
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      genre = btn.getAttribute('data-filter');
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      apply();
    });
  });

  search.addEventListener('input', apply);

  controls.hidden = false;
  apply();
})();
