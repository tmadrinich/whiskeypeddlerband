#!/usr/bin/env python3
"""
Write upcoming shows into the site's HTML so search engines can read them.

What it does
  1. Reads the calendar ID and API key from js/shows.js (single source of truth).
  2. Asks Google Calendar for upcoming events, the same query the browser makes.
  3. Rewrites the block between  <!-- shows:start -->  and  <!-- shows:end -->
     in shows/index.html and index.html with ready-made show cards.
  4. Rewrites the block between  <!-- shows-jsonld:start -->  and
     <!-- shows-jsonld:end -->  in shows/index.html with Event structured data.

js/shows.js still runs in the visitor's browser and refreshes the list live,
so this only decides what the page says before that script runs.

Run by .github/workflows/update-shows.yml every day. To run by hand:
    python3 scripts/build_shows.py
Uses only the Python standard library.
"""

import html
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://whiskeypeddlerband.com"
BAND = "Whiskey Peddler"
DEFAULT_LIMIT = 20  # same default as js/shows.js

# Pages that hold a <div data-shows> block. Structured data goes on the first only.
PAGES = ["shows/index.html", "index.html"]
JSONLD_PAGE = "shows/index.html"


def read_calendar_settings():
    """Pull CALENDAR_ID and API_KEY out of js/shows.js."""
    js = (ROOT / "js" / "shows.js").read_text(encoding="utf-8")
    cal = re.search(r"CALENDAR_ID\s*=\s*'([^']+)'", js)
    key = re.search(r"API_KEY\s*=\s*'([^']+)'", js)
    if not cal or not key:
        sys.exit("Could not find CALENDAR_ID / API_KEY in js/shows.js")
    return cal.group(1), key.group(1)


def fetch_events(calendar_id, api_key, limit):
    """Upcoming events, soonest first. Exits without touching files on any error."""
    params = urllib.parse.urlencode({
        "key": api_key,
        "timeMin": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": str(limit),
    })
    url = (
        "https://www.googleapis.com/calendar/v3/calendars/"
        + urllib.parse.quote(calendar_id, safe="")
        + "/events?" + params
    )
    request = urllib.request.Request(url, headers={"Referer": SITE + "/"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.load(response)
    except Exception as error:  # network trouble, bad key, calendar not public
        sys.exit("Calendar request failed, pages left unchanged: %s" % error)
    if "items" not in data:
        sys.exit("Calendar response had no event list, pages left unchanged.")
    return data["items"], data.get("timeZone") or "America/Chicago"


def parse_event(event, tz):
    """Normalise one Google Calendar event into what the page needs."""
    start_raw = event.get("start", {})
    end_raw = event.get("end", {})
    all_day = "dateTime" not in start_raw

    if all_day:
        start = datetime.strptime(start_raw["date"], "%Y-%m-%d")
        end = datetime.strptime(end_raw.get("date", start_raw["date"]), "%Y-%m-%d")
        start_iso, end_iso = start_raw["date"], end_raw.get("date", start_raw["date"])
    else:
        start = datetime.fromisoformat(start_raw["dateTime"].replace("Z", "+00:00")).astimezone(tz)
        end = datetime.fromisoformat(end_raw["dateTime"].replace("Z", "+00:00")).astimezone(tz)
        start_iso, end_iso = start.isoformat(), end.isoformat()

    return {
        "title": (event.get("summary") or "Show").strip(),
        "location": (event.get("location") or "").strip(),
        "all_day": all_day,
        "start": start,
        "end": end,
        "start_iso": start_iso,
        "end_iso": end_iso,
    }


def clock(moment):
    """8:00 PM, matching toLocaleTimeString in js/shows.js."""
    hour = moment.hour % 12 or 12
    return "%d:%02d %s" % (hour, moment.minute, "AM" if moment.hour < 12 else "PM")


def card_html(show, this_year, indent):
    """Same markup as card() in js/shows.js."""
    start = show["start"]
    year = " %d" % start.year if start.year != this_year else ""
    when = "All day" if show["all_day"] else "%s – %s" % (clock(start), clock(show["end"]))
    lines = [
        '<div class="event-card">',
        '  <div class="event-date">',
        '    <span class="ed-dow">%s%s</span>' % (start.strftime("%a"), year),
        '    <span class="ed-day">%s %d</span>' % (start.strftime("%b"), start.day),
        "  </div>",
        "  <div>",
        '    <div class="event-title">%s</div>' % html.escape(show["title"]),
        '    <div class="event-location">%s</div>' % html.escape(show["location"] or "Location TBD"),
        '    <div class="event-time">%s</div>' % when,
        "  </div>",
        "</div>",
    ]
    return "\n".join(indent + line for line in lines)


def place(location):
    """Split 'Venue, street, city, ST zip, USA' into a schema.org Place."""
    parts = [part.strip() for part in location.split(",") if part.strip()]
    if len(parts) >= 4:  # venue name comes first, the rest is the address
        return {"@type": "Place", "name": parts[0], "address": ", ".join(parts[1:])}
    name = ", ".join(part for part in parts if part.upper() != "USA") or location
    return {"@type": "Place", "name": name, "address": location}


def event_jsonld(show):
    return {
        "@type": "MusicEvent",
        "name": "%s: %s" % (BAND, show["title"]),
        "startDate": show["start_iso"],
        "endDate": show["end_iso"],
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": place(show["location"]),
        "performer": {"@type": "MusicGroup", "@id": SITE + "/#band", "name": BAND, "url": SITE + "/"},
        "image": SITE + "/assets/og-image.jpg",
        "url": SITE + "/shows/",
    }


def replace_block(text, name, body, path):
    """Swap everything between <!-- name:start ... --> and <!-- name:end -->."""
    pattern = re.compile(
        r"(?P<indent>[ \t]*)(?P<open><!-- %s:start[^>]*-->)\n.*?(?P<close>[ \t]*<!-- %s:end -->)"
        % (re.escape(name), re.escape(name)),
        re.S,
    )
    match = pattern.search(text)
    if not match:
        sys.exit("Missing <!-- %s:start --> / <!-- %s:end --> markers in %s" % (name, name, path))
    block = match.group("indent") + match.group("open") + "\n" + body + "\n" + match.group("close")
    return text[: match.start()] + block + text[match.end():], match.group("indent")


def main():
    calendar_id, api_key = read_calendar_settings()
    items, zone_name = fetch_events(calendar_id, api_key, DEFAULT_LIMIT)
    tz = ZoneInfo(zone_name)
    shows = [parse_event(item, tz) for item in items if item.get("status") != "cancelled"]
    this_year = datetime.now(tz).year

    for page in PAGES:
        path = ROOT / page
        text = path.read_text(encoding="utf-8")

        # The container's own attributes decide how many shows and the empty message.
        container = re.search(r"<div[^>]*\bdata-shows\b[^>]*>", text)
        if not container:
            sys.exit("No <div data-shows> found in %s" % page)
        limit_attr = re.search(r'data-limit="(\d+)"', container.group(0))
        empty_attr = re.search(r'data-empty="([^"]*)"', container.group(0))
        limit = int(limit_attr.group(1)) if limit_attr else DEFAULT_LIMIT
        empty = empty_attr.group(1) if empty_attr else "No upcoming shows."

        # First pass only finds the indent; second pass writes the real cards.
        _, indent = replace_block(text, "shows", "", page)
        chosen = shows[:limit]
        body = (
            "\n".join(card_html(show, this_year, indent) for show in chosen)
            if chosen else indent + "<p>%s</p>" % empty
        )
        text, _ = replace_block(text, "shows", body, page)

        if page == JSONLD_PAGE:
            _, indent = replace_block(text, "shows-jsonld", "", page)
            with_place = [show for show in shows if show["location"]]
            # The month stamp makes sure this file changes at least monthly,
            # which keeps GitHub from switching off the scheduled workflow.
            lines = [indent + "<!-- refreshed %s -->" % date.today().strftime("%Y-%m")]
            if with_place:
                payload = {"@context": "https://schema.org", "@graph": [event_jsonld(s) for s in with_place]}
                data = json.dumps(payload, indent=2, ensure_ascii=False).replace("</", "<\\/")
                lines.append(indent + '<script type="application/ld+json">')
                lines.extend(indent + line for line in data.split("\n"))
                lines.append(indent + "</script>")
            text, _ = replace_block(text, "shows-jsonld", "\n".join(lines), page)

        path.write_text(text, encoding="utf-8")
        print("%s: wrote %d show%s" % (page, len(chosen), "" if len(chosen) == 1 else "s"))


if __name__ == "__main__":
    main()
