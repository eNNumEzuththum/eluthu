/**
 * app.js — எழுது
 * @version 1.0.17
 * Loads lessons from manifest + separate exercise files.
 * Two sections: lesson char row + keyboard.
 */
window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['app.js'] = '1.8.7';

'use strict';

// ── DEMO MODE — remove before shipping ───────────────────────────────────────
const DEMO_MODE = false;

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

let currentExerciseType = 'introduction';  // set per exercise
let combineMode         = false;           // true when exercise is combination mode
let currentMilestone    = null;            // this exercise's mile_stone field, if any

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
  if (lesson.name === '─') { $lessonName.textContent = ''; return; }
  const visibleIdx = manifest.lessons.slice(0, lessonIdx + 1)
    .filter(l => l.name !== '─').length;
  const displayName = lesson.name;
  const totalEx  = manifest.lessons[lessonIdx].exercises.length;
  const exType   = manifest.lessons[lessonIdx].exercise_types?.[exerciseIdx] ?? 'practice';
  const exLabel  = EXERCISE_LABELS[exType] ?? `பயிற்சி ${exerciseIdx + 1}`;
  $lessonName.textContent = `நிலை ${visibleIdx}: ${displayName}`;
  $exerciseName.textContent = `(${exLabel} ${exerciseIdx + 1}/${totalEx})`;
}


function updateStats(snap) {
  if (currentExerciseType === 'introduction') return;
  // Wait for first keypress before showing live stats
  if (snap.state === 'idle') return;
  const stats     = snap.stats;
  const targetPct = snap.accuracyTarget;

  // First keypress — switch from prompt to live stats, create the badge once
  if ($statsBar.dataset.started !== 'true') {
    $statsBar.dataset.started = 'true';
    $statTarget.innerHTML = `<span id="stat-target-badge" style="color:white;border-radius:4px;padding:1px 5px;font-size:10px;">${targetPct}%</span>`;
  }
  // Recompute the badge's color on every update, not just the first — so it
  // reflects CURRENT accuracy (turns green once the user recovers back above
  // target, and back to orange if it drops again) instead of freezing at
  // whatever accuracy happened to be right after the first keypress.
  const badgeEl = document.getElementById('stat-target-badge');
  if (badgeEl) {
    badgeEl.style.background = (DEMO_MODE || stats.accuracy >= targetPct) ? '#27ae60' : '#f39c12';
  }

  $statAccuracy.textContent = DEMO_MODE ? '100%' : `${Math.round(stats.accuracy)}%`;
  // Show 0 WPM for first 2 keypresses. Use stats.wpm directly (already
  // computed from correct-only characters in typing.js/combination.js) —
  // this used to recompute its own WPM from snap.typed.length (which
  // includes WRONG keystrokes), duplicating the formula with the bug still
  // in it even after the engine-level fix.
  const wpm = (stats.elapsed > 0 && snap.typed.length > 2) ? stats.wpm : 0;
  $statCpm.textContent = wpm || '0';
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
        span.classList.add((DEMO_MODE || typed[i].correct) ? 'correct' : 'incorrect');
      } else if (isCursor) {
        span.classList.add((DEMO_MODE && wrongChar) ? 'current' : (wrongChar ? 'wrong-flash' : 'current'));
      }
      const sym = document.createElement('span');
      sym.className = 'space-sym';
      sym.textContent = ' ';
      span.appendChild(sym);
    } else {
      if (isMatched) {
        span.classList.add((DEMO_MODE || typed[i].correct) ? 'correct' : 'incorrect');
      } else if (isCursor) {
        span.classList.add((DEMO_MODE && wrongChar) ? 'current' : (wrongChar ? 'wrong-flash' : 'current'));
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
    if (DEMO_MODE && nextChar && nextChar !== ' ') {
      // Demo mode: Space advances cursor by typing the correct char
      typingEngine.handleEngineResult({ output: nextChar, replace: false, type: 'char' });
      return;
    }
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
      // Capture the entry BEFORE handleBackspace pops it (typed is a live reference)
      const typed = comboEngine.snapshot().typed;
      const removedEntry = typed.length > 0 ? { ...typed[typed.length - 1] } : null;
      const restoredConsonant = comboEngine.handleBackspace();
      if (restoredConsonant) {
        const removedD = removedEntry ? decomposeCluster_app(removedEntry.char) : null;
        const wasBareCons = removedD && removedD.marker === '';
        const wasImplicit = removedEntry?.implicit ?? false;
        const wasWrongKey = removedEntry?.wrongKey ?? false;
        if (wasBareCons || wasImplicit || wasWrongKey) {
          // Bare consonant, word-start implicit, or wrong key push — reset fully
          tamilEngine.reset();
          comboEngine.setPending(null);
          comboEngine._notify();
        } else {
          // Correctly typed uyirmei — restore consonant pending (T45)
          tamilEngine.reset();
          tamilEngine._pending = restoredConsonant;
        }
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

    // Demo mode: Space types the correct char and advances cursor
    if (DEMO_MODE && nextChar && nextChar !== ' ') {
      tamilEngine.reset();
      comboEngine.setPending(null);
      comboEngine.handleEngineResult({ type: 'char', output: nextChar, replace: false, pending: null });
      return;
    }

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
      // Track if consonant was pending (correct consonant typed, wrong vowel)
      const hadPendingConsonant = !!tamilEngine.pendingConsonant;
      tamilEngine.reset();
      comboEngine.setPending(null);
      comboEngine.pushWrong(e.code, hadPendingConsonant);
      const snapW = comboEngine.snapshot();
      return;
    }
  }

  // Process key through Tamil engine
  const result = tamilEngine.processKey(e);
  if (!result) return;

  // Capture prevPending before updating — needed for cross-consonant chain matching
  const prevPending = comboEngine.snapshot().pending;

  // Word-start rule: if consonant_pending fires at word start, commit immediately
  // as implicit அ (bare consonant). Tamil words never start with a pure consonant,
  // so the first letter always carries an implicit அ sound.
  // This allows பப்பாளி = KeyJ KeyJ KeyJ KeyQ KeyY KeyS (no KeyA needed).
  if (result.type === 'consonant_pending') {
    const snap2 = comboEngine.snapshot();
    const matchPos = snap2.typed.length;
    const isWordStart = matchPos === 0 || snap2.target[matchPos - 1] === ' ';
    // Only commit immediately if the target is a bare consonant (no vowel marker).
    // For uyirmei targets (பா, பி etc.) let normal pending flow handle it.
    const targetChar = snap2.target[snap2.cursor] ?? null;
    const d = targetChar ? decomposeCluster_app(targetChar) : null;
    if (isWordStart && d && d.marker === '') {
      // Commit bare consonant immediately as implicit அ
      const implicitResult = { type: 'implicit_a', output: result.output, replace: false, pending: null };
      tamilEngine.reset();
      comboEngine.setPending(null);
      comboEngine.handleEngineResult(implicitResult, null);
      return;
    }
  }

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

// ── Version check ────────────────────────────────────────────────────────────
let _lastVersionCheck = 0;

async function checkForUpdate() {
  const now = Date.now();
  if (now - _lastVersionCheck < 5 * 60 * 1000) return;
  _lastVersionCheck = now;
  console.log('[eluthu] checking for update...');
  try {
    const res  = await fetch('./js/version.js?_=' + now);
    const text = await res.text();
    const m = text.match(/ELUTHU_VERSIONS\['version\.js'\]\s*=\s*'([^']+)'/);
    if (!m) return;
    const remote = m[1];
    console.log('[eluthu] boot:', window._bootVersionJs, 'remote:', remote);
    if (!window._bootVersionJs) { window._bootVersionJs = remote; return; }
    if (remote !== window._bootVersionJs) {
      window.location.href = window.location.href.split("?")[0] + "?v=" + remote;
    }
  } catch (e) {
    console.log('version check failed:', e);
  }
}

function _onComplete(stats) {
  console.log(`exercise complete: errors=${stats.errors} accuracy=${stats.accuracy}% target=${stats.accuracyTarget}% lesson=${lessonIdx+1} exercise=${exerciseIdx+1}`);

  // For 100% accuracy exercises, cursor blocks on wrong key but
  // completion threshold is 80% — less strict to avoid frustration
  const completionTarget = stats.accuracyTarget === 100 ? 80 : stats.accuracyTarget;
  const passed = stats.accuracy >= completionTarget;

  // Record today's practice activity for the streak / heatmap / badges,
  // regardless of pass/fail — but only for practice/review exercises.
  // Introduction exercises are trivially short (teaching a single new
  // character) and expected to be near-100% by design, so counting them
  // toward daily minutes/accuracy/wpm would dilute real practice signal in
  // the heatmap and inflate badge eligibility with near-meaningless data.
  if (currentExerciseType !== 'introduction') recordActivity(stats);

  // Save score BEFORE advancing indices
  // Always save WPM — no longer gated behind a minimum elapsed time. The
  // engines already compute WPM from correct-character count divided by
  // elapsed time (see typing.js/combination.js), so it's meaningful even on
  // short exercises; withholding it just made review exercises (typically
  // short) look systematically unmeasured in the picker.
  if (passed) saveExercisePass(lessonIdx, exerciseIdx, stats.wpm, stats.accuracy);

  // Log this attempt into the per-exercise session history, so the picker
  // can draw a progress sparkline (accuracy/WPM over past attempts) instead
  // of just the single best-ever score. Only passed attempts are logged —
  // failed/incomplete attempts aren't meaningful "sessions" to trend on.
  if (passed) recordScoreHistory(lessonIdx, exerciseIdx, stats.accuracy, stats.wpm);

  // Recompute this lesson's star rating — only fires when the exercise
  // that just passed is practice or review (never introduction/message).
  // Must happen before lessonIdx advances below.
  if (passed) recalcLessonStars(lessonIdx, currentExerciseType, stats);

  // Exercise-tagged milestones — an exercise JSON can carry a `mile_stone`
  // field naming a badge id (e.g. "row_home"). Unlocks the moment THIS
  // SPECIFIC exercise passes, independent of whether the rest of its lesson
  // is done.
  if (passed && currentMilestone) unlockMilestone(currentMilestone);

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
  checkForUpdate();
  // Wait for any keypress then load next exercise
  // 300ms delay prevents the last typed key from triggering immediately
  setTimeout(() => {
    _completeKeyHandler = e => {
      if (['Shift','Control','Alt','Meta','CapsLock'].includes(e.key)) return;
      document.removeEventListener('keydown', _completeKeyHandler);
      _completeKeyHandler = null;
      loadExercise();
    };
    document.addEventListener('keydown', _completeKeyHandler);
  }, 300);
}
typingEngine.onComplete = _onComplete;
comboEngine.onComplete  = _onComplete;

// ── Data loading ──────────────────────────────────────────────────────────────
async function fetchJSON(path) {
  const res = await fetch(path + '?v=' + Date.now());
  return res.json();
}

// Pending "press any key to continue" listeners — must be cleared whenever
// loadExercise() is entered by any path other than the one that armed them
// (Back, Restart, or the picker), or they leak and swallow/duplicate future keypresses.
let _completeKeyHandler = null;
let _msgKeyHandler       = null;

async function loadExercise() {
  if (_completeKeyHandler) {
    document.removeEventListener('keydown', _completeKeyHandler);
    _completeKeyHandler = null;
  }
  if (_msgKeyHandler) {
    document.removeEventListener('keydown', _msgKeyHandler, true);
    _msgKeyHandler = null;
  }

  const lesson  = manifest.lessons[lessonIdx];
  const exId    = lesson.exercises[exerciseIdx];
  const data    = await fetchJSON(`data/exercises/${exId}.json`);

  exerciseText = data.text;

  // Update lessonChars for current lesson — must happen before updateKeyboard()
  lessonChars = lesson.chars ?? [];
  document.querySelector('.char-row-wrap')?.classList.remove('full-width');

  // Set engine combine mode from exercise JSON (default: false)
  combineMode = data.combination_mode === true;

  // ── Message exercise ────────────────────────────────────────────────────
  if (data.exercise_type === 'message') {
    // stats-bar always visible in left panel
    $charRow.innerHTML = '';
    $charRow.closest('.char-row-wrap')?.classList.add('full-width');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message-box';
    msgDiv.innerHTML = data.text.replace(/\n/g, '<br>');
    $charRow.appendChild(msgDiv);
    // Highlight required key with correct finger
    const msgKey = data.key || 'any';
    if (msgKey !== 'Enter' && msgKey !== 'any') {
      activateKey(msgKey);
    } else {
      // Show home position fingers for any-key messages
      updateKeyboard();
      const _doc = svgDoc();
      if (_doc) resetFingers(_doc);
    }
    $capture.focus();
    // Wait for specified key to advance — block all other keys
    _msgKeyHandler = e => {
      e.preventDefault();
      e.stopPropagation();
      const expected = msgKey === 'Enter' ? 'Enter' : msgKey;
      const anyKey   = msgKey === 'any';
      if (anyKey ||
          (expected === 'Enter' && e.key === 'Enter') ||
          (expected !== 'Enter' && e.code === expected)) {
        document.removeEventListener('keydown', _msgKeyHandler, true);
        _msgKeyHandler = null;
        const lesson = manifest.lessons[lessonIdx];
        exerciseIdx++;
        if (exerciseIdx >= lesson.exercises.length) {
          exerciseIdx = 0;
          lessonIdx++;
        }
        if (lessonIdx < manifest.lessons.length) {
          saveProgress();
          loadExercise();
        }
      }
    };
    // Delay attaching listener so current keypress doesn't immediately trigger next message
    setTimeout(() => {
      document.addEventListener('keydown', _msgKeyHandler, true);
    }, 300);
    return;
  }
  tamilEngine.setCombine(combineMode);
  console.log(`loadExercise: combination_mode=${data.combination_mode} combineMode=${combineMode} engine.combine=${tamilEngine.combine}`);

  updateLabel();
  updateKeyboard();
  updateBackButton();

  tamilEngine.reset();

  if (combineMode) {
    comboEngine.load(exerciseText, data.accuracy_target ?? 100);
    activeEngine = comboEngine;
  } else {
    typingEngine.load(exerciseText, false, data.accuracy_target ?? 100);
    activeEngine = typingEngine;
  }

  // Stats bar is always visible, but only populated for non-introduction
  // exercises (updateStats() early-returns for 'introduction'). Clear it on
  // every load — including introduction — so it can't show stale numbers
  // left over from whatever exercise ran before it.
  currentExerciseType = data.exercise_type ?? 'introduction';
  currentMilestone    = data.mile_stone ?? null;
  $statAccuracy.textContent = '';
  $statCpm.textContent = '';
  $statTarget.textContent = '';
  $statsBar.dataset.started = 'false';

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
  renderStreakWidget();
  await loadExercise();
}

// ── Picker ───────────────────────────────────────────────────────────────────

// Tier classification based on lesson type
function getLessonTier(lesson) {
  if (!lesson.combination_mode) return 'basic';
  const name = lesson.name;
  if (name.startsWith('வாக்கியங்கள்') || name.startsWith('பந்தி')) return 'advanced';
  return 'intermediate';
}

const TIER_INFO = {
  basic:        { label: '🟢 ஆரம்ப நிலை',  order: 0 },
  intermediate: { label: '🟡 இடைநிலை',      order: 1 },
  advanced:     { label: '🔴 உயர் நிலை',    order: 2 },
};

// Exercise type → Tamil label
const EXERCISE_LABELS = {
  'introduction': 'அறிமுகம்',
  'practice':     'பயிற்சி',
  'review':       'மதிப்பாய்வு',
  'message':      'செய்தி',
};

// Message-type exercises never call saveExercisePass() (they advance via
// a keypress-to-continue handler, not the typing engine), so
// hasPassedExercise()/eluthu_scores has nothing to check for them. Whether
// the user has read a given position is instead inferred from how far
// they've actually progressed (eluthu_lesson/eluthu_exercise, the same
// data maxReachedIdx() already tracks) — strictly before the furthest-
// reached position means it's already been advanced past.
function hasReachedPast(li, ei) {
  const { l, e } = maxReachedIdx();
  return li < l || (li === l && ei < e);
}

// Groups a lesson's exercises into picker tiles: consecutive message-type
// exercises collapse into ONE tile (per user decision — a run of several
// celebration/instructional screens shouldn't each get their own button);
// every other exercise type keeps its own tile, unchanged.
function buildTileGroups(lesson) {
  const groups = [];
  let i = 0;
  while (i < lesson.exercises.length) {
    const exType = lesson.exercise_types?.[i] ?? 'practice';
    if (exType === 'message') {
      let j = i;
      while (j < lesson.exercises.length && (lesson.exercise_types?.[j] ?? 'practice') === 'message') {
        j++;
      }
      groups.push({ startEi: i, endEi: j - 1, isMessageGroup: true });
      i = j;
    } else {
      groups.push({ startEi: i, endEi: i, isMessageGroup: false });
      i++;
    }
  }
  return groups;
}

// Same idea as buildTileGroups(), one level up: in this app's actual
// content, a "message" is usually an entire dedicated pseudo-lesson
// (lesson.name === '─'), not an exercise nested inside a typing lesson —
// consecutive message-lessons in the manifest collapse into one combined
// picker card instead of one card per lesson.
function buildLessonGroups(lessons) {
  const groups = [];
  let i = 0;
  while (i < lessons.length) {
    if (lessons[i].name === '─') {
      let j = i;
      while (j < lessons.length && lessons[j].name === '─') j++;
      groups.push({ startLi: i, endLi: j - 1, isMessageGroup: true });
      i = j;
    } else {
      groups.push({ startLi: i, endLi: i, isMessageGroup: false });
      i++;
    }
  }
  return groups;
}

function buildPicker() {
  if (!manifest) return;
  // No recompute-everything sweep here anymore — the new star algorithm
  // (accuracy fixed thresholds + speed vs. a specific reference intro) is
  // self-contained per lesson, nothing about it can shift from OTHER
  // lessons' activity the way the old cross-lesson baseline could.
  $pickerList.innerHTML = '';

  let visibleLessonCount = 0;
  let currentTier = null;
  let currentGrid = null;
  let currentScrollTarget = null;

  buildLessonGroups(manifest.lessons).forEach(group => {
    if (group.isMessageGroup) {
      const { startLi, endLi } = group;
      const isCurrent = lessonIdx >= startLi && lessonIdx <= endLi;
      // Message lessons have exactly one exercise (always index 0), so
      // "has the user moved past the last lesson in this run" reduces to
      // comparing against that fixed position.
      const isDone = hasReachedPast(endLi, 0);

      const msgCard = document.createElement('div');
      msgCard.className = 'picker-message-card';

      // Just an emoji, no truncated text preview — same simplification as
      // the message-type-exercise tiles within a normal lesson.
      if (isCurrent) {
        msgCard.classList.add('picker-lesson-current');
        currentScrollTarget = msgCard;
        msgCard.textContent = '🟡 💬';
      } else if (isDone) {
        msgCard.textContent = '✅ 💬';
      } else {
        msgCard.textContent = '💬';
      }

      msgCard.addEventListener('click', () => {
        lessonIdx   = startLi;
        exerciseIdx = 0;
        lessonChars = manifest.lessons[startLi].chars ?? [];
        closePicker();
        loadExercise();
      });

      // Sits inside the SAME 2-column grid as neighboring lesson tiles,
      // rather than a full-width row between grid sections. Deliberately
      // does NOT reset currentTier/currentGrid (unlike before) — doing so
      // was forcing every lesson adjacent to a message to spuriously start
      // its own single-lesson section, even when it was genuinely the same
      // tier as before.
      if (!currentGrid) {
        currentGrid = document.createElement('div');
        currentGrid.className = 'picker-grid';
        $pickerList.appendChild(currentGrid);
      }
      currentGrid.appendChild(msgCard);
      return;
    }

    const li     = group.startLi;
    const lesson = manifest.lessons[li];
    visibleLessonCount++;

    const tier = getLessonTier(lesson);

    // Insert tier header when tier changes
    if (tier !== currentTier) {
      currentTier = tier;
      const header = document.createElement('div');
      header.className = 'picker-tier-header';
      header.textContent = TIER_INFO[tier].label;
      $pickerList.appendChild(header);

      currentGrid = document.createElement('div');
      currentGrid.className = 'picker-grid';
      $pickerList.appendChild(currentGrid);
    }

    const block = document.createElement('div');
    block.className = 'picker-lesson';
    if (li === lessonIdx) block.classList.add('picker-lesson-current');

    const name = document.createElement('div');
    name.className = 'picker-lesson-name';
    name.textContent = `நிலை ${visibleLessonCount}`;
    block.appendChild(name);

    // Star rating — only shown once the lesson is fully completed; unattempted
    // or partially-attempted lessons show nothing (not a "0 stars" state).
    const stars = getLessonStars(li);
    if (stars > 0) {
      const starEl = document.createElement('div');
      starEl.className = 'picker-lesson-stars';
      starEl.textContent = renderStarRating(stars);
      block.appendChild(starEl);
    }

    // Character chips or lesson name label for special lessons
    const chips = document.createElement('div');
    chips.className = 'picker-chips';

    const specialNames = { 'சொற்கள்': 'சொற்கள்', 'வாக்கியங்கள்': 'வாக்கியங்கள்', 'பந்தி': 'பந்தி' };
    const specialKey = Object.keys(specialNames).find(k => lesson.name.startsWith(k));

    if (specialKey) {
      // Show lesson name as a single chip
      const chip = document.createElement('span');
      chip.className = 'picker-chip picker-chip-special';
      chip.textContent = lesson.name;
      chips.appendChild(chip);
    } else {
      // Combo lessons: consonants only (vowels appear inside combo notation)
      // Non-combo lessons: consonants + vowels + pulli
      const keyChars = lesson.chars
        .filter(c => lesson.combination_mode
          ? (c >= 'க' && c <= 'ஹ')
          : (c >= 'க' && c <= 'ஹ') || (c >= 'அ' && c <= 'ஔ') || c === '்')
        .slice(0, 18);
      keyChars.forEach(ch => {
        const chip = document.createElement('span');
        chip.className = 'picker-chip';
        chip.textContent = ch;
        chips.appendChild(chip);
      });

    }
    block.appendChild(chips);

    const exWrap = document.createElement('div');
    exWrap.className = 'picker-exercises';

    buildTileGroups(lesson).forEach(group => {
      const { startEi, endEi, isMessageGroup } = group;
      const btn = document.createElement('button');
      btn.className = 'picker-ex-btn';

      if (isMessageGroup) {
        // Consecutive message screens collapse into one tile: no text
        // label, just a fixed emoji — clicking jumps to the first message
        // in the run; "done" means the LAST message in the run has been
        // read (matches: whichever is the latest is what determines
        // completion — same logic as the individual-message case, just
        // extended to the whole group).
        const isCurrent = li === lessonIdx && exerciseIdx >= startEi && exerciseIdx <= endEi;
        const isDone    = hasReachedPast(li, endEi);

        if (isCurrent) {
          btn.classList.add('current');
          currentScrollTarget = block;
          btn.textContent = '🟡 💬';
        } else if (isDone) {
          btn.classList.add('passed');
          btn.textContent = '✅ 💬';
        } else {
          btn.textContent = '💬';
        }

        btn.addEventListener('click', () => {
          lessonIdx   = li;
          exerciseIdx = startEi;
          lessonChars = manifest.lessons[li].chars;
          closePicker();
          loadExercise();
        });
        exWrap.appendChild(btn);
        return;
      }

      // Non-message tiles: unchanged from before, one exercise = one tile.
      const ei = startEi;
      const isCurrent = li === lessonIdx && ei === exerciseIdx;
      const isPassed  = hasPassedExercise(li, ei);

      const exType  = lesson.exercise_types?.[ei] ?? 'practice';
      const exLabel = EXERCISE_LABELS[exType] ?? `பயிற்சி ${ei + 1}`;

      // Prefer the progress sparkline (needs 2+ logged attempts); fall
      // back to the plain last-score text for exercises passed only once,
      // or passed before this history feature existed (their history log
      // starts empty and only fills in from here on).
      const graph = isPassed ? renderScoreSparkline(getScoreHistory(li, ei)) : null;

      if (isCurrent) {
        btn.classList.add('current');
        currentScrollTarget = block;
        btn.textContent = `🟡 ${exLabel}`;
      } else if (isPassed) {
        // Latest attempt, not best-ever — the best-ever record still
        // drives stars/badges, but the picker box itself should reflect
        // "how did I just do" rather than a running max that can lag
        // behind a worse (but most recent) redo.
        const score = getLatestScore(li, ei);
        btn.classList.add('passed');
        const hasScore = score && typeof score === 'object' && score.accuracy !== undefined;
        // score.wpm != null (not a strict truthy check) — a legitimately
        // fast exercise can compute to exactly 0 WPM (elapsed rounds to 0
        // at Date.now()'s millisecond resolution on very short/fast
        // exercises); a truthy check would hide that real 0 the same way
        // as a genuinely unrecorded null/undefined value.
        // Always shown, same as before the sparkline existed — the graph
        // is a separate overlay (see below), not a replacement for this.
        // Accuracy and WPM colored separately (matching the sparkline's
        // green accuracy line / blue WPM line) rather than one flat
        // inherited color, so the box's numbers visually key to the
        // overlay graph's two series.
        const fallback = hasScore
          ? `<span class="picker-score">`
            + `<span class="picker-score-acc">${score.accuracy}%</span>`
            + (score.wpm != null ? ` · <span class="picker-score-wpm">${score.wpm} WPM</span>` : '')
            + `</span>`
          : '';
        btn.innerHTML = `✅ ${exLabel}` + fallback;
      } else {
        btn.textContent = exLabel;
      }

      btn.addEventListener('click', () => {
        lessonIdx   = li;
        exerciseIdx = ei;
        lessonChars = manifest.lessons[li].chars;
        closePicker();
        loadExercise();
      });

      exWrap.appendChild(btn);

      // The sparkline is appended directly to the LESSON CARD (not next to
      // the button), absolutely positioned as a large overlay that spans
      // from near the exercise row up over the tile — deliberately drawn
      // across the star rating and the box above it, since it's meant to
      // read as a big background trend line for the whole tile rather
      // than a small per-exercise indicator. It has no fill and
      // pointer-events:none, so it never blocks clicking the tiles or
      // stars underneath it.
      if (graph) block.insertAdjacentHTML('beforeend', graph);
    });

    block.appendChild(exWrap);
    currentGrid.appendChild(block);
  });

  // Auto-scroll to current lesson
  if (currentScrollTarget) {
    setTimeout(() => currentScrollTarget.scrollIntoView(
      { behavior: 'smooth', block: 'center' }), 100);
  }
}

function openPicker() {
  buildPicker();
  $pickerOverlay.classList.remove('hidden');
}

function closePicker() {
  $pickerOverlay.classList.add('hidden');
}

document.getElementById('btn-picker').addEventListener('click', openPicker);
document.getElementById('btn-restart')?.addEventListener('click', restartExercise);
document.getElementById('btn-back')?.addEventListener('click', goBack);

// Keyboard shortcuts removed (pause feature removed)
document.getElementById('btn-picker-close').addEventListener('click', closePicker);

// Close on overlay background click or anywhere outside the panel
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

// ── Restart & Back ────────────────────────────────────────────────────────────

function restartExercise() {
  loadExercise();
}

function goBack() {
  if (!manifest) return;
  let li = lessonIdx;
  let ei = exerciseIdx - 1;
  if (ei < 0) { li--; if (li < 0) return; ei = manifest.lessons[li].exercises.length - 1; }
  lessonIdx = li; exerciseIdx = ei;
  lessonChars = manifest.lessons[li].chars ?? [];
  saveProgress(); loadExercise();
}

function updateBackButton() {
  const btn = document.getElementById('btn-back');
  if (!btn) return;
  const isFirst = lessonIdx === 0 && exerciseIdx === 0;
  btn.disabled = isFirst;
  btn.classList.toggle('ctrl-btn-disabled', isFirst);
}


// ── Progress persistence ─────────────────────────────────────────────────────

function saveProgress() {
  localStorage.setItem('eluthu_lesson',   lessonIdx);
  localStorage.setItem('eluthu_exercise', exerciseIdx);
}

// ── Exercise pass/fail state ──────────────────────────────────────────────────
const SCORES_KEY = 'eluthu_scores';

function loadScores() {
  try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}'); }
  catch { return {}; }
}

function saveExercisePass(lessonIdx, exerciseIdx, wpm, accuracy) {
  const scores = loadScores();
  const key    = `${lessonIdx}-${exerciseIdx}`;
  const prev   = scores[key];

  // Track accuracy-best and wpm-best as two INDEPENDENT running maxima,
  // rather than one "best attempt as a whole" record. This matters because
  // a redo can legitimately have lower accuracy than a prior best while
  // still carrying a real, worth-keeping wpm measurement — e.g. an old
  // record saved as {wpm: null, accuracy: 100} from before wpm was always
  // recorded, redone at 95% accuracy: a "keep only if this whole attempt
  // beats the old one" comparison would refuse the update (95 < 100) and
  // the null would stay stuck forever, even though backfilling wpm here
  // doesn't misrepresent the accuracy record at all — the best-ever
  // accuracy (100) is still correctly preserved below via Math.max.
  const roundedAccuracy = Math.round(accuracy);
  const bestAccuracy = prev ? Math.max(prev.accuracy, roundedAccuracy) : roundedAccuracy;
  const prevWpm       = prev?.wpm ?? -Infinity;
  const bestWpm        = Math.max(prevWpm, wpm);

  scores[key] = {
    accuracy: bestAccuracy,
    wpm: bestWpm === -Infinity ? null : bestWpm,
  };
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

function getExerciseScore(lessonIdx, exerciseIdx) {
  return loadScores()[`${lessonIdx}-${exerciseIdx}`] ?? null;
}

function hasPassedExercise(lessonIdx, exerciseIdx) {
  return !!getExerciseScore(lessonIdx, exerciseIdx);
}

// ── Per-exercise score history (picker progress sparkline) ────────────────────
// Keeps a short trailing log of past PASSED attempts per exercise, so the
// picker can draw a tiny accuracy/WPM trend line instead of just the
// single best-ever score. Independent of eluthu_scores (which only tracks
// running maxima) — this is the only place attempt-by-attempt history lives.
// Capped per exercise so localStorage doesn't grow without bound over
// months of daily practice across hundreds of exercises.
const SCORE_HISTORY_KEY = 'eluthu_score_history';
const SCORE_HISTORY_MAX = 10; // trailing attempts kept per exercise

function loadScoreHistory() {
  try { return JSON.parse(localStorage.getItem(SCORE_HISTORY_KEY) || '{}'); }
  catch { return {}; }
}

function saveScoreHistoryData(data) {
  try { localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(data)); }
  catch {}
}

function recordScoreHistory(lessonIdx, exerciseIdx, accuracy, wpm) {
  const all  = loadScoreHistory();
  const key  = `${lessonIdx}-${exerciseIdx}`;
  const list = all[key] ?? [];
  list.push({ ts: Date.now(), accuracy: Math.round(accuracy), wpm: wpm ?? null });
  if (list.length > SCORE_HISTORY_MAX) list.splice(0, list.length - SCORE_HISTORY_MAX);
  all[key] = list;
  saveScoreHistoryData(all);
}

function getScoreHistory(lessonIdx, exerciseIdx) {
  return loadScoreHistory()[`${lessonIdx}-${exerciseIdx}`] ?? [];
}

// The most recent PASSED attempt's accuracy/wpm, for display in the
// picker — deliberately different from getExerciseScore() (which tracks
// the best-ever running max, still used for badges/stars). Falls back to
// the best-ever record for exercises passed before this history feature
// existed, so old passes don't suddenly show nothing.
function getLatestScore(lessonIdx, exerciseIdx) {
  const history = getScoreHistory(lessonIdx, exerciseIdx);
  if (history.length) {
    const last = history[history.length - 1];
    return { accuracy: last.accuracy, wpm: last.wpm };
  }
  return getExerciseScore(lessonIdx, exerciseIdx);
}

// Tiny inline-SVG sparkline: accuracy % and WPM as two separate stacked
// lanes (accuracy on top, WPM below), each scaled independently to its own
// min/max within the history window. Two lanes rather than one shared
// height — with only a couple of points, an "accuracy improved" line and
// a "WPM improved" line normalize to the exact same diagonal coordinates
// when scaled onto one shared height, so the accuracy line (drawn last)
// completely hides the WPM line underneath it. Separate lanes guarantee
// both are always visible regardless of how their trends compare.
// Returns null when there are fewer than 2 points — a single dot isn't a
// trend, so the caller falls back to the plain "last score" text.
function renderScoreSparkline(history) {
  if (!history || history.length < 2) return null;

  const W = 120, H = 60, PADX = 4, LANE_PAD = 3, GAP = 6;
  const laneH = (H - GAP) / 2;
  const n = history.length;
  const xStep = (W - 2 * PADX) / (n - 1);

  // Returns the polyline points string plus the first and last PLOTTED
  // point (x, y, and the actual value there — not necessarily history[0]/
  // history[n-1], since a null wpm entry is skipped when plotting, so the
  // first/last plotted point can be an inner index). Positions are in
  // viewBox coordinates, so the caller can drop value labels exactly on
  // each line's two tips (as %-positioned HTML labels, not SVG text —
  // text inside this viewBox would get stretched/skewed the same way the
  // polylines do, since the box uses preserveAspectRatio="none").
  function series(vals, laneTop) {
    const known = vals.filter(v => v != null);
    if (known.length < 2) return null;
    const min = Math.min(...known), max = Math.max(...known);
    const range = max - min || 1;
    const pts = [];
    vals.forEach((v, i) => {
      if (v == null) return;
      const x = PADX + i * xStep;
      const y = laneTop + (laneH - LANE_PAD)
        - ((v - min) / range) * (laneH - 2 * LANE_PAD);
      pts.push({ x, y, v });
    });
    return { pointsAttr: pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
              first: pts[0], last: pts[pts.length - 1] };
  }

  const acc  = series(history.map(h => h.accuracy), 0);
  const wpm  = series(history.map(h => h.wpm), laneH + GAP);
  const last = history[history.length - 1];
  const title = `${last.accuracy}%${last.wpm != null ? ` · ${last.wpm} WPM` : ''} (last ${n} attempts)`;

  const svg = `<svg class="picker-score-graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`
    + `<title>${title}</title>`
    + (acc ? `<polyline points="${acc.pointsAttr}" class="spark-acc" />` : '')
    + (wpm ? `<polyline points="${wpm.pointsAttr}" class="spark-wpm" />` : '')
    + `</svg>`;

  // Value labels positioned by percentage (of the viewBox) so they land
  // on the line's actual endpoints regardless of how much the box is
  // stretched by CSS. The end label anchors growing LEFTWARD (the tip
  // sits near the graph's — and the card's — right edge, so growing
  // right would spill outside the card); the start label anchors growing
  // RIGHTWARD for the same reason at the opposite edge.
  function label(point, unit, cls) {
    if (!point) return '';
    return `<span class="picker-score-graph-label ${cls}" `
      + `style="left:${(point.x / W * 100).toFixed(1)}%; top:${(point.y / H * 100).toFixed(1)}%;">`
      + `${point.v}${unit}</span>`;
  }

  const labels = label(acc?.first, '%', 'acc start')
    + label(acc?.last,  '%', 'acc end')
    + label(wpm?.first, ' WPM', 'wpm start')
    + label(wpm?.last,  ' WPM', 'wpm end');

  return `<div class="picker-score-graph-wrap">${svg}${labels}</div>`;
}

// ── Lesson star ratings ─────────────────────────────────────────────────────
//
// One rating per LESSON, computed the moment its practice-or-review
// exercise passes — never on introduction/message completions. Additive,
// max 5: accuracy-stars (0-3, fixed thresholds) + speed-stars (0-2,
// relative to a reference introduction's speed, not a rolling baseline).
//
//   accuracy: 100%->3, 90%+->2, 80%+->1, else 0
//   speed ratio (this WPM ÷ reference intro's WPM): >=90%->2, >=80%->1, else 0
//   reference intro: practice -> this lesson's own intro
//                     review   -> nearest previous REAL (non-message) lesson's intro
//
// Deliberately self-contained per lesson — nothing here depends on any
// OTHER lesson's data changing over time (unlike the old cross-lesson
// baseline design), so there's no blanket recompute-everything sweep on
// every picker open anymore. Only lessons completed under this algorithm
// get rated by it; already-completed lessons keep whatever they were
// rated before, untouched.
//
// Stars are a running max — a worse redo can't lower an already-earned
// rating. "Latest introduction speed" means whatever's currently stored
// for that intro exercise (already a running best), so a later redo of
// the intro naturally feeds into this calculation without any extra
// tracking needed here.
//
// localStorage['eluthu_lesson_stars']: { "<lessonIdx>": { stars } }

const LESSON_STARS_KEY = 'eluthu_lesson_stars';

function loadLessonStars() {
  try { return JSON.parse(localStorage.getItem(LESSON_STARS_KEY) || '{}'); }
  catch { return {}; }
}

function saveLessonStars(data) {
  try { localStorage.setItem(LESSON_STARS_KEY, JSON.stringify(data)); }
  catch { /* localStorage unavailable — degrade to unrated, no errors */ }
}

function getLessonStars(li) {
  return loadLessonStars()[li]?.stars ?? 0;
}

// ⭐⭐⭐☆☆ style — filled for earned, outline for the remainder, out of 5.
function renderStarRating(stars) {
  return '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
}

function accuracyStars(accuracy) {
  if (accuracy == null) return 0;
  if (accuracy >= 100) return 3;
  if (accuracy >= 90)  return 2;
  if (accuracy >= 80)  return 1;
  return 0;
}

function speedStars(ratio) {
  if (ratio == null) return 0;
  if (ratio >= 0.75) return 2;
  if (ratio >= 0.50) return 1;
  return 0;
}

// This lesson's introduction exercise index, or null if it has none
// (shouldn't happen for a practice/review lesson, but stay defensive).
function findIntroductionEi(li) {
  const lesson = manifest?.lessons?.[li];
  if (!lesson) return null;
  const ei = (lesson.exercise_types ?? []).findIndex(t => (t ?? 'practice') === 'introduction');
  return ei === -1 ? null : ei;
}

// Nearest REAL (non-message) lesson strictly before li — skips over
// message-only pseudo-lessons (lesson.name === '─').
function findPreviousRealLesson(li) {
  if (!manifest) return null;
  for (let i = li - 1; i >= 0; i--) {
    if (manifest.lessons[i]?.name !== '─') return i;
  }
  return null;
}

// The reference introduction's WPM to compare this completion's speed
// against. Null if no valid reference exists (e.g. a review lesson with
// no prior real lesson — assumed not to occur per this lesson's design,
// but stays defensive rather than throwing).
function speedReferenceWpm(li, exType) {
  const refLi = exType === 'review' ? findPreviousRealLesson(li) : li;
  if (refLi == null) return null;
  const introEi = findIntroductionEi(refLi);
  if (introEi == null) return null;
  return getExerciseScore(refLi, introEi)?.wpm ?? null;
}

// Recompute one lesson's star rating. Only called when exType is
// 'practice' or 'review' — introduction/message completions never
// trigger this.
function recalcLessonStars(li, exType, stats) {
  if (exType !== 'practice' && exType !== 'review') return;

  const accStars = accuracyStars(stats.accuracy);

  const refWpm   = speedReferenceWpm(li, exType);
  const ratio    = (refWpm != null && refWpm > 0 && stats.wpm != null) ? stats.wpm / refWpm : null;
  const spdStars = speedStars(ratio);

  const computed = Math.min(5, accStars + spdStars);

  const all  = loadLessonStars();
  const prev = all[li]?.stars ?? 0;
  all[li] = { stars: Math.max(prev, computed) };
  saveLessonStars(all);
}

// Max reachable lesson/exercise (for locked state)
function maxReachedIdx() {
  const l = parseInt(localStorage.getItem('eluthu_lesson')   ?? '0');
  const e = parseInt(localStorage.getItem('eluthu_exercise') ?? '0');
  return { l, e };
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

// ── Practice streak / heatmap / achievement badges ─────────────────────────────
//
// localStorage['eluthu_activity']: { 'YYYY-MM-DD': { exercises, accuracy_avg, wpm_avg, minutes } }
// localStorage['eluthu_badges']:   { 'YYYY-MM-DD': [ { id, unlocked_at } ] }
//
// All reads/writes are wrapped in try/catch so a missing or disabled
// localStorage degrades to "streak shows 0" rather than throwing.

const ACTIVITY_KEY = 'eluthu_activity';
const BADGES_KEY    = 'eluthu_badges';

// Badge config table — every entry shares (id, type, icon, label). Every
// tiered/threshold-based type additionally carries `threshold`; one-off
// milestones carry neither (unlocked explicitly via unlockMilestone(id) —
// see that function's callers). Tiered families use one ESCALATING icon per
// threshold (e.g. 🚶→🏃→🚴→🏍️→🚄→🚀 for daily_wpm_avg) instead of a shared
// icon + tier color — more legible at heatmap-cell size, and doesn't need a
// separate tier/color lookup table. Suppression for the day-reset types
// (daily_minutes, daily_wpm_avg — see tierSuppressed) ranks entries by
// `threshold` within the same `type`, since entries are already listed in
// ascending difficulty order and threshold alone is enough to rank them.
const BADGES = [
  // Daily duration — escalating emoji: stopwatch → timer → alarm clock
  { id: 'daily_15min', type: 'daily_minutes', threshold: 15, icon: '⏱️', label: 'இன்று 15 நிமிடங்கள்' },
  { id: 'daily_30min', type: 'daily_minutes', threshold: 30, icon: '⏲️', label: 'இன்று 30 நிமிடங்கள்' },
  { id: 'daily_60min', type: 'daily_minutes', threshold: 60, icon: '⏰', label: 'இன்று 60 நிமிடங்கள்' },

  // Cumulative lifetime practice — hourglass → calendar (implying "a full day's worth")
  { id: 'total_5hr',  type: 'cumulative_minutes', threshold: 300,  icon: '⌛', label: 'மொத்தம் 5 மணி நேரம்' },
  { id: 'total_24hr', type: 'cumulative_minutes', threshold: 1440, icon: '📆', label: 'மொத்தம் 24 மணி நேரம்' },

  // Streak length — fire → star → crown (escalating prestige)
  { id: 'streak_5',  type: 'streak_days', threshold: 5,  icon: '🔥', label: '5-நாள் தொடர்ச்சி' },
  { id: 'streak_14', type: 'streak_days', threshold: 14, icon: '🌟', label: '2-வார தொடர்ச்சி' },
  { id: 'streak_30', type: 'streak_days', threshold: 30, icon: '👑', label: '1-மாத தொடர்ச்சி' },

  // Daily average speed — literal speed progression: walk → run → bike → motorbike → train → rocket
  { id: 'wpm_10', type: 'daily_wpm_avg', threshold: 10, icon: '🚶', label: 'சராசரி 10 WPM' },
  { id: 'wpm_20', type: 'daily_wpm_avg', threshold: 20, icon: '🏃', label: 'சராசரி 20 WPM' },
  { id: 'wpm_30', type: 'daily_wpm_avg', threshold: 30, icon: '🚴', label: 'சராசரி 30 WPM' },
  { id: 'wpm_40', type: 'daily_wpm_avg', threshold: 40, icon: '🏍️', label: 'சராசரி 40 WPM' },
  { id: 'wpm_50', type: 'daily_wpm_avg', threshold: 50, icon: '🚄', label: 'சராசரி 50 WPM' },
  { id: 'wpm_60', type: 'daily_wpm_avg', threshold: 60, icon: '🚀', label: 'சராசரி 60 WPM' },

  // Cumulative stars across all lessons — escalating star variants.
  // Reads from the lesson-star-rating feature's own storage (eluthu_lesson_stars)
  { id: 'stars_50',   type: 'star_rating', threshold: 50,   icon: '⭐', label: '50 நட்சத்திரங்கள்' },
  { id: 'stars_100',  type: 'star_rating', threshold: 100,  icon: '🌟', label: '100 நட்சத்திரங்கள்' },
  { id: 'stars_250',  type: 'star_rating', threshold: 250,  icon: '💫', label: '250 நட்சத்திரங்கள்' },
  { id: 'stars_500',  type: 'star_rating', threshold: 500,  icon: '✨', label: '500 நட்சத்திரங்கள்' },
  { id: 'stars_1000', type: 'star_rating', threshold: 1000, icon: '🌠', label: '1000 நட்சத்திரங்கள்' },

  // Keyboard-row / character-set / content-stage milestones — one-off, all
  // unlocked via an exercise JSON's `mile_stone` field matching this `id`
  // (see loadExercise()/onComplete()) — no threshold, not evaluated by the
  // generic numeric evaluator at all.
  { id: 'first_lesson', type: 'milestone', icon: '🎹', label: 'முதல் பாடம் முடிந்தது' },
  { id: 'row_home',   type: 'milestone', icon: '⌨️', label: 'மூல வரிசை முடிந்தது' },
  { id: 'row_middle', type: 'milestone', icon: '⌨️', label: 'நடு வரிசை முடிந்தது' },
  { id: 'row_top',    type: 'milestone', icon: '⌨️', label: 'மேல் வரிசை முடிந்தது' },
  { id: 'row_bottom', type: 'milestone', icon: '⌨️', label: 'கீழ் வரிசை முடிந்தது' },

  // Character-set completion — vowels → consonants → all letters (trophy for the final one)
  { id: 'all_vowels',     type: 'milestone', icon: '🅰️', label: 'அனைத்து உயிரெழுத்துகள்' },
  { id: 'all_consonants', type: 'milestone', icon: '🔤', label: 'அனைத்து மெய்யெழுத்துகள்' },
  { id: 'all_letters',    type: 'milestone', icon: '🏆', label: 'அனைத்து தமிழ் எழுத்துகள்' },

  // Content-stage — first sentence → first paragraph
  { id: 'first_sentence',  type: 'milestone', icon: '📝', label: 'முதல் வாக்கியம்' },
  { id: 'first_paragraph', type: 'milestone', icon: '📄', label: 'முதல் பந்தி' },

  // Accuracy — one-off / weekly-repeatable
  { id: 'perfect_exercise',   type: 'exercise_accuracy',   threshold: 100, icon: '💯', label: 'முதல் சரியான பயிற்சி' },
  { id: 'weekly_accuracy_95', type: 'weekly_accuracy_avg', threshold: 95,  icon: '🎯', label: 'இவ்வாரம் 95%+ துல்லியம்' },

  // Re-engagement after a lapse — dedup is per-day (see alreadyEarned), so
  // this can fire again on a later, separate comeback
  { id: 'comeback', type: 'comeback', threshold: 7, icon: '👋', label: 'மீண்டும் வருக' },
];

function todayKey(d = new Date()) {
  // Local calendar date (not UTC), YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadActivity() {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}'); }
  catch { return {}; }
}

function saveActivity(data) {
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(data)); }
  catch { /* localStorage unavailable — degrade silently */ }
}

function loadBadges() {
  try { return JSON.parse(localStorage.getItem(BADGES_KEY) || '{}'); }
  catch { return {}; }
}

function saveBadges(data) {
  try { localStorage.setItem(BADGES_KEY, JSON.stringify(data)); }
  catch { /* localStorage unavailable — degrade silently */ }
}

// Record one completed exercise against today's activity bucket, running
// accuracy_avg/wpm_avg as incremental averages over `exercises` count.
// Record one completed exercise against today's activity bucket, running
// accuracy_avg/wpm_avg as incremental averages over `exercises` count.
// `stats` (the raw single-exercise result) is also passed through to
// evaluateBadges for exercise_accuracy detection, since a day's aggregate
// accuracy_avg can't tell you whether any ONE exercise hit 100%.
function recordActivity(stats) {
  const key      = todayKey();
  const activity = loadActivity();
  const day = activity[key] ?? { exercises: 0, accuracy_avg: 0, wpm_avg: 0, minutes: 0 };

  const prevCount = day.exercises;
  const newCount  = prevCount + 1;
  day.accuracy_avg = ((day.accuracy_avg * prevCount) + (stats.accuracy || 0)) / newCount;
  day.wpm_avg      = ((day.wpm_avg * prevCount) + (stats.wpm || 0)) / newCount;
  day.minutes      = day.minutes + Math.max(0, stats.elapsed || 0);
  day.exercises    = newCount;

  activity[key] = day;
  saveActivity(activity);

  evaluateBadges(key, day, activity, stats);
  renderStreakWidget();
}

function isNextCalendarDay(prevKey, curKey) {
  const [py, pm, pd] = prevKey.split('-').map(Number);
  const prevDate = new Date(py, pm - 1, pd);
  prevDate.setDate(prevDate.getDate() + 1);
  return todayKey(prevDate) === curKey;
}

// Current streak: consecutive days with ≥1 exercise, counted back from today
// (or yesterday, if today has no activity yet — the day isn't "missed" until
// it fully passes). Longest streak is the best consecutive run on record.
function computeStreak(activity) {
  const dates = Object.keys(activity)
    .filter(d => (activity[d]?.exercises ?? 0) > 0)
    .sort();
  if (dates.length === 0) return { current: 0, longest: 0 };

  let longest = 0, run = 0, prev = null;
  dates.forEach(d => {
    run = (prev && isNextCalendarDay(prev, d)) ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  });

  const dateSet = new Set(dates);
  let current = 0;
  let cursor  = new Date();
  if (!dateSet.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(todayKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, longest };
}

// Whether a badge's threshold is newly crossed. `streak_days` uses an exact
// match so a milestone is recorded once — the single day the streak count
// first reaches it — rather than on every subsequent day of the same
// streak. Every other threshold-based type uses >= (a per-day or cumulative
// value re-evaluated fresh, guarded against duplicates by alreadyEarned).
function badgeQualifies(badge, value) {
  if (value == null) return false;
  if (badge.type === 'streak_days') return value === badge.threshold;
  return value >= badge.threshold;
}

// Total minutes practiced across every recorded day, ever.
function cumulativeMinutesTotal(activity) {
  return Object.values(activity).reduce((sum, d) => sum + (d.minutes || 0), 0);
}

// Running total of lesson stars earned, read from the lesson-star-rating
// feature's own storage.
function cumulativeStarsTotal() {
  const lessonStars = loadLessonStars();
  return Object.values(lessonStars).reduce((sum, l) => sum + (l.stars || 0), 0);
}

// This calendar week's (Monday–Sunday, matching the heatmap) accuracy
// average, weighted by each day's exercise count. Null if no activity this
// week yet.
function weeklyAccuracyAvg(activity, today = new Date()) {
  const monday = mondayOf(today);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = activity[todayKey(addDays(monday, i))];
    if (day && day.exercises > 0) days.push(day);
  }
  if (days.length === 0) return null;
  const totalEx = days.reduce((s, d) => s + d.exercises, 0);
  const weighted = days.reduce((s, d) => s + d.accuracy_avg * d.exercises, 0);
  return totalEx > 0 ? weighted / totalEx : null;
}

// Days since the most recent activity date STRICTLY BEFORE `dateKeyStr`.
// Null if there's no prior activity at all (nothing to "come back" from).
function daysSinceLastActivity(activity, dateKeyStr) {
  const priorDates = Object.keys(activity)
    .filter(d => d !== dateKeyStr && (activity[d]?.exercises ?? 0) > 0)
    .sort();
  if (priorDates.length === 0) return null;
  const [ly, lm, ld] = priorDates[priorDates.length - 1].split('-').map(Number);
  const [ty, tm, td] = dateKeyStr.split('-').map(Number);
  const last  = new Date(ly, lm - 1, ld);
  const today = new Date(ty, tm - 1, td);
  return Math.round((today - last) / 86400000);
}

// Whether `badge` has already been earned, per its type's dedup rule:
//   - weekly_accuracy_avg: dedup within the SAME Mon–Sun week only, so it
//     can re-fire on a later, separate qualifying week.
//   - comeback: dedup on the EXACT SAME DAY only (multiple exercises on the
//     comeback day shouldn't duplicate it), so a later, separate comeback
//     can still fire.
//   - everything else: once ever, across all dates — the lifetime default.
function alreadyEarned(badge, dateKey, badgesStore) {
  if (badge.type === 'weekly_accuracy_avg') {
    const [y, m, d] = dateKey.split('-').map(Number);
    const monday = mondayOf(new Date(y, m - 1, d));
    const sunday = addDays(monday, 6);
    return Object.entries(badgesStore).some(([k, list]) => {
      const [ky, km, kd] = k.split('-').map(Number);
      const kdate = new Date(ky, km - 1, kd);
      return kdate >= monday && kdate <= sunday && list.some(b => b.id === badge.id);
    });
  }
  if (badge.type === 'comeback') {
    return (badgesStore[dateKey] || []).some(b => b.id === badge.id);
  }
  return Object.values(badgesStore).flat().some(b => b.id === badge.id);
}

// Highest threshold ever awarded within a family (daily_minutes /
// daily_wpm_avg only — see tierSuppressed below for why). Entries are
// listed in ascending difficulty order, so threshold alone ranks them —
// no separate tier field needed.
function familyMaxThresholdEverAwarded(type, badgesStore) {
  const earnedIds = new Set(Object.values(badgesStore).flat().map(b => b.id));
  let max = 0;
  BADGES.forEach(b => {
    if (b.type === type && earnedIds.has(b.id)) max = Math.max(max, b.threshold ?? 0);
  });
  return max;
}

// daily_minutes and daily_wpm_avg reset every day (unlike streak_days or the
// cumulative_* / star_rating types, which only ever grow) — so a single big
// day can jump straight past a low threshold to a high one, and per-badge
// once-ever alone isn't enough: a LATER, smaller day could still "newly"
// qualify for that skipped-over lower threshold and award it after a higher
// one was already shown, which looks like a downgrade. Suppress any
// threshold at or below the family's historical max instead.
function tierSuppressed(badge, badgesStore) {
  if (badge.type !== 'daily_minutes' && badge.type !== 'daily_wpm_avg') return false;
  return (badge.threshold ?? 0) <= familyMaxThresholdEverAwarded(badge.type, badgesStore);
}

function evaluateBadges(dateKey, dayActivity, activity, exerciseStats) {
  const badgesStore = loadBadges();
  const earnedToday = badgesStore[dateKey] ?? [];
  const { current: streak } = computeStreak(activity);

  const valueByType = {
    daily_minutes:       dayActivity.minutes,
    daily_wpm_avg:       dayActivity.wpm_avg,
    streak_days:         streak,
    cumulative_minutes:  cumulativeMinutesTotal(activity),
    star_rating:         cumulativeStarsTotal(),
    weekly_accuracy_avg: weeklyAccuracyAvg(activity),
    exercise_accuracy:   exerciseStats?.accuracy,
    comeback:            daysSinceLastActivity(activity, dateKey),
  };

  // Group threshold-based badges by type so only the SINGLE HIGHEST
  // newly-qualifying tier per family is awarded per evaluation, not every
  // tier the current value happens to cross at once (e.g. one exercise
  // hitting 41 WPM shouldn't award all of wpm_10/20/30/40 simultaneously —
  // just wpm_40, the highest reached). streak_days uses an exact match so
  // only one of its entries can ever match a given streak value anyway;
  // single-entry types (exercise_accuracy, weekly_accuracy_avg, comeback)
  // are unaffected, since "highest of one" is just that one. tierSuppressed
  // still separately guards daily_minutes/daily_wpm_avg against a LATER
  // smaller day awarding an already-skipped lower tier — that's a
  // cross-day concern this per-evaluation grouping doesn't address.
  const byType = {};
  BADGES.forEach(badge => {
    if (badge.type === 'milestone') return; // unlocked explicitly via unlockMilestone()
    (byType[badge.type] ??= []).push(badge);
  });

  let changed = false;
  Object.entries(byType).forEach(([type, badgesOfType]) => {
    // weekly_accuracy_avg only gets evaluated on SUNDAY (week's end), using
    // the complete Mon-Sun average. Evaluating it continuously through the
    // week would let it fire prematurely on a partial week (e.g. hitting
    // 96% by Wednesday off 1-2 exercises) even if the accuracy drops later
    // and the final full-week average never actually crosses 95%.
    if (type === 'weekly_accuracy_avg') {
      const [y, m, d] = dateKey.split('-').map(Number);
      if (new Date(y, m - 1, d).getDay() !== 0) return; // 0 = Sunday
    }
    const value = valueByType[type];
    let best = null;
    badgesOfType.forEach(badge => {
      if (alreadyEarned(badge, dateKey, badgesStore)) return;
      if (tierSuppressed(badge, badgesStore)) return;
      if (!badgeQualifies(badge, value)) return;
      if (!best || (badge.threshold ?? 0) > (best.threshold ?? 0)) best = badge;
    });
    if (best) {
      earnedToday.push({ id: best.id, unlocked_at: new Date().toISOString() });
      changed = true;
    }
  });

  if (changed) {
    badgesStore[dateKey] = earnedToday;
    saveBadges(badgesStore);
  }
}

// Unlock a milestone-type badge by its `id`. Idempotent — safe to call every
// time the trigger event happens; does nothing once already unlocked. Call
// this from wherever the corresponding completion event actually fires.
function unlockMilestone(id) {
  const badge = BADGES.find(b => b.type === 'milestone' && b.id === id);
  if (!badge) return;

  const badgesStore = loadBadges();
  const alreadyUnlocked = Object.values(badgesStore).flat().some(b => b.id === badge.id);
  if (alreadyUnlocked) return;

  const dateKey = todayKey();
  const today = badgesStore[dateKey] ?? [];
  today.push({ id: badge.id, unlocked_at: new Date().toISOString() });
  badgesStore[dateKey] = today;
  saveBadges(badgesStore);
  renderStreakWidget();
}

// Precedence rule: when a day earned multiple badges, the heatmap cell shows
// only the most recently unlocked one (by unlocked_at). The day-detail popup
// still lists all of them.
function mostRecentBadge(dateKey, badges) {
  const list = badges[dateKey];
  if (!list || list.length === 0) return null;
  return list.reduce((latest, b) =>
    (!latest || new Date(b.unlocked_at) > new Date(latest.unlocked_at)) ? b : latest, null);
}

function activityLevel(exerciseCount) {
  if (!exerciseCount) return 0;
  if (exerciseCount <= 2) return 1;
  if (exerciseCount <= 5) return 2;
  if (exerciseCount <= 9) return 3;
  return 4;
}

function mondayOf(date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function renderHeatmap() {
  const el = document.getElementById('heatmap');
  if (!el) return;
  el.innerHTML = '';

  const activity = loadActivity();
  const badges   = loadBadges();
  const today        = new Date();
  const currentMonday = mondayOf(today);
  const startMonday   = addDays(currentMonday, -7 * 11); // 12 weeks total, incl. current

  for (let week = 0; week < 12; week++) {
    for (let dow = 0; dow < 7; dow++) {
      const date = addDays(startMonday, week * 7 + dow);
      const key  = todayKey(date);
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';

      if (date > today) {
        cell.classList.add('future');
      } else {
        const count = activity[key]?.exercises ?? 0;
        cell.classList.add(`level-${activityLevel(count)}`);

        const badge = mostRecentBadge(key, badges);
        const cfg   = badge ? BADGES.find(b => b.id === badge.id) : null;
        if (cfg) {
          cell.classList.add('badge');
          cell.textContent = cfg.icon;
        }
        cell.title = key;
        cell.addEventListener('click', () => openDayDetail(key));
      }
      el.appendChild(cell);
    }
  }
}

// Just the heatmap — no counter, no legend. Click a day for badge/stat detail.
function renderStreakWidget() {
  renderHeatmap();
}

function formatDateFull(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  try {
    return date.toLocaleDateString('ta-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateKey;
  }
}

function openDayDetail(dateKey) {
  const activity   = loadActivity();
  const badges     = loadBadges();
  const day        = activity[dateKey];
  const dayBadges  = badges[dateKey] ?? [];

  const $date = document.getElementById('day-detail-date');
  const $body = document.getElementById('day-detail-body');
  if (!$date || !$body) return;

  $date.textContent = formatDateFull(dateKey);
  $body.innerHTML = '';

  if (dayBadges.length > 0) {
    const chipWrap = document.createElement('div');
    chipWrap.className = 'day-detail-badges';
    dayBadges.forEach(b => {
      const cfg  = BADGES.find(c => c.id === b.id);
      const chip = document.createElement('span');
      chip.className = 'badge-chip';
      chip.textContent = cfg ? `${cfg.icon} ${cfg.label}` : b.id;
      chipWrap.appendChild(chip);
    });
    $body.appendChild(chipWrap);
  }

  if (!day || day.exercises === 0) {
    const empty = document.createElement('div');
    empty.className = 'day-detail-empty';
    empty.textContent = 'பயிற்சி பதிவு இல்லை (No practice recorded)';
    $body.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'day-detail-stats';
    grid.innerHTML = `
      <div class="stat-item"><span class="stat-value">${day.exercises}</span><span class="stat-label">பயிற்சிகள்</span></div>
      <div class="stat-item"><span class="stat-value">${Math.round(day.wpm_avg)}</span><span class="stat-label">WPM</span></div>
      <div class="stat-item"><span class="stat-value">${Math.round(day.accuracy_avg)}%</span><span class="stat-label">துல்லியம்</span></div>
      <div class="stat-item"><span class="stat-value">${Math.round(day.minutes)}</span><span class="stat-label">நிமிடங்கள்</span></div>
    `;
    $body.appendChild(grid);
  }

  document.getElementById('day-detail-overlay')?.classList.remove('hidden');
}

function closeDayDetail() {
  document.getElementById('day-detail-overlay')?.classList.add('hidden');
}

document.getElementById('day-detail-close')?.addEventListener('click', closeDayDetail);
document.getElementById('day-detail-overlay')?.addEventListener('click', e => {
  if (!e.target.closest('.picker-panel')) closeDayDetail();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
function startApp() {
  if (startApp._started) return;  // prevent double boot
  startApp._started = true;
  boot();
}

$kbdObj.addEventListener('load', () => startApp());
if ($kbdObj.contentDocument?.readyState === 'complete') startApp();

$capture.focus();
