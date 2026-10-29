# VEX Tournament Manager

A small single-page app for running a VEX V5RC scrimmage: teams, qualification schedule,
score entry, live rankings and an audience display with a match timer. It has no backend
and no field control. All state lives in the browser's localStorage. Use Export/Import JSON
to move an event between laptops.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # ranking + schedule unit tests
```

The audience display is at `#/display` (or `/display` on a server). Press **F** for fullscreen.
It updates live when scores are entered in another tab of the same browser.

## Offline build

```bash
npm run build
```

This produces a single self-contained `dist/index.html`. Copy it to the venue laptop and
double-click it. No server or internet is needed. Open `dist/index.html#/display` in a second
window for the projector.

## Rules

Point values (WP per win/tie/AWP, AP for auton win/tie) and timer lengths are in
[`src/settings.ts`](src/settings.ts).
