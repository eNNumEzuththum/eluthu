/**
 * tamil99.js
 * Tamil 99 Keyboard Engine for eluthu
 *
 * Two modes controlled by setCombine():
 *
 *   combine = false (default, non-combination mode):
 *     Every keystroke produces exactly one standalone character.
 *     No combining ever — ப + ஆ = ப then ஆ separately.
 *     Use for learning individual characters and muscle memory.
 *
 *   combine = true (combination mode):
 *     Consonant + vowel → uyirmei (கா கி கு ...)
 *     Consonant + pulli → pure consonant (க்)
 *     Implicit அ: consonant alone = 1 keypress (no KeyA needed)
 *     Same consonant twice → pulli on first (க்க)
 *     Soft+hard pairs → auto-pulli on soft (ம்ப ந்த …)
 *     அ de-linker: KeyA after consonant commits it, next keystroke is independent
 *     Use for combined character lessons.
 *
 * Result object returned by processKey():
 *   { type, output, replace, pending }
 *   - output  : string to INSERT into text at cursor
 *   - replace : if true, REMOVE the last inserted character first
 *   - pending : the consonant currently waiting (combine mode only)
 */

window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['tamil99.js'] = '1.0.0';

'use strict';

// ── Key Map ───────────────────────────────────────────────────────────────────
const KEY_MAP = {
  KeyQ: { normal: 'ஆ', shift: 'ஸ'    },
  KeyW: { normal: 'ஈ', shift: 'ஷ'    },
  KeyE: { normal: 'ஊ', shift: 'ஜ'    },
  KeyR: { normal: 'ஐ', shift: 'ஹ'    },
  KeyT: { normal: 'ஏ', shift: 'க்ஷ'  },
  KeyY: { normal: 'ள', shift: 'ஶ்ரீ' },
  KeyU: { normal: 'ற', shift: 'ஶ'    },
  KeyI: { normal: 'ன', shift: null    },
  KeyO: { normal: 'ட', shift: null    },
  KeyP: { normal: 'ண', shift: null    },
  BracketLeft:  { normal: 'ச', shift: null },
  BracketRight: { normal: 'ஞ', shift: null },
  KeyA: { normal: 'அ', shift: null },
  KeyS: { normal: 'இ', shift: null },
  KeyD: { normal: 'உ', shift: null },
  KeyF: { normal: '்', shift: 'ஃ'  },
  KeyG: { normal: 'எ', shift: null },
  KeyH: { normal: 'க', shift: null },
  KeyJ: { normal: 'ப', shift: null },
  KeyK: { normal: 'ம', shift: null },
  KeyL: { normal: 'த', shift: null },
  Semicolon: { normal: 'ந', shift: null },
  Quote:      { normal: 'ய', shift: null },
  KeyZ: { normal: 'ஔ', shift: null },
  KeyX: { normal: 'ஓ', shift: null },
  KeyC: { normal: 'ஒ', shift: null },
  KeyV: { normal: 'வ', shift: null },
  KeyB: { normal: 'ங', shift: null },
  KeyN: { normal: 'ல', shift: null },
  KeyM: { normal: 'ர', shift: null },
  Slash:        { normal: 'ழ', shift: null },
  Comma:        { normal: ',', shift: null },
  Period:       { normal: '.', shift: null },
};

const VOWELS = new Set(['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ']);
const CONSONANTS = new Set(['க','ங','ச','ஞ','ட','ண','த','ந','ப','ம','ய','ர','ல','வ','ழ','ள','ற','ன']);
const PULLI = '்';

// Soft consonant → its paired hard consonant (auto-pulli on soft when hard follows)
const SOFT_HARD_PAIRS = {
  'ங': 'க',
  'ஞ': 'ச',
  'ந': 'த',
  'ண': 'ட',
  'ம': 'ப',
  'ன': 'ற',
};

// Vowel → vowel marker (suffix that attaches to consonant)
const VOWEL_TO_MARKER = {
  'அ': '',    // implicit - consonant alone carries அ sound
  'ஆ': 'ா',
  'இ': 'ி',
  'ஈ': 'ீ',
  'உ': 'ு',
  'ஊ': 'ூ',
  'எ': 'ெ',
  'ஏ': 'ே',
  'ஐ': 'ை',
  'ஒ': 'ொ',
  'ஓ': 'ோ',
  'ஔ': 'ௌ',
};

// ── Engine ────────────────────────────────────────────────────────────────────
class Tamil99Engine {
  constructor() {
    this._pending     = null;   // consonant waiting to be resolved (combine mode only)
    this._combine     = false;  // false = non-combination mode (default)
    this._autoConvert = false;  // true after same-consonant pulli fires
    this._delinked    = false;  // true after அ de-linker fires
  }

  /**
   * Set combine mode.
   * false = each keystroke produces one standalone character (default)
   * true  = consonant+vowel combines into uyirmei
   */
  setCombine(combine) {
    this._combine     = combine;
    this._pending     = null;
    this._autoConvert = false;
    this._delinked    = false;
  }

  get combine() { return this._combine; }

  /**
   * Main entry point — call this from your keydown handler.
   * Returns null if the key should be ignored.
   */
  processKey(event) {
    if (this._shouldIgnore(event)) return null;

    if (event.code === 'Backspace') return this._handleBackspace();
    if (event.code === 'Space')     return this._handleSpace();
    if (event.code === 'Enter')     return this._commitPending('\n');

    const mapping = KEY_MAP[event.code];
    if (!mapping) return null;

    const char = event.shiftKey ? mapping.shift : mapping.normal;
    if (!char) return null;

    return this._processChar(char);
  }

  _processChar(char) {

    // ── Non-combination mode: every key = one standalone character ────────────
    if (!this._combine) {
      return { type: 'standalone', output: char, replace: false, pending: null };
    }

    // ── Combination mode ──────────────────────────────────────────────────────

    // ── Pulli: makes a pure consonant ────────────────────────────────────────
    if (char === PULLI) {
      if (this._pending) {
        const out = this._pending + PULLI;
        this._pending     = null;
        this._autoConvert = false;
        this._delinked    = false;
        return { type: 'pure_consonant', output: out, replace: true, pending: null };
      }
      return { type: 'pulli_alone', output: PULLI, replace: false, pending: null };
    }

    // ── அ key — special de-linker behaviour ───────────────────────────────────
    // When a consonant is pending, KeyA commits it with implicit அ and
    // sets _delinked so the NEXT vowel/consonant is independent (no combining).
    if (char === 'அ' && this._pending) {
      const committed   = this._pending;
      this._pending     = null;
      this._autoConvert = false;
      this._delinked    = true;   // next keystroke is independent
      return { type: 'implicit_a', output: committed, replace: true, pending: null };
    }

    // ── Vowel ─────────────────────────────────────────────────────────────────
    if (VOWELS.has(char)) {
      if (this._pending && !this._delinked) {
        // க + ஆ = கா
        const marker      = VOWEL_TO_MARKER[char];
        const out         = this._pending + marker;
        this._pending     = null;
        this._autoConvert = false;
        this._delinked    = false;
        return { type: 'uyirmei', output: out, replace: true, pending: null };
      }
      // No pending, or _delinked — standalone vowel
      this._delinked = false;
      return { type: 'vowel', output: char, replace: false, pending: null };
    }

    // ── Consonant ─────────────────────────────────────────────────────────────
    if (CONSONANTS.has(char)) {

      // Clear de-link flag — new consonant starts fresh
      this._delinked = false;

      if (this._pending) {
        const prev = this._pending;

        // Rule 1: Same consonant twice → pulli on first (க + க → க்க)
        // _autoConvert alternates so repeated presses keep toggling
        if (char === prev && !this._autoConvert) {
          this._pending     = char;
          this._autoConvert = true;
          return { type: 'consonant_chain', output: prev + PULLI + char, replace: true, pending: char };
        }

        // If _autoConvert was set and same consonant again — treat as normal chain
        // (k்k + k → commit k்k, new pending k)
        if (char === prev && this._autoConvert) {
          this._pending     = char;
          this._autoConvert = false;
          return { type: 'consonant_chain', output: char, replace: false, pending: char };
        }

        // Rule 2: Soft+hard pair → pulli on soft (ம + ப → ம்ப)
        // Skip if _autoConvert is true — after same-consonant pulli (ம்ம),
        // the pending ம should commit as bare consonant, not trigger soft+hard again.
        if (SOFT_HARD_PAIRS[prev] === char && !this._autoConvert) {
          this._pending     = char;
          this._autoConvert = false;
          return { type: 'consonant_chain', output: prev + PULLI + char, replace: true, pending: char };
        }

        // Regular consonant chain — commit previous with implicit அ, new pending
        const committed   = prev;
        this._pending     = char;
        this._autoConvert = false;
        return { type: 'consonant_chain', output: char, replace: false, pending: char };
      }

      // No pending — new consonant starts as pending preview
      this._pending     = char;
      this._autoConvert = false;
      return { type: 'consonant_pending', output: char, replace: false, pending: char };
    }

    // ── Other (grantha, symbols) ──────────────────────────────────────────────
    return this._commitPending(char);
  }

  _commitPending(char) {
    if (this._pending) {
      const committed   = this._pending;
      this._pending     = null;
      this._autoConvert = false;
      this._delinked    = false;
      return { type: 'commit_other', output: committed + char, replace: false, pending: null };
    }
    return { type: 'other', output: char, replace: false, pending: null };
  }

  _handleBackspace() {
    if (this._pending) {
      this._pending     = null;
      this._autoConvert = false;
      this._delinked    = false;
      return { type: 'backspace_pending', output: '', replace: true, pending: null };
    }
    // No pending — signal UI to strip vowel marker if last char was uyirmei,
    // otherwise do a regular backspace.
    return { type: 'backspace', output: '', replace: true, pending: null };
  }

  _handleSpace() {
    if (this._pending) {
      // Commit pending consonant with implicit அ, then space
      const committed   = this._pending;
      this._pending     = null;
      this._autoConvert = false;
      this._delinked    = false;
      return { type: 'commit_space', output: committed + ' ', replace: true, pending: null };
    }
    return { type: 'space', output: ' ', replace: false, pending: null };
  }

  _shouldIgnore(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) return true;
    if (['Shift','Control','Alt','Meta','CapsLock','Tab','Escape',
         'ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return true;
    return false;
  }

  reset() {
    this._pending     = null;
    this._autoConvert = false;
    this._delinked    = false;
    // Note: _combine is NOT reset here — it is set per exercise
  }

  get pendingConsonant() {
    return this._pending;
  }
}

// ── Tests (node tamil99.js) ───────────────────────────────────────────────────
if (typeof module !== 'undefined' && require.main === module) {
  const engine = new Tamil99Engine();

  function fakeEvent(code, shift=false) {
    return { code, shiftKey: shift, ctrlKey: false, altKey: false, metaKey: false,
             key: code };
  }

  function simulate(steps, combine=true) {
    engine.reset();
    engine.setCombine(combine);
    let text = '';
    const segmenter = new (require('node:v8').DefaultDeserializer ? Intl.Segmenter : Intl.Segmenter)();
    for (const [code, shift=false] of steps) {
      const result = engine.processKey(fakeEvent(code, shift));
      if (!result) continue;
      if (result.replace) {
        const segs = [...new Intl.Segmenter().segment(text)];
        text = segs.slice(0, -1).map(s => s.segment).join('');
      }
      text += result.output;
    }
    return text;
  }

  const K = false;

  const tests = [
    // ── Non-combination mode ──────────────────────────────────────────────────
    ['NC: ப standalone',        [[`KeyJ`,K]],                false, 'ப'],
    ['NC: ப+அ = two chars',     [[`KeyJ`,K],[`KeyA`,K]],     false, 'பஅ'],

    // ── Combination mode: basic ───────────────────────────────────────────────
    ['அ alone',                 [['KeyA',K]],                true, 'அ'],
    ['ஆ alone',                 [['KeyQ',K]],                true, 'ஆ'],
    ['க alone',                 [['KeyH',K]],                true, 'க'],
    ['கா',                      [['KeyH',K],['KeyQ',K]],     true, 'கா'],
    ['கி',                      [['KeyH',K],['KeyS',K]],     true, 'கி'],
    ['கு',                      [['KeyH',K],['KeyD',K]],     true, 'கு'],
    ['க் pure',                 [['KeyH',K],['KeyF',K]],     true, 'க்'],
    ['நன்றி',                   [['Semicolon',K],['KeyI',K],['KeyF',K],['KeyU',K],['KeyS',K]], true, 'நன்றி'],

    // ── T44: Implicit அ — consonant alone = 1 keypress ───────────────────────
    ['T44: ப alone (implicit அ)', [['KeyJ',K]], true, 'ப'],
    // T44 verification: ப in exercise needs only KeyJ not KeyJ+KeyA

    // ── T46/T47: Same consonant → pulli ──────────────────────────────────────
    ['T46: க்க (H+H)',           [['KeyH',K],['KeyH',K]],    true, 'க்க'],
    ['T47: க்கக்க (H×4)',        [['KeyH',K],['KeyH',K],['KeyH',K],['KeyH',K]], true, 'க்கக்க'],
    ['T47: க்கக்கக்க (H×6)',     [['KeyH',K],['KeyH',K],['KeyH',K],['KeyH',K],['KeyH',K],['KeyH',K]], true, 'க்கக்கக்க'],

    // ── T48/T49: Soft+hard pairs ──────────────────────────────────────────────
    ['T48: ம்ப (K+J)',            [['KeyK',K],['KeyJ',K]],    true, 'ம்ப'],
    ['T48: ந்த (;+L)',            [['Semicolon',K],['KeyL',K]], true, 'ந்த'],
    ['T49: ங்க (B+H)',            [['KeyB',K],['KeyH',K]],    true, 'ங்க'],
    ['T49: ஞ்ச (]+[)',            [['BracketRight',K],['BracketLeft',K]], true, 'ஞ்ச'],
    ['T49: ண்ட (P+O)',            [['KeyP',K],['KeyO',K]],    true, 'ண்ட'],
    ['T49: ன்ற (I+U)',            [['KeyI',K],['KeyU',K]],    true, 'ன்ற'],

    // ── T50/T51: அ de-linker ─────────────────────────────────────────────────
    ['T50: க+A+Q = க ஆ',         [['KeyH',K],['KeyA',K],['KeyQ',K]], true, 'கஆ'],
    ['T51: க+A+க = க க (no pulli)',[['KeyH',K],['KeyA',K],['KeyH',K]], true, 'கக'],

    // ── Words ─────────────────────────────────────────────────────────────────
    ['வணக்கம்', [['KeyV',K],['KeyP',K],['KeyH',K],['KeyF',K],['KeyH',K],['KeyK',K],['KeyF',K]], true, 'வணக்கம்'],
    ['தமிழ்',   [['KeyL',K],['KeyK',K],['KeyS',K],['Slash',K],['KeyF',K]], true, 'தமிழ்'],
    ['அம்மா',   [['KeyA',K],['KeyK',K],['KeyF',K],['KeyK',K],['KeyQ',K]], true, 'அம்மா'],
  ];

  let passed = 0, failed = 0;
  console.log('=== எழுது · Tamil 99 Engine Tests v1.2.0 ===\n');

  for (const [desc, steps, combine, expected] of tests) {
    const got = simulate(steps, combine);
    const ok  = got === expected;
    if (ok) passed++; else failed++;
    console.log(`${ok ? '✓' : '✗'} ${desc}`);
    if (!ok) console.log(`    expected: "${expected}"\n    got:      "${got}"`);
  }

  console.log(`\n${passed}/${passed+failed} tests passed`);
}

if (typeof module !== 'undefined') {
  module.exports = { Tamil99Engine, KEY_MAP, VOWELS, CONSONANTS, VOWEL_TO_MARKER, SOFT_HARD_PAIRS };
}
