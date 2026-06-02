# wakemeup

WakeMeUp.at is a static online alarm clock that can be hosted on GitHub Pages.

## Local preview

Serve the repository root with any static file server, for example:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## URL alarm format

The site preserves the original URL-based alarm behavior. A path ending in one to four digits sets the alarm time:

- `/7` or `/07` sets 07:00
- `/730` sets 07:30
- `/0730` sets 07:30
- `/2330` sets 23:30

Invalid times, such as `/2460`, are ignored.

## Browser sound prompt

Chrome and other modern browsers may block alarm audio until the visitor interacts with the page. For alarms opened from URL paths like `/0730`, WakeMeUp.at shows an "Arm alarm" prompt so the user can intentionally enable sound before the timer ends.

## GitHub Pages routing

GitHub Pages does not rewrite arbitrary paths to `index.html`. The included `404.html` is intentionally a copy of the app shell so paths like `/0730` still load the alarm app and can be parsed by JavaScript.
