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

## Scrims and history

**New scrim** files the current scrim in **History** (only if something was played) and starts
an empty one, optionally keeping the team list. History groups scrims by day; click a name to
rename it, **View** shows the final rankings and only the matches that were played, and
**Reopen** makes an old scrim current again. History is saved in this browser only.

## Eliminations

Following the V5RC Override manual:

- **Alliance Selection** (T14, T16): the suggested number of Alliances comes from the team count.
  Captains go in rank order. A team that declines can't be invited again but can still captain.
  Selection ends early if a captain has nobody left to invite. **Undo** reverts the last invitation.
- **Bracket** (T17): the 16-Alliance bracket, with Byes for top seeds at smaller events. Red is
  the higher seed.
- **Best of 1 / Best of 3** (T18): every round is Best of 1; Finals can be set to Best of 3.
- **Ties** (T19): a tie is replayed after the round's other matches, and the higher seed
  advances after 2 ties (3 in a Best of 1 Finals). Best of 3 Finals follow T19's 0-0, 1-0 and
  1-1 limits.
- **Disqualifications** (GG6): a DQ takes out the whole Alliance. If both are DQ'd, the match is replayed.

The display shows the selection board during Alliance Selection and the bracket during eliminations.

## Rules

Point values (WP per win/tie/AWP, AP for auton win/tie) and timer lengths are in
[`src/settings.ts`](src/settings.ts).
