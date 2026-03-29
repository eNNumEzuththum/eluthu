/**
 * typing.js
 * Typing exercise engine for eluthu
 *
 * Handles:
 *   - Character-by-character comparison (correct / incorrect / pending)
 *   - WPM calculation
 *   - Accuracy tracking
 *   - Cursor management
 *   - Exercise state (idle / typing / complete)
 */

window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['typing.js'] = '1.0.0';

'use strict';

class TypingEngine {
  constructor() {
    this._target     = [];   // array of grapheme clusters (target text)
    this._typed      = [];   // array of { char, correct } typed so far
    this._startTime  = null;
    this._endTime    = null;
    this._state      = 'idle'; // idle | typing | complete
    this._errors         = 0;
    this._totalKeys      = 0;
    this._wrongChar      = null;
    this._accuracyTarget = 100;  // default: 100% (cursor blocks on error)

    // Callbacks — set these from app.js
    this.onUpdate   = null;  // called after every keystroke
    this.onComplete = null;  // called when exercise is finished
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  /**
   * Load a new exercise target string.
   * Splits the string into grapheme clusters (handles Tamil combined chars).
   */
  load(targetText, combine=false, accuracyTarget=100) {
    // In non-combination mode use simple codepoint split —
    // Intl.Segmenter merges consecutive combining chars like ்்்்
    // into a single segment, which is wrong for standalone pulli exercises.
    // In combination mode use Segmenter so கா counts as one grapheme.
    if (combine) {
      const segmenter = new Intl.Segmenter();
      this._target = [...segmenter.segment(targetText)].map(s => s.segment);
    } else {
      this._target = [...targetText];  // simple codepoint split
    }
    this._typed     = [];
    this._startTime = null;
    this._endTime   = null;
    this._state     = 'idle';
    this._errors         = 0;
    this._totalKeys      = 0;
    this._wrongChar      = null;
    this._accuracyTarget = accuracyTarget;
    this._notify();
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Called by app.js after the Tamil99Engine produces output.
   * result: { output, replace, type } from Tamil99Engine
   */
  handleEngineResult(result) {
    if (this._state === 'complete') return;
    if (!result || !result.output) {
      if (result && result.replace) this._doBackspace();
      return;
    }

    // Start timer on first keystroke
    if (this._state === 'idle' && result.output.trim()) {
      this._startTime = Date.now();
      this._state = 'typing';
    }

    // Types that replace the pending consonant preview with final output
    const isUyirmeiComplete = result.replace &&
      (result.type === 'uyirmei' || result.type === 'pure_consonant' ||
       result.type === 'implicit_a');

    if (result.replace && !isUyirmeiComplete) {
      this._doBackspace();
    }

    // consonant_pending: just showing preview, don't push yet
    if (result.pending && result.type === 'consonant_pending') {
      this._notify();
      return;
    }

    // implicit_a: consonant committed with implicit அ — push it as one cluster
    if (result.type === 'implicit_a') {
      this._pushCluster(result.output);
      if (this._typed.length >= this._target.length) {
        this._finish();
      } else {
        this._notify();
      }
      return;
    }

    // Each grapheme cluster in the output is one unit
    const segmenter = new Intl.Segmenter();
    const clusters  = [...segmenter.segment(result.output)].map(s => s.segment);

    for (const cluster of clusters) {
      if (cluster === ' ' && this._typed.length === this._target.length) {
        // space after completing target — treat as finish
        this._finish();
        return;
      }
      this._pushCluster(cluster);
    }

    if (this._typed.length >= this._target.length) {
      this._finish();
    } else {
      this._notify();
    }
  }

  /**
   * Handle backspace directly (from app.js when Backspace is pressed
   * and Tamil engine returns replace:true with empty output).
   */
  handleBackspace() {
    if (this._state === 'complete') return;
    this._doBackspace();
    this._notify();
  }

  /**
   * T45: Vowel-strip backspace — called when user is mid-uyirmei (step=1)
   * and presses Backspace. Un-commits the last typed character so the cursor
   * returns to it, ready for a different vowel. No error penalty.
   */
  handleVowelBackspace() {
    if (this._state === 'complete') return;
    if (this._typed.length === 0) return;
    // Pop last entry without counting it as an error
    const removed = this._typed.pop();
    // If it was correct we don't subtract errors (errors only count wrong presses)
    this._wrongChar = null;
    this._notify();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _pushCluster(cluster) {
    const pos = this._typed.length;
    if (pos >= this._target.length) return;

    const expected = this._target[pos];
    const correct  = cluster === expected;
    console.log(`_pushCluster: cluster=${JSON.stringify(cluster)} expected=${JSON.stringify(expected)} correct=${correct} pos=${pos}`);

    this._totalKeys++;

    if (!correct) {
      this._errors++;
      if (this._accuracyTarget === 100) {
        // 100% target: block cursor, show red, user must type correct char
        this._wrongChar = cluster;
        this._notify();
        return;
      }
    }

    // Advance cursor (always for <100% target, only on correct for 100%)
    this._wrongChar = null;
    this._typed.push({ char: cluster, correct });

    // Auto-skip ZWNJ separators
    const ZWNJ = '\u200C';
    while (this._typed.length < this._target.length &&
           this._target[this._typed.length] === ZWNJ) {
      this._typed.push({ char: ZWNJ, correct: true });
    }
  }

  _doBackspace() {
    // Remove trailing auto-inserted spaces first
    while (this._typed.length > 0 &&
           this._typed[this._typed.length - 1].char === ' ' &&
           this._target[this._typed.length - 1] === ' ') {
      this._typed.pop();
    }
    // Then remove the actual character
    if (this._typed.length > 0) {
      const removed = this._typed.pop();
      if (!removed.correct) this._errors = Math.max(0, this._errors - 1);
    }
  }

  _finish() {
    if (this._state === 'complete') return;  // prevent double-fire
    this._endTime = Date.now();
    this._state   = 'complete';
    this._notify();
    console.log(`_finish: errors=${this._errors} typed=${this._typed.length} target=${this._target.length}`);
    if (this.onComplete) this.onComplete(this.stats());
  }

  _notify() {
    if (this.onUpdate) this.onUpdate(this.snapshot());
  }

  /**
   * Called directly from app.js when wrong key is pressed.
   * Shows red flash, cursor stays on current char.
   */
  flashWrong(char) {
    if (this._state === 'complete') return;
    this._errors++;
    this._totalKeys++;
    this._wrongChar = char;
    this._notify();
  }

  /**
   * Called when wrong key pressed with <100% accuracy target.
   * Records error and advances cursor (char marked red).
   */
  pushWrong(char) {
    if (this._state === 'complete') return;
    this._errors++;
    this._totalKeys++;
    this._wrongChar = null;
    const pos = this._typed.length;
    if (pos < this._target.length) {
      this._typed.push({ char: char, correct: false });
    }
    if (this._typed.length >= this._target.length) {
      this._finish();
    } else {
      this._notify();
    }
  }

  /**
   * Clear wrong flash — called when correct key is pressed.
   */
  clearWrong() {
    this._wrongChar = null;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Current state snapshot — used by the UI to render.
   */
  snapshot() {
    return {
      target  : this._target,
      typed   : this._typed,
      cursor  : this._typed.length,
      state   : this._state,
      wrongChar:      this._wrongChar ?? null,
      accuracyTarget: this._accuracyTarget,
      stats   : this.stats(),
    };
  }

  /**
   * Live statistics.
   */
  stats() {
    const elapsed = this._startTime
      ? ((this._endTime || Date.now()) - this._startTime) / 60000
      : 0;
    const words    = this._typed.length / 5;  // standard: 5 chars = 1 word
    const wpm      = elapsed > 0 ? Math.round(words / elapsed) : 0;
    const correct  = this._typed.filter(t => t.correct).length;
    const accuracy = this._totalKeys > 0
      ? Math.round((correct / this._totalKeys) * 100)
      : 100;

    return { wpm, accuracy, correct, errors: this._errors,
             total: this._target.length, typed: this._typed.length, elapsed,
             accuracyTarget: this._accuracyTarget };
  }

  get state()  { return this._state;  }
  get target() { return this._target; }
  get typed()  { return this._typed;  }
  get cursor() { return this._typed.length; }
}

// export for Node tests and browser
if (typeof module !== 'undefined') {
  module.exports = { TypingEngine };
}
