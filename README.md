# Guitar Habit

Fifteen minutes a day. Two acoustic songs in twelve weeks. Runs on the Mac Mini, used from your iPhone.

- **Song 1, weeks 1 to 8:** A Horse with No Name (Em, D6/9). Two chords, one strumming pattern.
- **Song 2, weeks 9 to 12:** Knockin' on Heaven's Door (G, D, Am, C). Same strumming pattern, four new chords.

Every day is a 14 to 15 minute session of three to five timed blocks: warm-up, a chord or
technique drill, strumming or a play-along with the built-in metronome, and a cool-down.
Day 7 of each week is a review day with a check-in and a prompt to record yourself.
After day 84 the app keeps serving maintenance days so the habit does not end with the program.

## Run it

```bash
node server.js
```

Then open `http://localhost:4321` on the Mac, or on your phone (same Wi-Fi):

```
http://Vamsees-Mac-mini.local:4321
```

If the `.local` name does not resolve on the phone, use the Mac's IP, which the server prints on start.

### Start at login, restart if it crashes

```bash
./install-service.sh
```

This copies `com.vj.guitar-habit.plist` into `~/Library/LaunchAgents` and loads it. Logs go to
`data/server.log`. Remove it with `./install-service.sh uninstall`.

### Put it on the iPhone home screen

1. Open the address above in Safari.
2. Tap Share, then **Add to Home Screen**.
3. It opens full-screen like an app, with no browser chrome.

Tip: iPhone screens lock during long blocks. Set Settings → Display & Brightness → Auto-Lock to
5 minutes, or just tap the screen now and then. The block timer chimes when time is up.

## What is where

| Path | What it is |
| --- | --- |
| `server.js` | Node server, no dependencies. Static files plus a small JSON API. |
| `public/curriculum.js` | The whole program as data: chords, patterns, songs, 12 weeks of blocks. Edit freely. |
| `public/app.js` | The client: session runner, metronome, chord trainer, play-along, progress. |
| `data/state.json` | Your progress. One file. Back it up or export it from Settings. |

## How progression works

- **Completion based, not calendar based.** Finishing a session advances to the next day. Missing
  a day never skips content; it only breaks the streak. The app says so when you come back.
- **Streak** counts consecutive calendar days with at least one session.
- **Only have 5 minutes?** runs a trimmed two-block version of the day. It still counts, still advances.
- **One-minute changes** are logged per chord pair with personal bests, charted on the Progress tab.
- **Clean tempo** per song is logged from any play-along with "That tempo felt clean".
- **Badges** for the first session, 7 and 30 day streaks, coming back after a gap, each song, and more.
- **Lessons tab** lists all 84 days. Open any day to read it or replay it. Replays log practice
  (streak, minutes, changes) but never move the program forward, so previewing day 40 doesn't skip days 2 to 39.
- **Instructor homework** (Settings): list the chords your teacher assigned, for example `A, D, E, G, C`,
  and every session gets a short extra block: the shapes on odd days, a one-minute changes round on one
  of the pairs on even days. The pairs also appear first in the Tools changes counter.
- Settings lets you set the current day by hand to repeat a week or skip ahead, and reset with a backup.

## API

| Call | Does |
| --- | --- |
| `GET /api/state` | Full state plus computed stats |
| `POST /api/session` | Log a session `{date, day, minutes, mood, win, short, replay}` |
| `POST /api/metric` | Log `{type:'changes', pair, count}` or `{type:'tempo', song, bpm}` |
| `POST /api/profile` | Set `{name}`, `{currentDay}`, or `{homework: {chords, minutes}}` |
| `GET /api/export` | Download the state file |
| `POST /api/reset` | `{confirm:'RESET'}`, keeps a backup in `data/` |

## Changing the program

Everything is in `public/curriculum.js`. To add a song, add an entry to `SONGS` with its chords,
tempo, pattern and sections, and any chord shapes it needs to `CHORDS`. Weeks are functions of the
day-in-week, so one week definition produces seven varied days. Reload the page, no build step.
