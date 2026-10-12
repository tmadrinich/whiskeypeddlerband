/* ===========================
   SHOWS: upcoming dates from the band's public Google Calendar
   Usage: <div data-shows></div>               -> up to 20 shows
          <div data-shows data-limit="3"></div> -> next 3 only
   =========================== */
(function () {
  // Calendar must be shared publicly for the API to read it.
  var CALENDAR_ID = 'booking@whiskeypeddlerband.com';
  var API_KEY = 'AIzaSyB_RBE2uJrIboCbq2kArZixFyv91zBUOBA';

  var containers = document.querySelectorAll('[data-shows]');
  if (!containers.length) return;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var timeOpts = { hour: 'numeric', minute: '2-digit', hour12: true };

  function card(event) {
    var allDay = !event.start.dateTime;
    var start = new Date(event.start.dateTime || event.start.date + 'T00:00:00');
    var end = new Date(event.end.dateTime || event.end.date + 'T00:00:00');

    var dow = start.toLocaleDateString('en-US', { weekday: 'short' });
    var day = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    var year = start.getFullYear() !== new Date().getFullYear() ? ' ' + start.getFullYear() : '';
    var timeStr = allDay
      ? 'All day'
      : start.toLocaleTimeString('en-US', timeOpts) + ' – ' + end.toLocaleTimeString('en-US', timeOpts);

    return '' +
      '<div class="event-card">' +
        '<div class="event-date">' +
          '<span class="ed-dow">' + dow + year + '</span>' +
          '<span class="ed-day">' + day + '</span>' +
        '</div>' +
        '<div>' +
          '<div class="event-title">' + esc(event.summary || 'Show') + '</div>' +
          '<div class="event-location">' + esc(event.location || 'Location TBD') + '</div>' +
          '<div class="event-time">' + timeStr + '</div>' +
        '</div>' +
      '</div>';
  }

  var maxNeeded = 0;
  containers.forEach(function (el) {
    maxNeeded = Math.max(maxNeeded, parseInt(el.getAttribute('data-limit'), 10) || 20);
  });

  var url =
    'https://www.googleapis.com/calendar/v3/calendars/' +
    encodeURIComponent(CALENDAR_ID) +
    '/events?key=' + API_KEY +
    '&timeMin=' + encodeURIComponent(new Date().toISOString()) +
    '&singleEvents=true&orderBy=startTime&maxResults=' + maxNeeded;

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var items = data.items || [];
      containers.forEach(function (el) {
        var limit = parseInt(el.getAttribute('data-limit'), 10) || 20;
        var list = items.slice(0, limit);
        el.innerHTML = list.length
          ? list.map(card).join('')
          : '<p>' + esc(el.getAttribute('data-empty') || 'No upcoming shows.') + '</p>';
      });
    })
    .catch(function (err) {
      console.error('Shows fetch error:', err);
      containers.forEach(function (el) {
        el.innerHTML = '<p>Failed to load events.</p>';
      });
    });
})();
