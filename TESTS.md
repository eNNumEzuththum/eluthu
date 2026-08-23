# எழுது — Test Tracker
<!-- Update versions and pass/fail after each test session -->

## File Versions
| File | Version |
|---|---|
| index.html | 1.1.9 |
| style.css | 1.4.2 |
| tamil99-keymap.json | 1.0.0 |
| tamil99.js | 1.0.0 |
| combination.js | 1.1.8 |
| typing.js | 1.0.1 |
| lessons.js | 1.0.0 |
| app.js | 1.6.4 |
| version.js | 1.6.18 |
| tamil99-writer.html | 1.6.3 |
---


# Non-Combination Mode (T01–T29)
*Lessons 1–18. combination_mode=false. Character-by-character input.*

## T01 — Version bar visible
**What:** All js , css and html files versions visible at bottom of page
**How:** Load page, check version bar shows all files
- [x] pass  [ ] fail

## T02 — Lesson loads from manifest
**What:** lessons.json loads correctly, first lesson starts
**How:** Load page, char row shows exercise 01-01 content
- [x] pass  [ ] fail

## T03 — Keyboard shows only lesson keys
**What:** Only lesson chars visible on keyboard, all others blank
**How:** Check keyboard — only lesson chars showing
- [x] pass  [x] fail

## T04 — Correct key advances cursor
**What:** Pressing correct key turns box green, next box highlights blue
**How:** Press correct key → box green, next highlights blue
- [x] pass  [ ] fail

## T05 — Active key highlights on keyboard
**What:** Key for current char is solid blue on keyboard on load
**How:** On load, first char's key is blue immediately
- [x] pass  [ ] fail

## T06 — Space bar behaviour
**What:** Space is a valid key when exercise contains spaces. Wrong when exercise has no spaces.
**How:** In "பררப" exercise → press space → red flash, cursor stays.
         In "ப ப ப" exercise → press space → green, cursor advances.
- [x] pass  [ ] fail

## T07 — Wrong key shows red, cursor stays
**What:** Pressing wrong key shows red on current char, cursor does NOT advance in the introduction exercise
**How:** Load lesson 01-03. Press wrong key → box red, cursor stays
- [x] pass  [ ] fail

## T08 — Perfect exercise advances to next exercise
**What:** Completing with zero errors loads next exercise in lesson
**How:** Complete 01-01 perfectly → 01-02 loads automatically
- [x] pass  [ ] fail

## T9 — Last exercise in lesson advances to next lesson
**What:** Completing last exercise in a lesson loads first exercise of next lesson
**How:** Complete last exercise of lesson-01 → lesson-02 ex-01 loads
- [x] pass  [ ] fail

## T10 — Keyboard updates between lessons
**What:** When lesson changes, keyboard shows new lesson chars
**How:** After lesson-01 completes, keyboard shows lesson-02 chars only
- [x] pass  [ ] fail

## T23 — Practice and Review lesson advances cursor on wrong key
**What:** Review/Practice exercises (accuracy_target:90/80) advance cursor on wrong key
**How:** In Ex 2 (90%) or Ex 3 (80%) — press wrong key → char turns red, cursor advances
- [x] pass  [ ] fail

## T24 — Exercise repeats if accuracy below target
**What:** Completing exercise below target accuracy restarts same exercise
**How:** In Ex 2 (90% target) — make enough errors to drop below 90% → exercise restarts
- [x] pass  [ ] fail

## T25 — Exercise advances if accuracy meets target
**What:** Completing exercise at or above target accuracy advances to next exercise
**How:** In Ex 2 (90% target) — complete with ≥90% accuracy → next exercise loads
- [x] pass  [ ] fail

## T26 — accuracy_target read from exercise JSON
**What:** Each exercise loads its own accuracy_target from JSON file
**How:** Check Ex 1 JSON has accuracy_target:100, Ex 2 has 90, Ex 3 has 80
- [x] pass  [] fail

## T27 — Back button navigates to previous exercise/lesson
**What:** Back button (← முந்தையது) steps to the previous exercise, or the
previous lesson's last exercise when at exercise 0 of a lesson
**How:** Complete a couple of exercises, click Back → previous exercise
reloads with its own content. At lesson 0/exercise 0, Back is disabled
(greyed out, unclickable)
- [ ] pass  [ ] fail

## T28 — Leaked "press any key to continue" listener does not duplicate advances
**What:** Navigating away (Back, Restart, or picker) before pressing a key on
a completed/message screen must not leave a stale listener that fires on
the next unrelated keystroke
**How:** Pass an exercise, immediately click Back (don't press a key to
advance normally) → load the previous exercise → type the first
character → exercise must NOT auto-reload or skip unexpectedly
- [ ] pass  [ ] fail

## T29 — Introduction exercises excluded from rewards
**What:** Introduction-type exercises don't count toward daily activity
(heatmap), badges, or the lesson's star-rating aggregate — only
practice/review do
**How:** Complete an introduction exercise → check
`localStorage.eluthu_activity` for today — exercises count/minutes should
not increase from an introduction-only session. Complete a lesson with a
mix of intro/practice/review → check the lesson's star rating reflects
only the practice/review scores
- [ ] pass  [ ] fail

---

## Combination Mode (T36–T58)
*Lessons 19–36. combination_mode=true. Keystroke stream input.*
Use the following text "ப பி பு ப்ப நன்றி பப்பா அப்பா பப்பாளி"

## T36 — Uyirmei lesson loads correctly
**What:** Uyirmei exercise loads with combined chars in exercise panel
**How:** Load lesson 19 Ex 1 — exercise shows ப்ப் புபு பிபி பப ...
- [x] pass  [ ] fail

## T37 — Keyboard shows consonant key first for uyirmei
**What:** On load, keyboard highlights consonant key (KeyJ for ப)
**How:** Load uyirmei lesson — KeyJ (ப) highlighted blue
- [x] pass  [ ] fail

## T38 — Keyboard advances to vowel key after consonant pressed
**What:** After pressing consonant, keyboard highlights vowel key
**How:** Press KeyJ → KeyJ highlighted again for ப் (same-consonant rule)
- [x] pass  [ ] fail


## T39 — Uyirmei char accepted after consonant + vowel marker
**What:** Pressing consonant then correct vowel marker advances cursor
**How:** Press KeyJ then KeyS → பி turns green, cursor moves to next char
- [x] pass  [] fail

## T40 — Wrong vowel key blocked in 100% accuracy mode
**What:** Wrong vowel key shows red, cursor stays
**How:** Press KeyJ then KeyQ (wrong for பி) → red flash, cursor stays on பி
- [x] pass  [ ] fail

## T41 — Wrong vowel advances cursor in <100% accuracy mode
**What:** Wrong vowel in review/practice marks red and advances
**How:** In Ex 2 (90%) press KeyJ then wrong vowel → red mark, cursor advances
- [x] pass  [ ] fail

## T42 — Finger highlights consonant then vowel for uyirmei
**What:** Finger guidance shows consonant finger then vowel finger
**How:** For பி: KeyJ pressed → R1_j blue. Then KeyS pressed → L3_s blue
- [x] pass  [ ] fail

## T43 — generate_lessons.py creates uyirmei exercises correctly
**What:** Uyirmei lesson generates 3 exercises with 13 combinations
**How:** Run ./generate_lessons.py → check 19-01.json has all ப் பு பி ப பெ பை பூ பீ பா பே பொ போ பௌ
- [x] pass  [ ] fail

## T44 — Implicit அ: consonant alone needs only one keypress
**What:** In combination mode, bare consonant target accepts one keypress only
**How:** Load exercise with bare ப → press KeyJ only → ப turns green, cursor advances
- [] pass  [x] fail
- KeyJ then space work -- issue is fixed but they after KeyJ, KeyA is highlighted instead of spacebar. entering KeyA is also correct method but an extra keystroke.
-- no need to fix


## T45 — Backspace un-commits last cluster, no error penalty
**What:** Backspace reverts last matched cluster, cursor returns to it
**How:** Type KeyJ+KeyS (பி matched) → press Backspace → cursor back on பி → press KeyD → பு accepted
- [] pass  [x] fail
- after backspace, need to type KeyJ again. If it is a bug fix it if you have not implement yet just leave it.
- STILL UNADDRESSED — combination.js's cluster-matching logic itself was not
  touched during the streak/badge/star-rating/WPM work (only its stats()
  WPM calculation was changed). Carrying this forward unresolved.


## T52 — Cursor follows next affected cluster
**What:** Cursor sits on the cluster that will be affected by the next keystroke
**How:** Type அப்பா — after KeyA cursor on ப்; after first KeyJ cursor on பா
- [ ] pass  [x] fail
- cursor still on ப்
- not a major issue. do not fix if it complicating the code
- STILL UNADDRESSED — same reason as T45.

## T53 — Key guidance for pure consonant: same-consonant rule
**What:** For target ப், keyboard guides KeyJ then KeyJ (not KeyJ then KeyF)
**How:** Load exercise with ப் → KeyJ highlighted → press KeyJ → KeyJ highlighted again
- [x] pass  [ ] fail

## T54 — Key guidance for soft+hard pairs
**What:** For target ன் followed by றி, keyboard guides KeyI then KeyU
**How:** Exercise with நன்றி → after ந committed → KeyI highlighted → press KeyI → KeyU highlighted
- [x] pass  [ ] fail

## T55 — Key guidance: அ de-linker after bare consonant
**What:** For bare consonant followed by same consonant, keyboard guides KeyA after first keypress
**How:** Exercise with பப்பா → after first KeyJ → KeyA highlighted (not KeyJ)
- [x] pass  [ ] fail

## T56 — Real word அப்பா types correctly
**What:** அப்பா accepts KeyA KeyJ KeyJ KeyQ
**How:** Load exercise with அப்பா → type KeyA KeyJ KeyJ KeyQ → all green, exercise complete
- [x] pass  [ ] fail

## T57 — Real word பப்பாளி types correctly
**What:** பப்பாளி accepts KeyJ KeyA KeyJ KeyJ KeyQ KeyY KeyS
**How:** Load exercise with பப்பாளி → type full sequence → all green
- [x] pass  [ ] fail


## T58 — Exercise advances if accuracy meets target
**What:** Completing exercise at or above target accuracy advances to next exercise
**How:** In Ex 2 (90% target) — complete with ≥90% accuracy → next exercise loads
- [x] pass  [] fail

## T59 — Same consonant alternating pulli pattern
**What:** test அப்பப்பா
**How:** Type KeyA KeyJ KeyJ KeyJ KeyJ KeyQ should pass
- [] pass  [x] fail
- STILL UNADDRESSED — same reason as T45/T52.

---

## Speed & Accuracy Calculation (T60–T69)
*app.js/typing.js/combination.js. Verify WPM and accuracy are computed and
displayed correctly, and only from exercises that should count.*

## T60 — WPM counts correct characters only, not total keystrokes
**What:** Wrong keystrokes must reduce effective WPM, not inflate it —
previously words = typed.length/5 counted errors as if they were speed
**How:** Type a longer exercise with a mix of right/wrong keys. Confirm via
console (`typingEngine.stats()` or `comboEngine.stats()`) that
`wpm = round((correct/5) / elapsed_minutes)`, not based on `typed`
- [ ] pass  [ ] fail

## T61 — Live WPM display matches final saved WPM
**What:** The in-progress stats-bar WPM must come from the same
`stats.wpm` the engine computes, not a separate duplicate formula
**How:** Watch the live WPM number while typing an inaccurate exercise —
it should track low/realistic, not spike from wrong keystrokes
- [ ] pass  [ ] fail

## T62 — WPM saved for short/fast exercises (no 5-second minimum)
**What:** Previously WPM was only saved if the exercise took >5 seconds,
making short review exercises show no speed in the picker at all
**How:** Complete a short review exercise quickly → picker shows both
accuracy% and WPM for it, not just accuracy%
- [ ] pass  [ ] fail

## T63 — Redoing an exercise correctly backfills a missing WPM
**What:** An exercise scored before the 5-second-gate removal (wpm: null)
must be able to pick up a real WPM on redo, even if that redo's accuracy
doesn't beat the stored best
**How:** Find a `eluthu_scores` entry with `wpm: null`, redo that exercise
→ check `JSON.parse(localStorage.getItem('eluthu_scores'))` — wpm should
now be a real number, and accuracy should stay at whichever is higher
(prior best or this attempt)
- [ ] pass  [ ] fail

## T64 — Accuracy target badge color updates live, not just on first keypress
**What:** The small accuracy-target pill next to WPM should flip
orange↔green as live accuracy crosses the target in either direction,
not freeze at whatever color it was after the first keystroke
**How:** Start an exercise, type a wrong key (pill orange), then correct
keys until accuracy recovers above target (pill should turn green)
- [ ] pass  [ ] fail

---

## Keyboard SVG Loading (T65–T67)
*The keyboard <object> loads asynchronously — verify no race condition on
a cold/first page load (GitHub Pages CDN can add real latency here).*

## T65 — No stale/duplicate finger highlights on cold load
**What:** All keyboard-dependent rendering (finger highlights, key
highlights, Tamil labels) must wait for the SVG's real `load` event via
`whenSvgReady()`, not scattered polling that could race with itself
**How:** Hard-refresh (Ctrl+Shift+R) on a fresh/incognito load of the
deployed site → keyboard shows exactly the expected single highlighted
finger/key, not multiple fingers in different colors
- [ ] pass  [ ] fail

## T66 — Message-exercise finger reset waits for SVG ready
**What:** Previously `resetFingers()` on an any-key message screen had no
retry at all if the SVG wasn't loaded yet — now gated through
`whenSvgReady()`
**How:** Cold-load directly onto a message-type exercise (if reachable
via a fresh lesson start) → home-position fingers show correctly, not
missing
- [ ] pass  [ ] fail

## T67 — Text above keyboard renders correctly on cold load
**What:** Reported once as missing on first load, fixed by F5 — recheck
after the SVG-load fix, since it was suspected to be the same root cause
**How:** Hard-refresh on a fresh load → capture a screenshot before doing
anything else if any text/element above the keyboard is missing or wrong
- [ ] pass  [ ] fail  — **not yet reproduced with a screenshot; needs a fresh repro**

---

## Streak Heatmap & Activity (T90–T99)
*app.js. localStorage['eluthu_activity'] / localStorage['eluthu_badges'].
Left sidebar. Zero network calls — verify via DevTools if in doubt.*

## T90 — Completing an exercise records today's activity
**What:** Passing an exercise (practice/review, not introduction — see
T29) updates today's entry in `eluthu_activity` (exercises, accuracy_avg,
wpm_avg, minutes)
**How:** Complete an exercise → `JSON.parse(localStorage.getItem('eluthu_activity'))[todayKey]`
shows updated fields
- [ ] pass  [ ] fail

## T91 — Streak counter reflects consecutive days
**What:** `computeStreak()` counts consecutive calendar days with ≥1
exercise, ending at today or yesterday (grace period until a full day
passes with no activity)
**How:** Simulate multiple days of activity (or check across real
sessions) → streak count matches actual consecutive days
- [ ] pass  [ ] fail

## T92 — Streak resets to 0 after a missed day
**What:** A full day passing with zero activity resets the streak
**How:** Skip a day of activity entirely → next session's streak shows 0
- [ ] pass  [ ] fail

## T93 — Heatmap cell click opens day-detail popup
**What:** Clicking any past heatmap cell opens a popup with that day's
date, badges (if any), and stats
**How:** Click a colored cell → popup shows correct date + stats matching
that day's `eluthu_activity` entry
- [ ] pass  [ ] fail

## T94 — Empty day shows graceful "no practice recorded" state
**What:** Clicking a cell with zero activity must not show broken/empty
stats
**How:** Click a grey (level-0) cell with no recorded activity → popup
shows "பயிற்சி பதிவு இல்லை (No practice recorded)", not blank/broken UI
- [ ] pass  [ ] fail

## T95 — Heatmap window slides correctly (12 weeks, ends today)
**What:** The 84-day grid always shows `[today-83, today]`, recomputed
fresh on every render — no stored array, nothing to prune
**How:** Verified mathematically in isolation (Node); confirm visually
that the grid's oldest visible cell is exactly 83 days before today
- [x] pass  [ ] fail — verified via date-math simulation, not yet
  re-confirmed against a live 12-week-old account

## T96 — Badge count/heatmap intensity level match actual data
**What:** Cell background intensity (level-0 through level-4) reflects
that day's exercise count; badge icon (if any) overlays on top
**How:** Compare a few cells' visual intensity against their
`exercises` count in `eluthu_activity`
- [ ] pass  [ ] fail

---

## Badge System (T100–T119)
*app.js — BADGES config, evaluateBadges(), tierSuppressed(),
alreadyEarned(). 24 badges across 8 types.*

## T100 — Tiered families award only the single highest new tier
**What:** A day/exercise that crosses multiple thresholds at once (e.g.
41 WPM crossing wpm_10 through wpm_40) must award only the highest —
not all four
**How:** Reach a WPM/minutes value that crosses several tiers in one
exercise → day-detail popup shows exactly one badge for that family, the
highest one crossed
- [ ] pass  [ ] fail — **fixed after being caught live; re-verify**

## T101 — Tier suppression prevents a lower badge appearing after a higher one
**What:** Once a family's highest-ever tier is earned, a later smaller
day must not award a lower tier in that same family
**How:** Earn wpm_60 on one day, then a later day with only 20 WPM →
no new badge awarded for that family
- [ ] pass  [ ] fail

## T102 — Streak/cumulative-minutes/cumulative-stars ascend without needing suppression
**What:** These types are monotonic (never decrease), so once-ever
per-badge-id dedup alone is sufficient — no explicit suppression logic
needed
**How:** Verified in isolation (Node); confirm no regressions across a
real multi-week account with growing cumulative stats
- [x] pass  [ ] fail — verified in isolation, not yet on live long-running data

## T103 — weekly_accuracy_95 only evaluates on Sunday
**What:** Evaluating continuously through the week could award it
prematurely off a partial week; now gated to only fire on Sunday, using
the complete Mon–Sun average
**How:** Reach 95%+ accuracy mid-week (e.g. Wednesday) → badge should
NOT appear yet. On Sunday, if the full week's average still qualifies,
it appears then
- [ ] pass  [ ] fail

## T104 — weekly_accuracy_95 re-awards on a later separate qualifying week
**What:** Unlike most badges (once ever), this one can repeat — dedup is
scoped to the calendar week, not the badge's lifetime
**How:** Qualify in week 1, then again in week 3 (skipping week 2) →
badge appears both times, on both respective Sundays
- [ ] pass  [ ] fail

## T105 — comeback badge fires once per gap-event, not repeatedly
**What:** Dedup is scoped to the exact day it fires, so multiple
exercises on the comeback day don't duplicate it, but a later separate
7+ day gap can trigger it again
**How:** Take a 7+ day break, return → badge fires once that day (not
once per exercise that day). Take another break later → fires again
- [ ] pass  [ ] fail

## T106 — perfect_exercise detects a single exercise's raw accuracy
**What:** Must check the individual exercise's own 100% accuracy, not
the day's blended average across multiple exercises
**How:** Complete one 100%-accuracy exercise alongside other lower-accuracy
exercises the same day → badge still fires, even though the day's
average is below 100%
- [ ] pass  [ ] fail

## T107 — star_rating badge reads live from lesson-star data
**What:** Cumulative stars total is summed fresh from
`eluthu_lesson_stars` every evaluation, not tracked separately
**How:** Earn enough lesson stars to cross 50 → stars_50 badge fires;
verify the number matches `Object.values(JSON.parse(localStorage.getItem('eluthu_lesson_stars'))).reduce((s,l)=>s+l.stars,0)`
- [ ] pass  [ ] fail

## T108 — All badges except weekly_accuracy_95/comeback are once-ever
**What:** Every other badge id, once earned, can never be earned again
regardless of later activity
**How:** Verified in isolation (Node, multiple runs, zero violations
outside those two ids); spot-check a few tiered badges don't repeat on
live data
- [x] pass  [ ] fail — verified in isolation, spot-check on live data pending

## T109 — Milestone badges unlock via `mile_stone` field on exercise JSON
**What:** An exercise carrying `"mile_stone": "<badge id>"` unlocks that
badge the moment THAT SPECIFIC exercise passes, independent of the rest
of its lesson
**How:** Tag a test exercise with `"mile_stone": "first_lesson"`,
complete it → `eluthu_badges` shows `first_lesson` unlocked that day
- [x] pass  [ ] fail — confirmed working for `first_lesson`; other 9
  milestone ids (row_home, row_middle, row_top, row_bottom, all_vowels,
  all_consonants, all_letters, first_sentence, first_paragraph) still
  need `mile_stone` fields added to real exercise JSON — currently inert

## T110 — Milestone unlock is idempotent
**What:** Redoing a `mile_stone`-tagged exercise (or passing it again)
must not duplicate the badge or change its `unlocked_at`
**How:** Pass a milestone-tagged exercise twice → badge appears once in
`eluthu_badges`, timestamp unchanged after the second pass
- [ ] pass  [ ] fail

## T111 — Badge does NOT fire from a message screen being merely displayed
**What:** Milestone unlocking must be tied to actual exercise completion
(via `_onComplete`), not to a message-type exercise's text simply being
shown on screen — navigating to/past a message via Back or the picker
must not falsely trigger it
**How:** Navigate to (but don't complete) a message screen that would
have been near a milestone under the old design → no badge unlocked
- [ ] pass  [ ] fail

---

## Lesson Star Ratings (T120–T129)
*app.js — recalcLessonStars(), lessonAggregate(), lessonBaseline(),
computeStars(). localStorage['eluthu_lesson_stars'].*

## T120 — 1 star awarded on lesson completion
**What:** Completing all exercises in a lesson (meeting the existing
100%/90%/80% thresholds) awards at least 1 star
**How:** Complete a lesson for the first time → picker shows ⭐☆☆
- [ ] pass  [ ] fail

## T121 — 100% accuracy auto-satisfies the accuracy criterion
**What:** Accuracy is capped at 100%, so requiring it to be strictly
ABOVE baseline is unsatisfiable once already at the ceiling — 100%
counts as "good" unconditionally
**How:** First-ever lesson completed at 100% accuracy → immediately
shows 2 stars (not stuck at 1 waiting for a baseline that can never be
beaten)
- [x] pass  [ ] fail — confirmed via screenshot (100%/52-46 WPM lesson
  went 1★→2★ retroactively after this fix, no redo needed)

## T122 — Redo can upgrade a rating even with no other completed lesson
**What:** A lesson's own first-ever attempt is stored as
first_accuracy/first_wpm — a redo can beat THAT baseline even before a
second lesson exists to compare against
**How:** Complete only lesson 1 (95%/8 WPM) → 1 star. Redo it at
92%/32 WPM → upgrades to 2 stars (speed beats own first-attempt
baseline), confirmed via screenshot
- [x] pass  [ ] fail

## T123 — Redo with a worse result never lowers the rating
**What:** best_accuracy/best_wpm are running maxima; stars itself is
also a running max — neither can decrease
**How:** Verified in isolation (Node); redo a 3-star lesson with a
deliberately bad attempt → still shows 3 stars after
- [x] pass  [ ] fail — verified in isolation, live spot-check pending

## T124 — Introduction exercises excluded from the star-rating aggregate
**What:** Only practice/review exercise scores count toward a lesson's
best_accuracy/best_wpm — see T29
**How:** Complete a lesson with several 100%-accuracy introduction
exercises alongside a lower-scoring practice/review pair → star rating
reflects only the practice/review scores, not diluted by the intro ones
- [ ] pass  [ ] fail

## T125 — Picker displays star ratings, unattempted lessons show none
**What:** ⭐⭐☆-style badge in the picker for any lesson with stars > 0;
completely absent (not a "0 stars" state) for unattempted/partial lessons
**How:** Open picker → completed lessons show stars, untouched lessons
show nothing
- [ ] pass  [ ] fail

---

## தமிழ் 99 Writer (T170–T189)
*tamil99-writer.html (formerly tamil99-tester.html — file renamed,
page fully rebuilt). Standalone writing tool, separate from lesson
progress. localStorage['eluthu_writer_draft'] /
localStorage['eluthu_writer_fontsize'] — own namespace, zero cross-reads
with eluthu_activity/eluthu_badges/eluthu_lesson_stars.*

## T170 — Page loads as a plain typing space, no comparison UI
**What:** Reference-text box, match/mismatch detection, combination-mode
checkbox, and keystroke log are all gone — always combination mode,
just type and copy
**How:** Load tamil99-writer.html → only the writing box + toolbar
(paste/copy/download/font-size/reset) are visible
- [x] pass  [ ] fail

## T171 — Copy button copies full typed text
**What:** `#btn-copy` copies the complete current text (including any
in-progress pending character) to the clipboard
**How:** Type some text, click copy → paste elsewhere, matches exactly
- [ ] pass  [ ] fail

## T172 — Paste button and Ctrl+V both insert at the cursor
**What:** Clipboard text is inserted at the current cursor position
(not always appended at the end), and any in-progress composition is
finalized first
**How:** Type some text, move cursor mid-text (arrow keys), paste →
pasted text appears exactly at the cursor position
- [ ] pass  [ ] fail

## T173 — Cursor navigation: Left/Right/Home/End
**What:** Arrow keys move the cursor one character (grapheme cluster)
at a time; Home/End jump to start/end
**How:** Type a few words, use Left/Right/Home/End → blinking cursor bar
moves correctly each time
- [ ] pass  [ ] fail

## T174 — Typing inserts at cursor position, not just at the end
**What:** A new character typed while the cursor is mid-text is inserted
there, not appended at the end
**How:** Type text, move cursor to the middle, type a new character →
inserted exactly at that position
- [ ] pass  [ ] fail

## T175 — Backspace deletes the character before the cursor
**What:** Including the existing two-step consonant+marker backspace
behavior (e.g. deleting கா re-exposes க as pending) — now targeting
whatever's before the cursor, not always the last character overall
**How:** Move cursor mid-text, press Backspace → deletes the correct
preceding character, not the last character in the whole document
- [ ] pass  [ ] fail

## T176 — Enter key inserts a newline
**What:** Previously silently swallowed (fell through to the Tamil99
engine, which doesn't recognize Enter) — now inserts \n at the cursor,
and white-space: pre-wrap renders it as a visible line break
**How:** Press Enter while typing → visible line break appears
- [ ] pass  [ ] fail

## T177 — Auto-save persists a draft across hard refresh
**What:** Debounced save 1s after typing stops, "Saving…" →
"Saved ✓" indicator, restored automatically on next page load
**How:** Type some text, wait ~1s for "Saved ✓", hard-refresh (Ctrl+Shift+R)
→ text is restored, cursor at the end
- [ ] pass  [ ] fail

## T178 — Reset clears both the on-screen text and the saved draft
**What:** Clicking Reset must also clear `eluthu_writer_draft`, not just
the visible box
**How:** Type text, let it auto-save, click Reset, refresh → box stays
empty (draft was actually cleared, not just hidden)
- [ ] pass  [ ] fail

## T179 — Word and character count update live
**What:** Grapheme-cluster-based character count (matches this app's
convention elsewhere — கா counts as 1, not 2)
**How:** Type text including combined characters → counts update
correctly as you type
- [ ] pass  [ ] fail

## T180 — Font size persists across reloads
**What:** Small/Medium/Large selection stored in its own
`eluthu_writer_fontsize` key, separate from the draft
**How:** Set font size to Large, reload page → still Large
- [ ] pass  [ ] fail

## T181 — Writing area is resizable
**What:** Drag handle (CSS `resize: vertical`) lets the box grow taller
**How:** Drag the bottom-right corner of the box → box height increases
- [ ] pass  [ ] fail

## T182 — Zero cross-reads with lesson-progress localStorage
**What:** Typing in the writer must never read or write
eluthu_activity/eluthu_badges/eluthu_lesson_stars, and vice versa
**How:** Type extensively in the writer → confirm via DevTools that
none of those three keys changed; confirm `eluthu_writer_draft` and
`eluthu_writer_fontsize` are the only keys this page ever touches
- [x] pass  [ ] fail — confirmed via source grep (zero references), live
  DevTools spot-check pending

## T183 — Zero network requests
**What:** No backend, no network calls at any point
**How:** DevTools Network tab open while using the writer → zero requests
- [ ] pass  [ ] fail

## T184 — Graceful degradation if localStorage is unavailable
**What:** Blocked/cleared localStorage should show an empty document, not
an error
**How:** Block localStorage (or test in a restrictive private-browsing
mode) → page loads normally with an empty box, no console errors
- [ ] pass  [ ] fail

## OBSOLETE — superseded by the tamil99-writer.html rebuild
*The following former Engine Tester tests (T88, T89) referenced UI
elements that no longer exist on this page. The underlying engine
behavior they tested (Tamil99Engine/CombinationEngine combining logic)
is unchanged and still covered by T80–T87 below, updated for the new
element IDs.*

- ~~T88 — Non-combination mode toggle~~ — the `#chk-combine` checkbox was
  removed; the writer is always in combination mode now, by design
  (confirmed with the user — "always combination true mode")
- ~~T89 — Tester match/mismatch detection~~ — the reference-text box
  (`#box1`) and match/mismatch comparison (`#status`) were removed; the
  writer has no comparison feature, by design ("no need to compare with
  a reference text")

---

## Engine Tester (T80–T89)
*Manual tests, now run in tamil99-writer.html (renamed from
tamil99-tester.html). Element IDs updated: Box 3 → `#box` (the writer's
only text box; there is no longer a separate Box 1/Box 2). Combination
mode is always on — no checkbox to toggle. See OBSOLETE section above
for T88/T89, which no longer apply.*
Copy and paste "க்க க்கக்கக்க ம்ப ந்த ன்ற ண்ட ஞ்ச ங்க கஆ கக பு"

## T80 — Same consonant twice produces pulli on first
**What:** KeyH+KeyH → க்க
**How:** Type KeyH KeyH in the writer box → box shows க்க
- [x] pass  [ ] fail

## T81 — Same consonant alternating pulli pattern
**What:** KeyH×6 → க்கக்கக்க
**How:** Type KeyH six times in the writer box → box shows க்கக்கக்க
- [x] pass  [ ] fail

## T82 — Soft+hard pair: ம+ப → ம்ப
**What:** KeyK+KeyJ → ம்ப
**How:** Type KeyK KeyJ in the writer box → box shows ம்ப
- [x] pass  [ ] fail

## T83 — Soft+hard pair: ந+த → ந்த
**What:** Semicolon+KeyL → ந்த
**How:** Type Semicolon KeyL in the writer box → box shows ந்த
- [x] pass  [ ] fail

## T84 — All 6 soft+hard pairs produce pulli
**What:** ங+க ஞ+ச ந+த ண+ட ம+ப ன+ற all produce pulli on soft consonant
**How:** Test each pair in the writer box → all show pulli
- [x] pass  [ ] fail
Note: ஞ=BracketRight, ச=BracketLeft

## T85 — அ de-linker: breaks combine link
**What:** KeyH+KeyA+KeyQ → க ஆ (not கா)
**How:** Type KeyH KeyA KeyQ in the writer box → box shows கஆ
- [x] pass  [ ] fail

## T86 — அ de-linker: prevents same-consonant pulli
**What:** KeyH+KeyA+KeyH → க க (not க்க)
**How:** Type KeyH KeyA KeyH in the writer box → box shows கக
- [x] pass  [ ] fail

## T87 — Backspace strips vowel marker
**What:** Type uyirmei then backspace → base consonant re-pending, new vowel accepted
**How:** Type KeyJ KeyS (பி) → Backspace → type KeyD → box shows பு
- [x] pass  [ ] fail — re-verify against the new cursor-based backspace
  (T175); this is the same underlying engine behavior, now routed through
  insertAtCursor/handleBackspace instead of always-append

---

## Session Notes
<!-- Format: YYYY-MM-DD: notes -->
2026-08-19 to 2026-08-23: Large multi-feature session. Back button
(goBack/updateBackButton) + fix for leaked "press any key to continue"
listeners (T27, T28). WPM calculation fixed to count only correct
characters, not total keystrokes, in both typing.js and combination.js;
duplicate live-display formula in app.js removed in favor of stats.wpm
directly; 5-second minimum-duration gate on saving WPM removed; redo can
now backfill a missing wpm without needing to beat stored accuracy (T60–T63).
Accuracy-target badge color now recomputed every update, not frozen after
first keypress (T64). Keyboard <object> async-load race condition fixed
via whenSvgReady() — replaces scattered setTimeout polling with one
authoritative load-event gate, including a previously-unguarded
resetFingers() call on message screens (T65–T67, root cause suspected but
not yet re-confirmed against the originally-reported "missing text above
keyboard" symptom). Streak heatmap + activity tracking (eluthu_activity),
12-week sliding window (T90–T96). Badge system expanded from 2 to 24
badges across 8 types — tiered families (daily_minutes, cumulative_minutes,
streak_days, daily_wpm_avg, star_rating) with escalating icons instead of
a shared icon+tier-color; single-highest-tier-per-evaluation fix after a
41 WPM exercise was caught awarding 4 badges at once (T100); tier
suppression for the two day-reset types; weekly_accuracy_95 gated to
Sunday-only evaluation using the complete week (T103); comeback and
weekly_accuracy_95 are the only two badges that can repeat, everything
else once-ever, verified via isolated multi-run script with zero
violations (T108); milestone badges (10 ids) wired via an exercise JSON's
`mile_stone` field, checked at _onComplete — only `first_lesson` has
actually been tagged and confirmed working end-to-end so far, the other 9
remain untagged/inert pending real exercise data (T109). Lesson star
ratings — introduction exercises excluded from both rewards and the
star-rating aggregate (T29, T124); 100%-accuracy auto-satisfies the
accuracy criterion since it can never be beaten as a strict inequality
(T121); a lesson's own first-attempt is now a valid baseline for redo
upgrades even before a second lesson exists (T122); redo-worse never
lowers a rating, verified in isolation (T123). tamil99-tester.html
rebuilt into tamil99-writer.html (renamed twice mid-session:
tamil99-tester → tamil99-writter [typo] → tamil99-writer) — reference-text
comparison, combination-mode toggle, and keystroke log all removed by
design; added two-way copy/paste, real cursor-based editing
(insert/delete/navigate, not just append-at-end), auto-save with a
Saved-indicator, live word/character count, persisted font size, Enter-
key newline support, and a resizable writing area — all under its own
eluthu_writer_* localStorage namespace with zero cross-reads from the
lesson-progress system (T170–T184). update-tests.sh updated to match the
renamed file (V_TST → V_WRT). Title changed to "தமிழ் 99". Extensive
isolated (Node) test coverage built alongside each fix, but very little
of this session's new work has been re-verified live in-browser against
this checklist yet — most new test IDs above are left unchecked
intentionally.
2026-07-29: Word-start rule in combination mode — consonant at word start commits immediately as implicit அ (no pending). Removes need for Rule 2b (KeyA de-linker). பப்பாளி now KeyJ KeyJ KeyJ KeyQ KeyY KeyS. Backspace fix: tracks implicit/wrongKey/hadPendingConsonant flags on matched entries to correctly suggest consonant or vowel key. Fixed live-array bug (snapshot().typed is a reference — copy entry before handleBackspace pops it). app.js v1.0.17, combination.js v1.1.7.
2026-05-31: Implemented tamil99.js v1.2.0 (T44–T51). typing.js v1.4.0 (handleVowelBackspace, implicit_a push). app.js v1.10.0 (T45 backspace, seq.length>1 guard for T44). 25/25 node tests pass. T44–T51 marked pass — browser verification still needed.
2026-06-01: Major combination mode redesign. New combination.js v1.0.0 (CombinationEngine — cursor logic, key guidance rules, output matching). typing.js v1.5.1 (reverted combo-mode changes, now non-combo only). app.js v1.11.2 (split keydown into _handleKeyCombination / _handleKeyNonCombination, removed uyirmeiStep/uyirmeiSequence, renderCharRow uses cursor index directly). index.html v1.0.7 (loads combination.js). tamil99-tester.html v1.1.0 (version tracking). 20/20 node tests pass for அப்பா பப்பாளி அம்மா நன்றி. T80–T87 pass (tester). T52–T57 browser testing pending. Non-combination regression (T01–T26) needs re-verification after app.js refactor.
