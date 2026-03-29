# எழுது — Test Tracker
<!-- Update versions and pass/fail after each test session -->

## File Versions
| File | Version |
|---|---|
| index.html | 1.0.0 |
| style.css | 1.0.0 |
| tamil99-keymap.json | 1.0.0 |
| tamil99.js | 1.0.0 |
| combination.js | 1.0.0 |
| typing.js | 1.0.0 |
| lessons.js | 1.0.0 |
| app.js | 1.0.0 |
| version.js | 1.0.0 |
| tamil99-tester.html | 1.0.0 |
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
**How:** In "பририப" exercise → press space → red flash, cursor stays.
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


## T52 — Cursor follows next affected cluster
**What:** Cursor sits on the cluster that will be affected by the next keystroke
**How:** Type அப்பா — after KeyA cursor on ப்; after first KeyJ cursor on பா
- [ ] pass  [x] fail
- cursor still on ப்
- not a major issue. do not fix if it complicating the code

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

---

## Engine Tester (T80–T89)
*Manual tests run in tamil99-tester.html. Verify engine in isolation with combination_mode=true.*
Copy and paste "க்க க்கக்கக்க ம்ப ந்த ன்ற ண்ட ஞ்ச ங்க கஆ கக பு"

## T80 — Same consonant twice produces pulli on first
**What:** KeyH+KeyH → க்க
**How:** Type KeyH KeyH in tester → Box 3 shows க்க
- [x] pass  [ ] fail

## T81 — Same consonant alternating pulli pattern
**What:** KeyH×6 → க்கக்கக்க
**How:** Type KeyH six times in tester → Box 3 shows க்கக்கக்க
- [x] pass  [ ] fail

## T82 — Soft+hard pair: ம+ப → ம்ப
**What:** KeyK+KeyJ → ம்ப
**How:** Type KeyK KeyJ in tester → Box 3 shows ம்ப
- [x] pass  [ ] fail

## T83 — Soft+hard pair: ந+த → ந்த
**What:** Semicolon+KeyL → ந்த
**How:** Type Semicolon KeyL in tester → Box 3 shows ந்த
- [x] pass  [ ] fail

## T84 — All 6 soft+hard pairs produce pulli
**What:** ங+க ஞ+ச ந+த ண+ட ம+ப ன+ற all produce pulli on soft consonant
**How:** Test each pair in tester → all show pulli
- [x] pass  [ ] fail
Note: ஞ=BracketRight, ச=BracketLeft

## T85 — அ de-linker: breaks combine link
**What:** KeyH+KeyA+KeyQ → க ஆ (not கா)
**How:** Type KeyH KeyA KeyQ in tester → Box 3 shows கஆ
- [x] pass  [ ] fail

## T86 — அ de-linker: prevents same-consonant pulli
**What:** KeyH+KeyA+KeyH → க க (not க்க)
**How:** Type KeyH KeyA KeyH in tester → Box 3 shows கக
- [x] pass  [ ] fail

## T87 — Backspace strips vowel marker (T45 in tester)
**What:** Type uyirmei then backspace → base consonant re-pending, new vowel accepted
**How:** Type KeyJ KeyS (பி) → Backspace (⌫₂ in log) → type KeyD → Box 3 shows பு
- [x] pass  [ ] fail

## T88 — Non-combination mode toggle
**What:** Unchecking combination mode → each key produces standalone character
**How:** Uncheck combo → type KeyJ KeyJ → Box 3 shows பப (not ப்ப)
- [x] pass  [ ] fail

## T89 — Tester match/mismatch detection
**What:** Box 3 turns green when output matches Box 1, red when not
**How:** Paste நன்றி in Box 1 → type correct keys → green border
- [x] pass  [ ] fail

---

## Session Notes
<!-- Format: YYYY-MM-DD: notes -->
2026-05-31: Implemented tamil99.js v1.2.0 (T44–T51). typing.js v1.4.0 (handleVowelBackspace, implicit_a push). app.js v1.10.0 (T45 backspace, seq.length>1 guard for T44). 25/25 node tests pass. T44–T51 marked pass — browser verification still needed.
2026-06-01: Major combination mode redesign. New combination.js v1.0.0 (CombinationEngine — cursor logic, key guidance rules, output matching). typing.js v1.5.1 (reverted combo-mode changes, now non-combo only). app.js v1.11.2 (split keydown into _handleKeyCombination / _handleKeyNonCombination, removed uyirmeiStep/uyirmeiSequence, renderCharRow uses cursor index directly). index.html v1.0.7 (loads combination.js). tamil99-tester.html v1.1.0 (version tracking). 20/20 node tests pass for அப்பா பப்பாளி அம்மா நன்றி. T80–T87 pass (tester). T52–T57 browser testing pending. Non-combination regression (T01–T26) needs re-verification after app.js refactor.
