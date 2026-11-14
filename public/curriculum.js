/* Guitar Habit: the 12-week program.
   This file is data, not logic. Edit chords, songs, or weeks freely. */
window.CURRICULUM = (() => {
  // Strings are listed low E -> high E. 'x' = don't play, 0 = open.
  const CHORDS = {
    'Em':   { full: 'E minor', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0],
      tip: 'Middle finger on the A string, ring finger on the D string, both at the 2nd fret. Arch the fingertips so the open strings ring clearly.' },
    'D6/9': { full: 'D six-nine, the "Horse" chord', frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3],
      tip: 'Scary name, friendly shape. Index on the low E, middle on the G, pinky on the B, ring on the high E. All six strings ring.' },
    'G':    { full: 'G major', frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3],
      tip: 'Middle finger on the low E at the 3rd fret, index on the A at the 2nd, ring on the high E at the 3rd. Keep the index low so the D string rings.' },
    'D':    { full: 'D major', frets: ['x', 'x', 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2],
      tip: 'A small triangle: index on the G, ring on the B, middle on the high E. Strum only the top four strings and let the pick skip the two bass strings.' },
    'Am':   { full: 'A minor', frets: ['x', 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0],
      tip: 'Middle and ring on the D and G at the 2nd fret, index on the B at the 1st. Skip the low E.' },
    'C':    { full: 'C major', frets: ['x', 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0],
      tip: 'Ring on the A at the 3rd fret, middle on the D at the 2nd, index on the B at the 1st. Coming from Am, only the ring finger moves.' },
  };

  // Eight slots per bar (eighth notes). D = down strum, U = up strum, '' = hand keeps moving, misses the strings.
  const PATTERNS = {
    down4:    { name: 'Four downs',  slots: ['D', '', 'D', '', 'D', '', 'D', ''],  say: 'DOWN, DOWN, DOWN, DOWN',
      hint: 'One down strum on every click. Even volume beats speed.' },
    d_du:     { name: 'D DU D DU',   slots: ['D', '', 'D', 'U', 'D', '', 'D', 'U'], say: 'DOWN, DOWN-up, DOWN, DOWN-up',
      hint: 'A stepping stone. The up strum is light: just the top three strings.' },
    d_du_udu: { name: 'D DU UDU',    slots: ['D', '', 'D', 'U', '', 'U', 'D', 'U'], say: 'DOWN, DOWN-up, up-DOWN-up',
      hint: 'The campfire strum. Your hand never stops moving down and up. On the gaps you simply miss the strings.' },
  };

  const alt = (n, a, b) => Array.from({ length: n }, (_, i) => (i % 2 ? b : a));

  const SONGS = {
    horse: {
      id: 'horse', title: 'A Horse with No Name', artist: 'America', year: 1972,
      chords: ['Em', 'D6/9'], bpm: 122, pattern: 'd_du_udu',
      sections: [
        { name: 'Intro',   bars: alt(4, 'Em', 'D6/9') },
        { name: 'Verse 1', bars: alt(16, 'Em', 'D6/9') },
        { name: 'Chorus',  bars: alt(8, 'Em', 'D6/9') },
        { name: 'Verse 2', bars: alt(16, 'Em', 'D6/9') },
        { name: 'Chorus',  bars: alt(8, 'Em', 'D6/9') },
        { name: 'Outro',   bars: alt(8, 'Em', 'D6/9') },
      ],
      notes: [
        'The entire song is two chords, one bar each, start to finish. Once the switch is automatic, the song is yours.',
        'The record sits near 122 bpm. You will reach it in week 7. Slow and clean always beats fast and buzzy.',
        'Hum the melody over your strumming from week 5 on. Singing while playing is its own skill and it starts with humming.',
        'This is a practice chart, not a transcription. Listen to the recording for the feel and the lyrics.',
      ],
    },
    knockin: {
      id: 'knockin', title: "Knockin' on Heaven's Door", artist: 'Bob Dylan', year: 1973,
      chords: ['G', 'D', 'Am', 'C'], bpm: 70, pattern: 'd_du_udu',
      sections: [
        { name: 'Verse 1', bars: ['G', 'D', 'Am', 'Am', 'G', 'D', 'C', 'C'] },
        { name: 'Chorus',  bars: ['G', 'D', 'Am', 'Am', 'G', 'D', 'C', 'C'] },
        { name: 'Verse 2', bars: ['G', 'D', 'Am', 'Am', 'G', 'D', 'C', 'C'] },
        { name: 'Chorus',  bars: ['G', 'D', 'Am', 'Am', 'G', 'D', 'C', 'C'] },
        { name: 'Outro',   bars: ['G', 'D', 'Am', 'Am', 'G', 'D', 'C', 'C'] },
      ],
      notes: [
        'Same strumming pattern as the Horse, at a much gentler tempo. Your right hand already knows this song.',
        'Verse and chorus are the same eight bars. Learn eight bars and you have learned the song.',
        'The D to Am change is the hardest one. Give it its own minute every day in week 10.',
        'This is a practice chart, not a transcription. Listen to the recording for the feel and the lyrics.',
      ],
    },
  };

  // Block builders. Every block has a type, title, minutes, and a few short lines of instruction.
  const warm = (minutes, lines, title = 'Warm-up') => ({ type: 'text', title, minutes, lines });
  const cool = (minutes, lines) => ({ type: 'text', title: 'Cool-down', minutes, lines });
  const chord = (minutes, chords, lines, title) => ({ type: 'chord', title: title || (chords.length === 1 ? `The ${chords[0]} chord` : 'Chord shapes'), minutes, chords, lines });
  const changes = (minutes, pair, lines, rounds = 1) => ({ type: 'changes', title: 'One-minute changes', minutes, pair, rounds, lines });
  const strum = (minutes, bpm, pattern, chords, barsPerChord, lines, title = 'Strumming') => ({ type: 'metronome', title, minutes, bpm, pattern, chords, barsPerChord, lines });
  const play = (minutes, song, sectionNames, bpm, pattern, lines, title) => ({ type: 'playalong', title: title || `Play-along: ${SONGS[song].title}`, minutes, song, sections: sectionNames, bpm, pattern: pattern || SONGS[song].pattern, lines });

  const TUNE = 'Tune up first: the reference tones are under Tools, or use any tuner app.';
  const POSTURE = 'Sit on the front edge of a chair, guitar waist on your right thigh, neck tilted up a little. Pick between thumb and index with about 3 mm showing.';
  const SPIDER = 'Spider walk: fingers 1-2-3-4 on frets 1-2-3-4 of the low E string, one finger per fret. Walk across all six strings and back, slowly.';

  const WEEKS = [
    { title: 'Meet your guitar', phase: 'Song 1',
      goal: 'Hold a clean Em chord and strum all six strings on a steady beat.',
      why: 'Everything later is built on one clean chord and a relaxed strumming arm. This week is about showing up, not sounding good.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, SPIDER]),
        chord(4, ['Em'], ['Form Em from nothing ten times. Count how many seconds the slowest one takes.', 'Pluck each string after forming it. Every string should ring.']),
        strum(5, 60, 'down4', ['Em'], 4, ['One down strum per click, all six strings, for the whole block.', 'Keep the wrist loose. Move from the elbow, like shaking water off your hand.']),
        warm(3, ['Record 20 seconds of yourself strumming Em on your phone. You will want this in week 12.', 'Then log how the week felt. Fingertip soreness is the only thing that should hurt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, POSTURE, d <= 2 ? 'Strum the open strings a few times. Listen to how the guitar rings.' : SPIDER]),
        chord(5, ['Em'], [
          'Middle finger on the A string, ring finger on the D string, both at the 2nd fret, snug up against the fret wire.',
          'Strum once. Then pluck each string one at a time. A buzz means arch the finger more or move it closer to the fret.',
          'Release the chord fully, then rebuild it. Build, check, release, repeat for the whole block.',
          ...(d >= 4 ? ['Try forming it with your eyes closed. Let your fingers find it by feel.'] : []),
        ]),
        strum(5, 60, 'down4', ['Em'], 4, [
          d <= 2 ? 'First two minutes on open strings with no chord. Then hold Em and keep going.' : 'Hold Em and strum one down strum on every click.',
          'Move from the elbow with a loose wrist. The pick should brush through, not dig in.',
          'Same volume on every strum. Speed is for later.',
        ]),
        cool(2, ['Shake out both hands.', d === 1 ? 'Sore fingertips tonight are normal. Calluses arrive around week 3.' : 'Press each fingertip gently. Soreness means the calluses are coming.', 'Log one small win, even if it is "I showed up".']),
      ] },

    { title: 'The second chord', phase: 'Song 1',
      goal: 'A clean D6/9 chord, and a slow Em to D6/9 switch without losing the count.',
      why: 'The Horse is only Em and D6/9. Learn this shape and you know every chord in the song.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, 'Build Em five times, then D6/9 five times.']),
        changes(3, ['Em', 'D6/9'], ['Your first measured baseline. Tap once each time you land the new chord cleanly.', 'Whatever the number is, it is your number. It only goes up from here.']),
        strum(5, 60, 'down4', ['Em', 'D6/9'], 2, ['Two bars on each chord, then switch. Start moving your fingers on the last strum of the bar.', 'If the switch is late, keep strumming anyway. Rhythm first, fingers catch up.']),
        warm(3, ['Record 20 seconds of switching between the two chords.', 'Log how the week felt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, 'Build Em five times to wake up the fingers.', SPIDER]),
        chord(5, ['D6/9'], [
          'Index on the low E at the 2nd fret, middle on the G at the 2nd, pinky on the B at the 3rd, ring on the high E at the 2nd.',
          'Strum once, then pluck each string. The A and D strings are open and should ring freely.',
          'Build, check, release, repeat. It feels like a stretch at first. It stops feeling that way around day 4.',
        ]),
        strum(5, d <= 3 ? 50 : 60, 'down4', ['Em', 'D6/9'], d <= 3 ? 4 : 2, [
          d <= 3 ? 'Four bars on Em, four bars on D6/9, one down strum per click.' : 'Two bars on each chord now. The switch gets twice as frequent.',
          'Begin moving your fingers during the last strum of the bar, even if the next chord is messy at first.',
          'Never stop the strumming hand to wait for the fretting hand.',
        ]),
        d >= 5 ? changes(2, ['Em', 'D6/9'], ['Tap once per clean change. This is a baseline, not a test.']) : cool(2, ['Shake out both hands.', 'Stretch the fingers wide, then make a fist. Ten times.', 'Log one small win.']),
      ] },

    { title: 'Changes', phase: 'Song 1',
      goal: 'Twenty clean changes a minute, and chord switches every bar at 80 bpm.',
      why: 'Speed of switching is what separates "knowing chords" from "playing a song". It comes from reps, and reps are easy in fifteen minutes.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, SPIDER]),
        changes(4, ['Em', 'D6/9'], ['Two rounds. Rest between them and shake out the hand.', 'Compare to last week. Write the number somewhere you will see it.'], 2),
        play(5, 'horse', ['Intro', 'Verse 1'], 80, 'down4', ['Four down strums per bar, new chord every bar. This is the skeleton of the song.']),
        warm(3, ['Record 30 seconds of the intro and verse.', 'Log how the week felt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, SPIDER, 'Then build each chord five times.']),
        changes(4, ['Em', 'D6/9'], [
          'Round one: go as fast as you can while every chord still rings.',
          'Rest 30 seconds. Round two: try to beat round one by one.',
          'Look for a finger that can move early or stay close to the string. Small movements win.',
        ], 2),
        strum(5, d <= 3 ? 70 : 80, 'down4', ['Em', 'D6/9'], 1, [
          'One bar per chord now: four strums, switch, four strums, switch.',
          'Count out loud: ONE two three four, ONE two three four. Change on the ONE.',
          'If you miss a change, keep strumming and catch the next one.',
        ]),
        play(3, 'horse', ['Intro'], d <= 3 ? 70 : 80, 'down4', ['Your first bars of the actual song. Just the intro, four bars, on repeat.', 'Watch the chord name change and move with it.']),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: 'The strum', phase: 'Song 1',
      goal: 'Play the D DU UDU pattern at 70 bpm, switching chords every bar.',
      why: 'This one pattern plays thousands of songs, including both of yours. Learn it once on a single chord, then add the changes.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, 'One minute of changes to wake up the hands.']),
        strum(4, 70, 'd_du_udu', ['Em'], 8, ['The pattern on one chord. Say it out loud while you play: DOWN, DOWN-up, up-DOWN-up.']),
        play(6, 'horse', ['Intro', 'Verse 1'], 70, 'd_du_udu', ['Milestone: the first 20 bars of the song with the real strumming pattern.', 'Messy is fine. Finishing without stopping is the goal.']),
        warm(3, ['Record the intro and verse. Compare with week 1. That is a month of fifteen minutes.', 'Log how the week felt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, SPIDER]),
        strum(5, d <= 3 ? 60 : 70, 'd_du_udu', ['Em'], 8, [
          'Only one chord. All attention on the right hand.',
          'Say it out loud: DOWN, DOWN-up, up-DOWN-up. The hand swings down and up constantly; on the gaps you miss the strings on purpose.',
          'Up strums are light and only catch the top three or four strings.',
        ]),
        strum(4, d <= 3 ? 60 : 65, 'd_du_udu', ['Em', 'D6/9'], d <= 3 ? 2 : 1, [
          d <= 3 ? 'Now add the change every two bars.' : 'Now the change comes every bar, like the song.',
          'The pattern ends with an up strum. Move your fingers during that up strum.',
        ]),
        play(3, 'horse', ['Intro', 'Verse 1'], d <= 3 ? 60 : 65, 'd_du_udu', ['Slow, with the real pattern. Keep the hand moving no matter what the fingers do.']),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: 'Groove', phase: 'Song 1',
      goal: 'The whole song structure at 85 bpm with the pattern.',
      why: 'From here on, most of each session is playing the song. Practice is starting to feel like playing.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, 'One minute of changes.']),
        play(9, 'horse', 'all', 85, null, ['The full structure, start to finish, at 85.', 'Hum the melody over it. Even badly. Especially badly.']),
        warm(3, ['Record the whole run. Note the tempo in the song page if it felt clean.', 'Log how the week felt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, 'Build each chord five times, then one minute of changes at a relaxed pace.']),
        strum(3, d <= 3 ? 80 : 85, 'd_du_udu', ['Em'], 8, ['One chord, pattern only. Make every bar sound identical.', 'Listen for the two up strums being quieter than the downs.']),
        play(8, 'horse', 'all', d <= 3 ? 80 : 85, null, [
          'The whole song structure. When a section changes, the name at the top changes with it.',
          'If you fall off, keep strumming and rejoin on the next bar. Never restart from the top.',
          d >= 4 ? 'Hum the melody while you play. It will wreck your strumming for a day. That is the point.' : 'Relax your shoulders. Check them every verse.',
        ]),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: 'Tempo', phase: 'Song 1',
      goal: 'The whole song at 100 bpm, chorus louder than verse.',
      why: 'Dynamics are what make two chords sound like music. Loud chorus, soft verse, same pattern.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, 'One minute of changes.']),
        play(9, 'horse', 'all', 100, null, ['Milestone: full song at 100 bpm.', 'Verses soft, choruses loud. Make the difference obvious.']),
        warm(3, ['Record it. If it was clean, log 100 as your tempo on the song page.', 'Log how the week felt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, SPIDER, 'One minute of changes.']),
        strum(4, d <= 3 ? 95 : 100, 'd_du_udu', ['Em', 'D6/9'], 1, [
          'Dynamics drill: two bars as quietly as you can, two bars as loudly as you can, repeat.',
          'Quiet comes from a smaller swing, not a tighter grip. Loud comes from a bigger swing.',
        ], 'Dynamics'),
        play(7, 'horse', 'all', d <= 3 ? 95 : 100, null, ['Verses quiet, choruses loud.', 'Hum along for at least one verse.']),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: 'Full speed', phase: 'Song 1',
      goal: 'The whole song at the record tempo, 122 bpm, humming the melody.',
      why: 'You are about to play a real song at its real speed. Four weeks ago you could not hold a chord.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, 'One minute of changes. Try to set a personal best.']),
        play(9, 'horse', 'all', 122, null, ['Milestone: the full song at 122, the tempo of the record.', 'Hum or sing. This is the real thing now.']),
        warm(3, ['Record the full song. Log the tempo if it was clean.', 'Log how the week felt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, 'One minute of changes at a relaxed pace.']),
        strum(3, d <= 3 ? 110 : 118, 'd_du_udu', ['Em'], 8, ['One chord at speed. Small swings. The pick barely moves.', 'If your arm tenses, drop the tempo by 10 and build back.']),
        play(8, 'horse', 'all', d <= 3 ? 110 : 118, null, ['Full song, nearly full speed.', 'Chorus loud, verse soft, hum the whole way through.']),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: 'Own it', phase: 'Song 1',
      goal: 'Play the whole song from memory at tempo, then play it for someone.',
      why: 'A song is yours when you can play it without looking. This week also plants the first seed of song 2.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, 'One minute of changes.']),
        play(8, 'horse', 'all', 122, null, ['Song 1, from memory. Look at your hands, the wall, anything but the screen.', 'Then play it for a person, or a pet, or a video call. Out loud, start to finish.']),
        chord(3, ['G'], ['A preview of next week. Build G ten times. Do not worry about how it sounds yet.']),
        warm(2, ['Record the full song one more time. Watch the week 1 video right after.', 'Log how the week felt. You finished song one.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, 'One minute of changes.']),
        play(8, 'horse', 'all', 122, null, [
          d <= 3 ? 'Full song at tempo. Glance at the chart only when you need it.' : 'Full song at tempo. Try the first verse without looking at the screen at all.',
          'Sing or hum. Dynamics on. This is a performance now, not a drill.',
        ]),
        chord(4, ['G'], [
          'Meet G, the first chord of your second song.',
          'Middle finger on the low E at the 3rd fret, index on the A at the 2nd, ring on the high E at the 3rd.',
          'Build, check each string, release. It will feel like a stretch for a few days, exactly like D6/9 did.',
        ]),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: 'New shapes', phase: 'Song 2',
      goal: 'Clean G and D chords and a steady G to D switch.',
      why: 'Song 2 has four chords. Two this week, two next week, with the Horse kept warm every day.',
      plan: d => d === 7 ? [
        play(3, 'horse', ['Chorus', 'Verse 2'], 122, null, ['Keep the Horse warm: chorus and verse at tempo.'], 'Keep-warm: the Horse'),
        chord(4, ['G', 'D'], ['Build G, then D, then G, then D. Ten rounds, slowly.']),
        changes(3, ['G', 'D'], ['First baseline for the new pair. Any number is a good number.']),
        strum(3, 60, 'down4', ['G', 'D'], 2, ['Two bars each, down strums, switch on the ONE.']),
        warm(2, ['Record 20 seconds of G and D. Log how the week felt.'], 'Weekly check-in'),
      ] : [
        play(2, 'horse', ['Chorus'], 122, null, ['Two minutes of the Horse chorus to warm up. Yes, this counts as a warm-up now.'], 'Keep-warm: the Horse'),
        chord(5, d <= 3 ? ['G'] : ['D'], d <= 3 ? [
          'Middle on the low E 3rd fret, index on the A 2nd fret, ring on the high E 3rd fret.',
          'Strum, then pluck each string. The D string next to your index is the usual buzzer. Stand the index up more.',
          'Build, check, release, repeat.',
        ] : [
          'Index on the G string 2nd fret, ring on the B 3rd fret, middle on the high E 2nd fret.',
          'Strum only the top four strings. Let the pick start on the D string.',
          'Build, check, release, repeat. The triangle shape gets comfortable fast.',
        ]),
        d <= 3 ? strum(5, 60, 'down4', ['G', 'Em'], 2, ['G and Em share the middle finger region. Two bars each, down strums.', 'Em is your anchor chord: use it to rest between G attempts.']) :
                 strum(3, 60, 'down4', ['G', 'D'], 2, ['Two bars of G, two bars of D, down strums.', 'For G to D, the ring finger slides from the high E 3rd fret down to the B 3rd fret. Keep it close.']),
        d >= 4 ? changes(2, ['G', 'D'], ['Baseline for the new pair.']) : null,
        cool(1, ['Shake out both hands. Log one small win.']),
      ].filter(Boolean) },

    { title: 'Am and C', phase: 'Song 2',
      goal: 'All four chords of song 2 in a loop at 60 bpm.',
      why: 'Am and C are nearly the same shape. Learn one and the other comes almost free.',
      plan: d => d === 7 ? [
        play(3, 'horse', ['Intro', 'Verse 1'], 122, null, ['Keep the Horse warm.'], 'Keep-warm: the Horse'),
        changes(3, ['D', 'Am'], ['The hardest change in song 2. Measure it.']),
        strum(5, 60, 'd_du', ['G', 'D', 'Am', 'C'], 2, ['All four chords in a loop, two bars each. Milestone: every chord in song 2.']),
        warm(3, ['Record the four-chord loop. Log how the week felt.'], 'Weekly check-in'),
      ] : [
        play(2, 'horse', ['Chorus'], 122, null, ['Horse chorus to warm up.'], 'Keep-warm: the Horse'),
        chord(4, d <= 3 ? ['Am'] : ['C'], d <= 3 ? [
          'Middle and ring on the D and G at the 2nd fret, index on the B at the 1st fret. Skip the low E.',
          'It is the Em shape moved over one string, plus the index. Your fingers already half know it.',
          'Build, check, release, repeat.',
        ] : [
          'From Am, lift only the ring finger and put it on the A string at the 3rd fret. Middle and index stay put.',
          'Strum from the A string down. Every string should ring.',
          'Am to C, C to Am, ten times. Only one finger moves.',
        ]),
        changes(3, d <= 3 ? ['D', 'Am'] : ['D', 'C'], [d <= 3 ? 'D to Am is the hardest change in the song. The index finger moves from the G string to the B string, one fret down.' : 'D to C: the index moves from the G string 2nd fret to the B string 1st fret.', 'Measure it. Beat it by one tomorrow.']),
        strum(5, 60, 'd_du', d <= 3 ? ['G', 'D', 'Am'] : ['G', 'D', 'Am', 'C'], 2, [
          d <= 3 ? 'Three chords in a loop, two bars each, with the stepping-stone pattern.' : 'All four chords, two bars each. This is the song in slow motion.',
          'The up strum is small. Keep the hand moving through the changes.',
        ]),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: "Knockin'", phase: 'Song 2',
      goal: 'The verse of song 2 at 60 bpm with the full pattern.',
      why: 'Same strumming pattern as the Horse, so the right hand is already trained. Only the left hand is new.',
      plan: d => d === 7 ? [
        play(3, 'horse', 'all', 122, null, ['Keep-warm: the Horse, full song.'], 'Keep-warm: the Horse'),
        play(7, 'knockin', ['Verse 1', 'Chorus'], 60, null, ['Milestone: verse and chorus of song 2 at 60.', 'Verse and chorus are the same eight bars. If you can play one, you can play both.']),
        warm(3, ['Record the verse and chorus. Log how the week felt.'], 'Weekly check-in'),
      ] : [
        warm(2, [TUNE, 'One minute of changes: ' + (d % 2 ? 'D to Am.' : 'G to D.')]),
        strum(3, d <= 3 ? 55 : 60, 'd_du_udu', ['G'], 8, ['The campfire strum at a gentle tempo, on G only. Your hand knows this.', 'Softer than the Horse. This song breathes.']),
        play(6, 'knockin', ['Verse 1'], d <= 3 ? 55 : 60, null, [
          'Eight bars on repeat: G, D, Am, Am, G, D, C, C.',
          'Am and C each get two bars. Use the second bar to breathe and set up the next change.',
          'Keep the hand moving through every change, even the ugly ones.',
        ]),
        play(3, 'horse', ['Chorus', 'Outro'], 122, null, ['A quick run of the Horse to keep it in the fingers.'], 'Keep-warm: the Horse'),
        cool(1, ['Shake out both hands. Log one small win.']),
      ] },

    { title: 'Two songs', phase: 'Song 2',
      goal: 'Both songs, start to finish, at tempo.',
      why: 'Twelve weeks ago you could not hold a chord. This week you play two songs for someone.',
      plan: d => d === 7 ? [
        warm(2, [TUNE, 'One minute of changes on your weakest pair. Try for a personal best.']),
        play(6, 'knockin', 'all', 70, null, ['Graduation, part one: song 2 at the tempo of the record.']),
        play(5, 'horse', 'all', 122, null, ['Graduation, part two: song 1 from memory.']),
        warm(2, ['Record both. Watch the week 1 video. Play both songs for someone this week.', 'Log how the twelve weeks felt. Then keep going: the app will keep giving you maintenance days.'], 'Graduation'),
      ] : [
        warm(2, [TUNE, 'One minute of changes: ' + (d % 2 ? 'D to Am.' : 'D to C.')]),
        play(7, 'knockin', 'all', d <= 3 ? 65 : 70, null, [
          'Full song 2. Verse, chorus, verse, chorus, outro.',
          d >= 4 ? 'Try the first verse without looking at the screen.' : 'Soft verses, a little louder on the chorus.',
          'Hum the melody.',
        ]),
        play(4, 'horse', 'all', 122, null, ['Full song 1, from memory if you can.'], 'Keep-warm: the Horse'),
        cool(2, ['Shake out both hands.', 'Think about which song you will play for someone on day 84.', 'Log one small win.']),
      ] },
  ];

  const MILESTONES = [
    { week: 1,  label: 'A clean Em chord' },
    { week: 2,  label: 'The D6/9 chord' },
    { week: 3,  label: '20 changes a minute' },
    { week: 4,  label: 'First 20 bars of the Horse' },
    { week: 6,  label: 'Whole song at 100 bpm' },
    { week: 8,  label: 'Song 1 at full speed, from memory' },
    { week: 10, label: 'Four new chords' },
    { week: 12, label: "Song 2: Knockin' on Heaven's Door" },
  ];

  const ENCOURAGEMENTS = [
    'Fifteen minutes today beats two hours on Sunday.',
    'You do not have to feel like it. You just have to pick it up.',
    'Sore fingertips are the receipt for progress.',
    'Slow and clean becomes fast and clean. Fast and messy stays messy.',
    'Never miss twice. One day off is a rest. Two is a habit forming the wrong way.',
    'Nobody sounds good in week 2. Everybody who keeps going sounds good in week 8.',
    'The hand that keeps strumming through a mistake is the hand of a guitarist.',
    'Record yourself. Future you will not believe how far you came.',
    'A chord you can form with your eyes closed is a chord you own.',
    'Tune first. A tuned guitar makes a beginner sound twice as good.',
    'Hum along. Music is supposed to come out of you, not just the guitar.',
    'The hardest part of today was opening this app. Done.',
    'Calluses are made of consistency.',
    'Play it for someone. Fear fades, the song stays.',
  ];

  const TOTAL_DAYS = WEEKS.length * 7;

  function beyondPlan(n) {
    const v = n % 3;
    return [
      warm(2, [TUNE, 'One minute of changes on whichever pair felt worst last time.']),
      v === 0 ? play(6, 'horse', 'all', 122, null, ['Keep song 1 alive. From memory, with dynamics.']) :
      v === 1 ? play(6, 'knockin', 'all', 70, null, ['Keep song 2 alive. Try singing a verse out loud.']) :
                strum(6, 70, 'd_du_udu', ['G', 'D', 'Am', 'C', 'Em'], 2, ['Free loop over all your chords. Try changing the order.'], 'Free play'),
      v === 2 ? play(5, 'horse', 'all', 122, null, ['Song 1 to finish.']) : play(5, v === 0 ? 'knockin' : 'horse', 'all', v === 0 ? 70 : 122, null, ['The other song, to finish.']),
      cool(2, ['Shake out both hands.', 'Ready for song 3? Pick one with chords you already know: G, C, D, Em, Am cover hundreds of songs.']),
    ];
  }

  function buildDay(n) {
    n = Math.max(1, Math.floor(n));
    if (n > TOTAL_DAYS) {
      return { day: n, week: WEEKS.length + 1, dayInWeek: ((n - 1) % 7) + 1, title: 'Keep playing', phase: 'Beyond',
        goal: 'Keep both songs in your fingers and pick a third.', why: 'Habits outlive programs. Fifteen minutes a day is still the whole trick.',
        blocks: beyondPlan(n), isReview: false, encouragement: ENCOURAGEMENTS[n % ENCOURAGEMENTS.length], beyond: true };
    }
    const week = Math.ceil(n / 7);
    const d = ((n - 1) % 7) + 1;
    const w = WEEKS[week - 1];
    return { day: n, week, dayInWeek: d, title: w.title, phase: w.phase, goal: w.goal, why: w.why,
      blocks: w.plan(d), isReview: d === 7, encouragement: ENCOURAGEMENTS[(n - 1) % ENCOURAGEMENTS.length], beyond: false };
  }

  // Five-minute fallback: one technique block and one song block, trimmed.
  function shortBlocks(blocks) {
    const tech = blocks.find(b => ['chord', 'changes', 'metronome'].includes(b.type));
    const song = blocks.find(b => b.type === 'playalong') || blocks.filter(b => b.type === 'metronome').pop();
    const picked = [tech, song].filter(Boolean).filter((b, i, a) => a.indexOf(b) === i);
    if (!picked.length) return blocks.slice(0, 2).map(b => ({ ...b, minutes: 2.5 }));
    return picked.map((b, i) => ({ ...b, minutes: i === 0 ? 3 : 2, rounds: 1 }));
  }

  function totalMinutes(blocks) { return blocks.reduce((a, b) => a + b.minutes, 0); }

  return { CHORDS, PATTERNS, SONGS, WEEKS, MILESTONES, TOTAL_DAYS, buildDay, shortBlocks, totalMinutes };
})();
