/**
 * app.js — எழுது
 * @version 1.0.5
 * Loads lessons from manifest + separate exercise files.
 * Two sections: lesson char row + keyboard.
 */
window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['app.js'] = '1.0.5';

'use strict';

const tamilEngine   = new Tamil99Engine();
const typingEngine  = new TypingEngine();
const comboEngine   = new CombinationEngine(
  // CHAR_TO_KEY built below — pass a proxy that reads from it lazily
  new Proxy({}, { get: (_, k) => CHAR_TO_KEY[k] })
);
let   activeEngine  = typingEngine;  // points to whichever engine is active

const $charRow      = document.getElementById('char-row');
const $capture      = document.getElementById('capture');
const $kbdObj       = document.getElementById('keyboard-obj');
const $lessonName   = document.getElementById('lesson-name');
const $exerciseName = document.getElementById('exercise-name');
const $pickerOverlay = document.getElementById('picker-overlay');
const $pickerList    = document.getElementById('picker-list');
const $statsBar      = document.getElementById('stats-bar');
const $statAccuracy  = document.getElementById('stat-accuracy');
const $statTarget    = document.getElementById('stat-target');
const $statCpm       = document.getElementById('stat-cpm');
const $progressDots  = document.getElementById('progress-dots');
const $resultBanner  = document.getElementById('result-banner');
const $resultMessage = document.getElementById('result-message');
const $resultStats   = document.getElementById('result-stats');

let currentExerciseType = 'introduction';  // set per exercise
let combineMode         = false;           // true when exercise is combination mode

// ── State ─────────────────────────────────────────────────────────────────────
let manifest      = null;   // full lessons.json
let lessonIdx     = 0;      // current lesson index in manifest
let exerciseIdx   = 0;      // current exercise index within lesson
let lessonChars   = [];     // chars for current lesson
let exerciseText  = '';     // current exercise text

// ── Key maps ──────────────────────────────────────────────────────────────────
const CHAR_TO_KEY    = {};
const CHAR_TO_FINGER = {};
CURRICULUM.forEach(e => {
  CHAR_TO_KEY[e.char]    = e.keyCode;
  CHAR_TO_FINGER[e.char] = e.finger ?? 'R1';
});
CHAR_TO_KEY[' ']    = 'Space';
CHAR_TO_FINGER[' '] = 'LT';

const KEY_RECT = {
  KeyQ:'rect17', KeyW:'rect18', KeyE:'rect19', KeyR:'rect20',
  KeyT:'rect21', KeyY:'rect22', KeyU:'rect23', KeyI:'rect24',
  KeyO:'rect25', KeyP:'rect26', BracketLeft:'rect27', BracketRight:'rect28',
  KeyA:'rect31', KeyS:'rect32', KeyD:'rect33', KeyF:'rect34',
  KeyG:'rect35', KeyH:'rect36', KeyJ:'rect37', KeyK:'rect38',
  KeyL:'rect39', Semicolon:'rect40', Quote:'rect41',
  KeyZ:'rect44', KeyX:'rect45', KeyC:'rect46', KeyV:'rect47',
  KeyB:'rect48', KeyN:'rect49', KeyM:'rect50', Comma:'rect51', Period:'rect52', Slash:'rect53',
  Space:'rect58',
};

const ZWNJ = '\u200C';  // invisible separator, never shown or typed


// ── Key to finger label mapping ──────────────────────────────────────────────
const KEY_TO_FINGER = {
  // Left hand — home row
  'KeyA': 'L4_a', 'KeyS': 'L3_s', 'KeyD': 'L2_d',
  'KeyF': 'L1_f', 'KeyG': 'L1_g',
  // Left hand — top row
  'KeyQ': 'L4_q', 'KeyW': 'L3_w', 'KeyE': 'L2_e',
  'KeyR': 'L1_r', 'KeyT': 'L1_t',
  // Left hand — bottom row
  'KeyZ': 'L4_z', 'KeyX': 'L3_x', 'KeyC': 'L2_c',
  'KeyV': 'L1_v', 'KeyB': 'L1_b',
  // Right hand — home row
  'KeyJ': 'R1_j', 'KeyH': 'R1_h', 'KeyK': 'R2_k',
  'KeyL': 'R3_l', 'Semicolon': 'R4_;',
  // Right hand — top row
  'KeyY': 'R1_y', 'KeyU': 'R1_u', 'KeyI': 'R2_i',
  'KeyO': 'R3_o', 'KeyP': 'R4_p',
  'BracketLeft': 'R4_[', 'BracketRight': 'R4_]',
  // Right hand — bottom row
  'KeyN': 'R1_n', 'KeyM': 'R1_m',
  'Quote': "R4_'", 'Slash': 'R4_/',
  'Comma': 'R2_,', 'Period': 'R3_.',
  // Thumbs
  'Space': 'LT',
};

// Base (home) finger — hidden when non-base key is active
const KEY_BASE_FINGER = {
  // Top row — hide home finger
  'KeyQ': 'L4_a', 'KeyW': 'L3_s', 'KeyE': 'L2_d',
  'KeyR': 'L1_f', 'KeyT': 'L1_f',
  'KeyY': 'R1_j', 'KeyU': 'R1_j', 'KeyI': 'R2_k',
  'KeyO': 'R3_l', 'KeyP': 'R4_;',
  'BracketLeft': 'R4_;', 'BracketRight': 'R4_;', "Quote": 'R4_;',
  // Bottom row — hide home finger
  'KeyZ': 'L4_a', 'KeyX': 'L3_s', 'KeyC': 'L2_d',
  'KeyV': 'L1_f', 'KeyB': 'L1_f',
  'KeyN': 'R1_j', 'KeyM': 'R1_j',
  'Slash': 'R4_;',
  'Comma': 'R2_k',   // R2_, active → hide R2_k
  'Period': 'R3_l',  // R3_. active → hide R3_l
  // Same row different key — hide home finger
  'KeyG': 'L1_f',
  'KeyH': 'R1_j',
};

const FINGER_LABELS = [
  'RH', 'R4_;', 'R4_p', "R4_'", 'R4_[', 'R4_]', 'R4_/',
  'R3_l', 'R3_o', 'R3_.', 'R2_k', 'R2_i', 'R2_,',
  'R1_j', 'R1_h', 'R1_y', 'R1_u', 'R1_n', 'R1_m', 'RT',
  'LH', 'L4_a', 'L4_q', 'L4_z', 'L3_s', 'L3_w', 'L3_x',
  'L2_d', 'L2_e', 'L2_c', 'L1_f', 'L1_g', 'L1_r', 'L1_t', 'L1_v', 'L1_b', 'LT'
];

// Base (home position) fingers — always visible in black when idle
const BASE_FINGERS = new Set([
  'LH', 'RH',
  'LT', 'RT',
  'L4_a', 'L3_s', 'L2_d', 'L1_f',
  'R1_j', 'R2_k', 'R3_l', 'R4_;',
]);


// ── Finger highlighting ───────────────────────────────────────────────────────
function getFingerEl(doc, label) {
  // Cannot use querySelector with inkscape:label (colon invalid in CSS selector)
  // Iterate all elements and match by attribute value
  const all = doc.getElementsByTagName('*');
  for (const el of all) {
    if (el.getAttribute('inkscape:label') === label) return el;
  }
  return null;
}

function resetFingers(doc) {
  FINGER_LABELS.forEach(label => {
    const el = getFingerEl(doc, label);
    if (el) {
      if (BASE_FINGERS.has(label)) {
        el.style.display = 'inline';
        el.style.stroke  = '#000000';
      } else {
        el.style.display = 'none';
        el.style.stroke  = '';
      }
      el.style.strokeWidth = '';
    }
  });
}

function activateFinger(keyCode) {
  const doc = svgDoc();
  if (!doc) return;
  resetFingers(doc);
  const label = KEY_TO_FINGER[keyCode];
  if (!label) return;
  // Show active finger in blue
  const el = getFingerEl(doc, label);
  if (el) {
    el.style.display     = 'inline';
    el.style.stroke      = '#4B9BFF';
    el.style.strokeWidth = '3.5px';
  }
  // Hide base (home) finger when non-base key is active
  const baseLabel = KEY_BASE_FINGER[keyCode];
  if (baseLabel) {
    const baseEl = getFingerEl(doc, baseLabel);
    if (baseEl) baseEl.style.display = 'none';
  }
}

// ── Uyirmei key sequence ─────────────────────────────────────────────────────

// Vowel marker → key that produces it
const MARKER_TO_KEY = {
  '்' : 'KeyF',   // pulli
  'ு' : 'KeyD',   // உ
  'ி' : 'KeyS',   // இ
  ''  : 'KeyA',   // அ (no marker — consonant alone)
  'ெ' : 'KeyG',   // எ
  'ை' : 'KeyR',   // ஐ
  'ூ' : 'KeyE',   // ஊ
  'ீ' : 'KeyW',   // ஈ
  'ா' : 'KeyQ',   // ஆ
  'ே' : 'KeyT',   // ஏ
  'ொ' : 'KeyC',   // ஒ
  'ோ' : 'KeyX',   // ஓ
  'ௌ' : 'KeyZ',   // ஔ
};

// Tamil consonant Unicode range
function isTamilConsonant(ch) {
  const cp = ch.codePointAt(0);
  return cp >= 0x0B95 && cp <= 0x0BB9;
}

// Tamil vowel marker Unicode range
function isTamilMarker(ch) {
  const cp = ch.codePointAt(0);
  return (cp >= 0x0BBE && cp <= 0x0BC8) || cp === 0x0BCD; // markers + pulli
}

/**
 * Decompose a Tamil character into its key sequence.
 * Returns null if not a Tamil consonant-based character.
 *
 * Handles:
 *   'ப'  -> ['KeyJ']           consonant alone (implicit அ, 1 key)
 *   'பி' -> ['KeyJ', 'KeyS']   uyirmei (consonant + vowel marker)
 *   'ப்' -> ['KeyJ', 'KeyF']   pure consonant (consonant + pulli)
 *
 * Note: geminate clusters like ப்ப are split by Intl.Segmenter into
 * ['ப்', 'ப'] — two separate target chars — so no special case needed here.
 */
function getKeySequence(char) {
  const chars = [...char];
  if (chars.length === 0) return null;

  const first = chars[0];
  if (!isTamilConsonant(first)) return null;

  const consonantKey = CHAR_TO_KEY[first];
  if (!consonantKey) return null;

  if (chars.length === 1) {
    // Bare consonant - implicit அ, one keypress
    return [consonantKey];
  }

  // Standard uyirmei or pure consonant: consonant + marker
  const marker    = chars.slice(1).join('');
  const markerKey = MARKER_TO_KEY[marker];
  if (!markerKey) return null;

  return [consonantKey, markerKey];
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function svgDoc() { return $kbdObj?.contentDocument; }

function updateKeyboard() {
  const doc = svgDoc();
  if (!doc) {
    setTimeout(updateKeyboard, 100);
    return;
  }

  // Hide all fingers on load
  resetFingers(doc);

  // Activate first key now that SVG is ready
  if (exerciseText) {
    const firstChar = [...exerciseText][0] ?? null;
    if (firstChar) activateNextKey(firstChar);
  }

  // Reset all key tints
  Object.values(KEY_RECT).forEach(id => {
    const el = doc.getElementById(id);
    if (el) el.classList.remove('key-lesson', 'key-active');
  });

  // Hide all Tamil labels using direct style (overrides inline style)
  doc.querySelectorAll('.tamil-label').forEach(el => {
    el.style.visibility = 'hidden';
  });

  // Show only lesson chars
  lessonChars.forEach(char => {
    const keyCode = CHAR_TO_KEY[char];
    if (!keyCode) return;
    const rect = doc.getElementById(KEY_RECT[keyCode]);
    if (rect) rect.classList.add('key-lesson');
    if (char === ' ') return;   // space has no Tamil label
    const label = doc.querySelector(`.tamil-label[data-char="${char}"]`);
    if (label) {
      label.style.display    = 'inline';
      label.style.visibility = 'visible';
    }
  });
}

function activateKey(keyCode) {
  const doc = svgDoc();
  if (!doc) {
    // SVG not ready — retry after short delay
    setTimeout(() => activateKey(keyCode), 50);
    return;
  }

  doc.querySelectorAll('.key-active').forEach(el => {
    el.classList.remove('key-active');
    const key = el.getAttribute('data-key');
    if (key && lessonChars.some(c => CHAR_TO_KEY[c] === key)) {
      el.classList.add('key-lesson');
    }
  });

  if (!keyCode) {
    resetFingers(doc);
    return;
  }
  const rectId = KEY_RECT[keyCode];
  const el = doc.getElementById(rectId);
  if (el) {
    el.classList.remove('key-lesson');
    el.classList.add('key-active');
  }
  activateFinger(keyCode);
}

// ── Label ─────────────────────────────────────────────────────────────────────
function updateLabel() {
  if (!manifest) return;
  const lesson = manifest.lessons[lessonIdx];
  const displayName = lesson.name.replace(' ', '␣');
  $lessonName.textContent   = `விசை நிலை: ${lessonIdx + 1} — ${displayName}`;
  $exerciseName.textContent = `பயிற்சி: ${exerciseIdx + 1}`;
  updateProgressDots();
}

function updateProgressDots() {
  if (!manifest) return;
  const lesson = manifest.lessons[lessonIdx];
  $progressDots.innerHTML = '';
  lesson.exercises.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'prog-dot';
    if (i < exerciseIdx)       dot.classList.add('done');
    else if (i === exerciseIdx) dot.classList.add('current');
    $progressDots.appendChild(dot);
  });
}

function updateStats(snap) {
  if (currentExerciseType === 'introduction') return;
  // Wait for first keypress before showing live stats
  if (snap.state === 'idle') return;
  const stats = snap.stats;
  // First keypress — switch from prompt to live stats
  if ($statsBar.dataset.started !== 'true') {
    $statsBar.dataset.started = 'true';
    $statTarget.textContent = `இலக்கு ${snap.accuracyTarget}%`;
  }
  $statAccuracy.textContent = `${Math.round(stats.accuracy)}%`;
  const wpm = stats.elapsed > 0
    ? Math.round((snap.typed.length / 5) / stats.elapsed)
    : 0;
  $statCpm.textContent = wpm || '0';
}

function showResultBanner(stats, passed, completionTarget) {
  if (currentExerciseType === 'introduction') {
    $resultBanner.classList.add('hidden');
    return;
  }
  $resultBanner.className = `result-banner ${passed ? 'pass' : 'fail'}`;
  if (passed) {
    $resultMessage.textContent = 'பயிற்ச்சி முடிந்தது!';
    $resultStats.innerHTML =
      `<span>துல்லியம் <strong>${Math.round(stats.accuracy)}%</strong></span>
       <span>வேகம் <strong>${stats.wpm} சொற்கள்/நிமிடம்</strong></span>`;
  } else {
    const got    = Math.round(stats.accuracy);
    const target = completionTarget;
    $resultMessage.textContent = 'மீண்டும் முயற்சி செய்க';
    $resultStats.innerHTML =
      `<span>துல்லியம் <strong>${got}%</strong></span>
       <span>இலக்கு <strong>${target}%</strong> — இன்னும் <strong>${target - got}%</strong> தேவை</span>`;
  }
  $resultBanner.classList.remove('hidden');
  // Banner stays visible until keypress (see waitForKeypress in onComplete)
}

// ── Section 1: char row ───────────────────────────────────────────────────────
function renderCharRow(snap) {
  const { target, typed, cursor, wrongChar } = snap;
  $charRow.innerHTML = '';

  target.forEach((ch, i) => {
    // Skip ZWNJ — invisible separator, not shown or typed
    if (ch === ZWNJ) return;

    const span = document.createElement('span');
    span.className = 'char-box';

    const isMatched  = i < typed.length;
    const isCursor   = i === cursor && !isMatched;

    if (ch === ' ') {
      span.classList.add('space-box');
      if (isMatched) {
        span.classList.add(typed[i].correct ? 'correct' : 'incorrect');
      } else if (isCursor) {
        span.classList.add(wrongChar ? 'wrong-flash' : 'current');
      }
      const sym = document.createElement('span');
      sym.className = 'space-sym';
      sym.textContent = ' ';
      span.appendChild(sym);
    } else {
      if (isMatched) {
        span.classList.add(typed[i].correct ? 'correct' : 'incorrect');
      } else if (isCursor) {
        span.classList.add(wrongChar ? 'wrong-flash' : 'current');
      }
      const tamil = document.createElement('span');
      tamil.className = 'tamil';
      tamil.textContent = ch;
      span.appendChild(tamil);
    }

    $charRow.appendChild(span);
  });

  // Key guidance comes from snap.nextKey (combination) or CHAR_TO_KEY (non-combination)
  const nextKey = snap.nextKey ?? (() => {
    for (let i = cursor; i < target.length; i++) {
      if (target[i] !== ZWNJ) return CHAR_TO_KEY[target[i]] ?? null;
    }
    return null;
  })();
  activateKey(nextKey);
}

// ── Keyboard handling ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  $capture.focus();

  if (['Tab','Shift','Control','Alt','Meta','Escape','CapsLock'].includes(e.key)) return;

  if (combineMode) {
    _handleKeyCombination(e);
  } else {
    _handleKeyNonCombination(e);
  }
});

// ── Non-combination mode keydown ──────────────────────────────────────────────
function _handleKeyNonCombination(e) {
  if (e.code === 'Backspace') {
    e.preventDefault();
    tamilEngine.processKey(e);
    typingEngine.handleBackspace();
    return;
  }

  const snap = typingEngine.snapshot();
  if (snap.state === 'complete') return;

  // Find next expected char
  let nextChar = null;
  for (let i = snap.cursor; i < snap.target.length; i++) {
    if (snap.target[i] !== ZWNJ) { nextChar = snap.target[i]; break; }
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (nextChar === ' ') {
      typingEngine.handleEngineResult({ output: ' ', replace: false, type: 'space' });
    } else if (snap.accuracyTarget === 100) {
      typingEngine.flashWrong(' ');
    } else {
      typingEngine.pushWrong(' ');
    }
    return;
  }

  if (e.code === 'Comma' || e.code === 'Period') {
    e.preventDefault();
    const result = tamilEngine.processKey(e);
    if (result) typingEngine.handleEngineResult(result);
    return;
  }

  if (nextChar === ' ') {
    if (snap.accuracyTarget === 100) typingEngine.flashWrong(e.code);
    else typingEngine.pushWrong(e.code);
    return;
  }

  const expectedCode = CHAR_TO_KEY[nextChar] ?? null;
  if (expectedCode && e.code !== expectedCode) {
    if (snap.accuracyTarget === 100) typingEngine.flashWrong(e.code);
    else typingEngine.pushWrong(e.code);
    return;
  }

  const result = tamilEngine.processKey(e);
  if (result) {
    typingEngine.handleEngineResult(result);
    tamilEngine.reset();
  }
}

// ── Combination mode helpers ─────────────────────────────────────────────────
// Mirror of combination.js decomposeCluster — available in app.js scope
function decomposeCluster_app(cluster) {
  const chars = [...cluster];
  if (!chars.length) return null;
  const cp = chars[0].codePointAt(0);
  if (!(cp >= 0x0B95 && cp <= 0x0BB9)) return null;
  return { consonant: chars[0], marker: chars.slice(1).join('') };
}

// ── Combination mode keydown ──────────────────────────────────────────────────
function _handleKeyCombination(e) {
  if (e.code === 'Backspace') {
    e.preventDefault();
    if (tamilEngine.pendingConsonant) {
      // Mid-consonant: cancel engine pending, no cluster was committed yet
      tamilEngine.processKey(e);  // clears engine pending
      comboEngine.setPending(null);
      comboEngine._notify();      // refresh display
    } else {
      // Un-commit last matched cluster; get back its consonant
      const restoredConsonant = comboEngine.handleBackspace();
      if (restoredConsonant) {
        // Restore consonant as engine pending so next key is the vowel
        tamilEngine.reset();
        tamilEngine._pending = restoredConsonant;
      }
    }
    return;
  }

  const snap = comboEngine.snapshot();
  if (snap.state === 'complete') return;

  if (e.code === 'Space') {
    e.preventDefault();
    const cur = snap.cursor;
    const nextChar = snap.target[cur] ?? null;
    const d = nextChar ? decomposeCluster_app(nextChar) : null;

    // Case 1: engine has pending consonant AND next target is that bare consonant
    // → commit as implicit அ, then handle space for the word boundary
    if (tamilEngine.pendingConsonant && d &&
        d.consonant === tamilEngine.pendingConsonant && d.marker === '') {
      const pending = tamilEngine.pendingConsonant;
      const implicitResult = { type: 'implicit_a', output: pending, replace: true, pending: null };
      tamilEngine.reset();
      comboEngine.setPending(null);
      comboEngine.handleEngineResult(implicitResult);
      const snap3 = comboEngine.snapshot();
      const nextChar3 = snap3.target[snap3.cursor] ?? null;
      if (nextChar3 === ' ') {
        comboEngine.handleEngineResult({ type: 'space', output: ' ', replace: false, pending: null });
      }
      return;
    }

    // Case 2: next target is a space → advance correctly
    if (nextChar === ' ') {
      tamilEngine.reset();
      comboEngine.setPending(null);
      comboEngine.handleEngineResult({ type: 'space', output: ' ', replace: false, pending: null });
      return;
    }

    // Case 3: Space is wrong (mid-uyirmei or wrong position)
    // Do NOT touch engine pending — just flash/advance cursor
    if (snap.accuracyTarget === 100) {
      comboEngine.flashWrong();
    } else {
      // Reset pending FIRST so cursor getter is correct when _notify fires inside pushWrong
      tamilEngine.reset();
      comboEngine.setPending(null);
      comboEngine.pushWrong(nextChar ?? ' ');
    }
    const snapAfter = comboEngine.snapshot();
    return;
  }

  // Wrong key detection — compare against nextKey from comboEngine
  const expectedCode = snap.nextKey;
  if (expectedCode && e.code !== expectedCode) {
    if (snap.accuracyTarget === 100) {
      comboEngine.flashWrong();
      return;
    } else {
      // Reset pending FIRST so cursor getter is correct when _notify fires inside pushWrong
      tamilEngine.reset();
      comboEngine.setPending(null);
      comboEngine.pushWrong(e.code);
      const snapW = comboEngine.snapshot();
      return;
    }
  }

  // Process key through Tamil engine
  const result = tamilEngine.processKey(e);
  if (!result) return;

  // Capture prevPending before updating — needed for cross-consonant chain matching
  const prevPending = comboEngine.snapshot().pending;
  // Update pending FIRST so getNextKey() inside _notify() uses correct new state
  comboEngine.setPending(tamilEngine.pendingConsonant);
  // Then handle result, passing prevPending explicitly for matching
  comboEngine.handleEngineResult(result, prevPending);

  // Reset Tamil engine only when nothing is pending
  if (!tamilEngine.pendingConsonant) {
    tamilEngine.reset();
  }
}

document.body.addEventListener('click', () => $capture.focus());

// ── Engine callbacks ──────────────────────────────────────────────────────────

typingEngine.onUpdate = snap => {
  renderCharRow(snap);
  updateStats(snap);
};

comboEngine.onUpdate = snap => {
  renderCharRow(snap);
  updateStats(snap);
  // Combination: key guidance comes from snap.nextKey (set by comboEngine.getNextKey())
  // renderCharRow calls activateKey(snap.nextKey)
};

function _onComplete(stats) {
  console.log(`exercise complete: errors=${stats.errors} accuracy=${stats.accuracy}% target=${stats.accuracyTarget}% lesson=${lessonIdx+1} exercise=${exerciseIdx+1}`);

  // For 100% accuracy exercises, cursor blocks on wrong key but
  // completion threshold is 80% — less strict to avoid frustration
  const completionTarget = stats.accuracyTarget === 100 ? 80 : stats.accuracyTarget;
  const passed = stats.accuracy >= completionTarget;

  if (passed) {
    // Advance to next exercise or next lesson
    const lesson = manifest.lessons[lessonIdx];
    exerciseIdx++;
    if (exerciseIdx >= lesson.exercises.length) {
      exerciseIdx = 0;
      lessonIdx++;
      if (lessonIdx >= manifest.lessons.length) {
        lessonIdx = 0;
        console.log('All lessons complete — restarting');
      } else {
        console.log(`Advancing to lesson ${lessonIdx + 1}`);
      }
      lessonChars = manifest.lessons[lessonIdx].chars;
    } else {
      console.log(`Advancing to exercise ${exerciseIdx + 1}`);
    }
  } else {
    console.log(`Accuracy ${stats.accuracy}% below target ${stats.accuracyTarget}% — repeating`);
  }

  saveProgress();
  showResultBanner(stats, passed, completionTarget);
  // Wait for any keypress then load next exercise
  // 300ms delay prevents the last typed key from triggering immediately
  setTimeout(() => {
    function onKey(e) {
      if (['Shift','Control','Alt','Meta','CapsLock'].includes(e.key)) return;
      document.removeEventListener('keydown', onKey);
      loadExercise();
    }
    document.addEventListener('keydown', onKey);
  }, 300);
}
typingEngine.onComplete = _onComplete;
comboEngine.onComplete  = _onComplete;

// ── Data loading ──────────────────────────────────────────────────────────────
async function fetchJSON(path) {
  const res = await fetch(path + '?v=' + Date.now());
  return res.json();
}

async function loadExercise() {
  $resultBanner.classList.add('hidden');
  const lesson  = manifest.lessons[lessonIdx];
  const exId    = lesson.exercises[exerciseIdx];
  const data    = await fetchJSON(`data/exercises/${exId}.json`);

  exerciseText = data.text;

  // Set engine combine mode from exercise JSON (default: false)
  combineMode = data.combination_mode === true;
  tamilEngine.setCombine(combineMode);
  console.log(`loadExercise: combination_mode=${data.combination_mode} combineMode=${combineMode} engine.combine=${tamilEngine.combine}`);

  updateLabel();
  updateKeyboard();

  tamilEngine.reset();

  if (combineMode) {
    comboEngine.load(exerciseText, data.accuracy_target ?? 100);
    activeEngine = comboEngine;
  } else {
    typingEngine.load(exerciseText, false, data.accuracy_target ?? 100);
    activeEngine = typingEngine;
  }

  // Show/hide stats bar based on exercise type
  currentExerciseType = data.exercise_type ?? 'introduction';
  if (currentExerciseType === 'introduction') {
    $statsBar.classList.add('hidden');
  } else {
    $statsBar.classList.remove('hidden');
    $statAccuracy.textContent = 'தட்டச்சு செய்யத் தொடங்குங்கள்';
    $statCpm.textContent = '';
    $statTarget.textContent = '';
    $statsBar.dataset.started = 'false';
  }

  // Highlight first key
  if (combineMode) {
    // comboEngine.onUpdate will fire and set the key via snap.nextKey
    comboEngine.setPending(null);
    const snap = comboEngine.snapshot();
    activateKey(snap.nextKey ?? null);
  } else {
    const firstChar = [...exerciseText][0] ?? null;
    activateKey(firstChar ? (CHAR_TO_KEY[firstChar] ?? null) : null);
  }

  $capture.focus();
}

async function boot() {
  manifest = await fetchJSON('data/lessons.json');
  loadProgress();
  lessonChars = manifest.lessons[lessonIdx].chars;
  await loadExercise();
}

// ── Picker ───────────────────────────────────────────────────────────────────

function buildPicker() {
  if (!manifest) return;
  $pickerList.innerHTML = '';

  manifest.lessons.forEach((lesson, li) => {
    const block = document.createElement('div');
    block.className = 'picker-lesson';

    const name = document.createElement('div');
    name.className = 'picker-lesson-name';
    name.innerHTML = `<span>விசை நிலை: ${li + 1} </span>${lesson.name}`;
    block.appendChild(name);

    const exWrap = document.createElement('div');
    exWrap.className = 'picker-exercises';

    lesson.exercises.forEach((exId, ei) => {
      const btn = document.createElement('button');
      btn.className = 'picker-ex-btn';
      if (li === lessonIdx && ei === exerciseIdx) btn.classList.add('current');
      btn.textContent = `பயிற்ச்சி ${ei + 1}`;
      btn.addEventListener('click', () => {
        lessonIdx   = li;
        exerciseIdx = ei;
        lessonChars = manifest.lessons[li].chars;
        closePicker();
        loadExercise();
      });
      exWrap.appendChild(btn);
    });

    block.appendChild(exWrap);
    $pickerList.appendChild(block);
  });
}

function openPicker() {
  buildPicker();
  $pickerOverlay.classList.remove('hidden');
}

function closePicker() {
  $pickerOverlay.classList.add('hidden');
}

document.getElementById('btn-picker').addEventListener('click', openPicker);
document.getElementById('btn-picker-close').addEventListener('click', closePicker);

// Close when clicking the overlay background or outside the panel
$pickerOverlay.addEventListener('click', e => {
  if (!e.target.closest('.picker-panel')) closePicker();
});

// Also close when clicking anywhere outside the picker overlay
document.addEventListener('click', e => {
  if (!$pickerOverlay.classList.contains('hidden') &&
      !e.target.closest('#picker-overlay') &&
      !e.target.closest('#btn-picker')) {
    closePicker();
  }
});

// ── Key activation ───────────────────────────────────────────────────────────
// In non-combination mode, called from loadExercise for first char highlight.
// In combination mode, comboEngine.getNextKey() drives the keyboard via onUpdate.
function activateNextKey(char) {
  if (!char || char === ' ') { activateKey('Space'); return; }
  activateKey(CHAR_TO_KEY[char] ?? null);
}

// ── Progress persistence ─────────────────────────────────────────────────────

function saveProgress() {
  localStorage.setItem('eluthu_lesson',   lessonIdx);
  localStorage.setItem('eluthu_exercise', exerciseIdx);
}

function loadProgress() {
  const lesson   = parseInt(localStorage.getItem('eluthu_lesson')   ?? '0');
  const exercise = parseInt(localStorage.getItem('eluthu_exercise') ?? '0');
  if (!manifest) return;
  if (lesson < manifest.lessons.length) {
    lessonIdx   = lesson;
    lessonChars = manifest.lessons[lesson].chars;
    const exCount = manifest.lessons[lesson].exercises.length;
    exerciseIdx = exercise < exCount ? exercise : 0;
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function startApp() {
  if (startApp._started) return;  // prevent double boot
  startApp._started = true;
  boot();
}

$kbdObj.addEventListener('load', () => startApp());
if ($kbdObj.contentDocument?.readyState === 'complete') startApp();

$capture.focus();
