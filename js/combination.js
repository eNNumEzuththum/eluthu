/**
 * combination.js
 * Combination mode typing engine for eluthu
 *
 * Handles uyirmei lessons where keystrokes form a stream rather than
 * discrete character-by-character inputs. For example:
 *
 *   Target: அப்பா  (segments: ['அ', 'ப்', 'பா'])
 *   Keys:   KeyA → KeyJ → KeyJ → KeyQ
 *
 * The engine (tamil99.js) processes the keystroke stream. This class
 * matches the accumulated output against target clusters, tracks the
 * cursor (which cluster will be affected by the next keystroke), and
 * derives key guidance (what key to press next).
 *
 * Interface is identical to TypingEngine so app.js can swap between them.
 */

window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['combination.js'] = '1.0.2';

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

// Soft consonant → hard consonant (auto-pulli pairs)
const COMBO_SOFT_HARD = {
  'ங': 'க', 'ஞ': 'ச', 'ந': 'த', 'ண': 'ட', 'ம': 'ப', 'ன': 'ற',
};

const COMBO_PULLI = '்';
const COMBO_ZWNJ  = '\u200C';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isConsonant(ch) {
  const cp = ch?.codePointAt(0);
  return cp >= 0x0B95 && cp <= 0x0BB9;
}

function isPulli(ch) { return ch === COMBO_PULLI; }

/**
 * Decompose a target cluster into { consonant, marker }.
 * e.g. 'பா' → { consonant:'ப', marker:'ா' }
 *      'ப்' → { consonant:'ப', marker:'்' }
 *      'ப'  → { consonant:'ப', marker:''  }
 * Returns null if not a consonant-based cluster.
 */
function decomposeCluster(cluster) {
  const chars = [...cluster];
  if (!chars.length || !isConsonant(chars[0])) return null;
  return { consonant: chars[0], marker: chars.slice(1).join('') };
}

// ── CombinationEngine ─────────────────────────────────────────────────────────

class CombinationEngine {
  constructor(charToKey, softHardPairs) {
    // charToKey: { 'ப': 'KeyJ', 'க': 'KeyH', ... } from app.js CHAR_TO_KEY
    // softHardPairs: optional override; defaults to COMBO_SOFT_HARD
    this._charToKey  = charToKey;
    this._softHard   = softHardPairs || COMBO_SOFT_HARD;

    this._target     = [];   // array of grapheme clusters
    this._matched    = [];   // array of { char, correct } — matched clusters
    this._startTime  = null;
    this._endTime    = null;
    this._state      = 'idle'; // idle | typing | complete
    this._errors     = 0;
    this._totalKeys  = 0;
    this._wrongKey   = false; // true when wrong key pressed in 100% mode
    this._accuracyTarget = 100;

    // Engine pending consonant — set by app.js after each keystroke
    this._pendingConsonant = null;
    this._pendingFromSameChain  = false;  // true after same-consonant pulli chain (க்க)
    this._pendingFromCrossChain = false;  // true after cross-consonant chain (க→ண)

    // Callbacks
    this.onUpdate   = null;
    this.onComplete = null;
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  load(targetText, accuracyTarget = 100) {
    const segmenter  = new Intl.Segmenter();
    this._target     = [...segmenter.segment(targetText)].map(s => s.segment);
    this._matched    = [];
    this._startTime  = null;
    this._endTime    = null;
    this._state      = 'idle';
    this._errors     = 0;
    this._totalKeys  = 0;
    this._wrongKey   = false;
    this._accuracyTarget     = accuracyTarget;
    this._pendingConsonant   = null;
    this._pendingFromSameChain  = false;
    this._pendingFromCrossChain = false;
    this._notify();
  }

  // ── Engine state sync ──────────────────────────────────────────────────────

  /**
   * Called by app.js after every keystroke to sync engine pending state.
   * This drives cursor position and key guidance.
   */
  setPending(consonant) {
    this._pendingConsonant = consonant;
  }

  // ── Cursor ─────────────────────────────────────────────────────────────────

  /**
   * Cursor position: index of the target cluster that will be affected
   * by the next keystroke.
   *
   * If engine has a pending consonant, find the first unmatched cluster
   * whose consonant matches the pending. That cluster is "in progress"
   * and the cursor sits on it (or the next one if the pending came from
   * a chain rule that already matched the current cluster).
   */
  get cursor() {
    const base = this._matched.length; // first unmatched index
    if (!this._pendingConsonant) return base;

    // Find first unmatched cluster whose consonant = pending
    for (let i = base; i < this._target.length; i++) {
      const d = decomposeCluster(this._target[i]);
      if (d && d.consonant === this._pendingConsonant) return i;
    }
    return base;
  }

  // ── Key guidance ───────────────────────────────────────────────────────────

  /**
   * Returns the key code the user should press next, or null.
   *
   * Rules (in order):
   * 1. No pending, cursor on a cluster → show consonant key of that cluster
   * 2. Pending = cursor cluster's consonant, cluster is bare consonant,
   *    next cluster starts with same consonant → show KeyA (de-linker)
   * 3. Pending = cursor cluster's consonant, cluster is pure consonant (்):
   *    a. Next cluster's consonant is hard pair of pending → show hard key
   *    b. Otherwise → show same consonant key (same-consonant rule)
   * 4. Pending = next cluster's consonant (carried over) → show vowel key
   * 5. Pending = cursor cluster's consonant, cluster is uyirmei → show vowel key
   */
  getNextKey() {
    const cur = this.cursor;
    if (cur >= this._target.length) return null;

    const curCluster = this._target[cur];
    if (curCluster === ' ' || curCluster === COMBO_ZWNJ) return 'Space';

    const d = decomposeCluster(curCluster);
    if (!d) return this._charToKey[curCluster] ?? null;

    const pending = this._pendingConsonant;
    const nextCluster = this._target[cur + 1] ?? null;
    const dNext = nextCluster ? decomposeCluster(nextCluster) : null;

    // Rule 1: No pending → show consonant key of current cluster
    if (!pending) {
      return this._charToKey[d.consonant] ?? null;
    }

    // Pending matches current cluster's consonant
    if (pending === d.consonant) {

      // Rule 2a: Bare consonant, pending from same-consonant pulli chain (e.g. ப்பப்பா)
      // The pending consonant carries over from the chain — user continues typing.
      if (d.marker === '' && this._pendingFromSameChain) {
        const afterNext = this._target[cur + 1] ?? null;
        if (!afterNext || afterNext === ' ') {
          return 'Space';
        }
        const dAfter = decomposeCluster(afterNext);
        if (dAfter && dAfter.consonant === pending) {
          // Same consonant follows — continue chain
          return this._charToKey[pending] ?? null;
        }
        // Different consonant follows — show next consonant key
        if (dAfter) return this._charToKey[dAfter.consonant] ?? null;
        return 'Space';
      }

      // Rule 2a': Bare consonant, pending from cross-consonant chain (e.g. கணணி)
      // Only show KeyA if the NEXT target starts with the SAME consonant as pending
      // (கணணி: pending=ண, next=ணி, same → KeyA de-linker needed)
      // Otherwise show the next consonant key directly (பணம்: pending=ண, next=ம் → KeyK)
      if (d.marker === '' && this._pendingFromCrossChain) {
        if (dNext && dNext.consonant === pending) {
          return 'KeyA';
        }
        // Different consonant or end — show next key (or Space)
        if (dNext) return this._charToKey[dNext.consonant] ?? null;
        return 'Space';
      }

      // Rule 2b: Bare consonant + next starts with same consonant → KeyA (de-linker)
      // Only fires on a fresh consonant keypress (not from chain).
      if (d.marker === '' && dNext && dNext.consonant === pending) {
        return 'KeyA';
      }

      // Rule 3: Pure consonant (pulli marker)
      if (d.marker === COMBO_PULLI) {
        // 3a: Next cluster is hard pair of pending → show hard consonant key
        if (dNext && this._softHard[pending] === dNext.consonant) {
          return this._charToKey[dNext.consonant] ?? null;
        }
        // 3b: Next cluster starts with same consonant → same-consonant rule
        if (dNext && dNext.consonant === pending) {
          return this._charToKey[pending] ?? null;
        }
        // 3c: No matching next cluster → explicit pulli (KeyF)
        return 'KeyF';
      }

      // Rule 5: Uyirmei → show vowel key
      // For bare consonant (marker=''), pressing the next consonant commits
      // the current pending via regular chain — show next consonant's key.
      if (d.marker === '') {
        return dNext ? (this._charToKey[dNext.consonant] ?? 'Space') : 'Space';
      }
      // (marker is non-empty — fall through to vowel key)
      return this._markerKey(d.marker);
    }

    // Rule 4: Pending matches NEXT cluster's consonant → show vowel of current
    if (dNext && pending === dNext.consonant) {
      return this._markerKey(d.marker);
    }

    // Fallback
    return this._charToKey[d.consonant] ?? null;
  }

  /**
   * Convert a vowel marker string to its key code.
   * e.g. 'ா' → 'KeyQ', 'ி' → 'KeyS', '' → 'KeyA'
   */
  _markerKey(marker) {
    const MARKER_TO_KEY = {
      ''   : 'KeyA',
      '்'  : 'KeyF',
      'ா'  : 'KeyQ',
      'ி'  : 'KeyS',
      'ீ'  : 'KeyW',
      'ு'  : 'KeyD',
      'ூ'  : 'KeyE',
      'ெ'  : 'KeyG',
      'ே'  : 'KeyT',
      'ை'  : 'KeyR',
      'ொ'  : 'KeyC',
      'ோ'  : 'KeyX',
      'ௌ'  : 'KeyZ',
    };
    return MARKER_TO_KEY[marker] ?? null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  /**
   * Called by app.js when the Tamil engine produces output.
   * Matches the output against unmatched target clusters.
   */
  handleEngineResult(result, prevPending) {
    if (this._state === 'complete') return;
    if (!result) return;

    // Start timer on first real keystroke
    if (this._state === 'idle' && result.output?.trim()) {
      this._startTime = Date.now();
      this._state = 'typing';
    }

    // Consonant pending preview — no output to match yet
    // Don't count as a key towards accuracy — it's not a completed input
    if (result.type === 'consonant_pending') {
      this._pendingFromSameChain  = false;
      this._pendingFromCrossChain = false;
      this._notify();
      return;
    }

    // Backspace
    if (result.type === 'backspace' || result.type === 'backspace_pending') {
      this._doBackspace();
      this._notify();
      return;
    }

    if (!result.output) { this._notify(); return; }

    this._totalKeys++;
    this._wrongKey = false;

    // Segment the engine output into clusters and match against target
    const segmenter = new Intl.Segmenter();
    const outClusters = [...segmenter.segment(result.output)].map(s => s.segment);

    // Determine which clusters to match against target:
    // - replace=true with pending: output is e.g. 'ப்ப' — all but last cluster
    //   are committed (e.g. 'ப்'), last is new pending preview
    // - replace=false with pending: regular consonant chain — previous pending
    //   was committed as a bare consonant; output is just the new pending.
    //   Match the previous pending consonant (stored in this._pendingConsonant
    //   before setPending is called by app.js — but app.js calls setPending
    //   AFTER handleEngineResult, so _pendingConsonant still holds prev value).
    //   We use outClusters[0] as the committed consonant (it equals prev pending).
    // - no pending: all clusters are committed
    let clustersToMatch;
    if (result.type === 'consonant_pending') {
      // Just a preview — nothing to match yet
      clustersToMatch = [];
    } else if (result.pending && result.replace) {
      // consonant_chain with pulli: e.g. 'ப்ப' → match ['ப்'], leave 'ப' as pending
      clustersToMatch = outClusters.slice(0, -1);
    } else if (result.type === 'consonant_chain' && result.pending && !result.replace) {
      // Regular consonant chain: previous pending committed as bare consonant.
      // Output is the NEW pending consonant (may differ from prev pending).
      // Match the PREVIOUS pending consonant passed in from app.js.
      clustersToMatch = prevPending ? [prevPending] : outClusters.slice(0, 1);
    } else {
      // uyirmei, pure_consonant, implicit_a, vowel, space — all clusters committed
      clustersToMatch = outClusters;
    }

    // Track chain type — affects Rule 2 key guidance
    if (result.type === 'consonant_chain' && result.pending) {
      if (result.replace) {
        // Same-consonant pulli (க்க) or soft+hard (ம்ப): pending continues same consonant
        this._pendingFromSameChain  = true;
        this._pendingFromCrossChain = false;
      } else {
        // Cross-consonant chain (க→ண): pending is a different consonant
        this._pendingFromSameChain  = false;
        this._pendingFromCrossChain = true;
      }
    } else {
      this._pendingFromSameChain  = false;
      this._pendingFromCrossChain = false;
    }
    for (const cluster of clustersToMatch) {
      if (cluster === ' ' && this._matched.length === this._target.length) {
        this._finish(); return;
      }
      this._matchCluster(cluster);
    }

    if (this._matched.length >= this._target.length) {
      this._finish();
    } else {
      this._notify();
    }
  }

  /**
   * Match one output cluster against the next expected target cluster.
   */
  _matchCluster(cluster) {
    // Skip ZWNJ
    while (this._matched.length < this._target.length &&
           this._target[this._matched.length] === COMBO_ZWNJ) {
      this._matched.push({ char: COMBO_ZWNJ, correct: true });
    }

    const pos = this._matched.length;
    if (pos >= this._target.length) return;

    const expected = this._target[pos];
    const correct  = cluster === expected;

    if (!correct) {
      this._errors++;
      if (this._accuracyTarget === 100) {
        this._wrongKey = true;
        this._notify();
        return;
      }
    }

    this._matched.push({ char: cluster, correct });
  }

  /**
   * Wrong key pressed — called by app.js.
   * In 100% mode: flash red, cursor stays.
   * In <100% mode: advance cursor with error.
   */
  flashWrong() {
    if (this._state === 'complete') return;
    this._errors++;
    this._totalKeys++;
    this._wrongKey = true;
    this._notify();
  }

  pushWrong(cluster) {
    if (this._state === 'complete') return;
    this._errors++;
    this._totalKeys++;
    this._wrongKey = false;
    const pos = this._matched.length;
    if (pos < this._target.length) {
      this._matched.push({ char: cluster, correct: false });
    }
    if (this._matched.length >= this._target.length) {
      this._finish();
    } else {
      this._notify();
    }
  }

  // ── Backspace ──────────────────────────────────────────────────────────────

  _doBackspace() {
    this._wrongKey = false;
    // Remove trailing auto-inserted ZWNJ first
    while (this._matched.length > 0 &&
           this._matched[this._matched.length - 1].char === COMBO_ZWNJ) {
      this._matched.pop();
    }
    if (this._matched.length > 0) {
      const removed = this._matched.pop();
      if (!removed.correct) this._errors = Math.max(0, this._errors - 1);
    }
  }

  /**
   * Called when Backspace pressed with no engine pending.
   * Un-commits last matched cluster. If that cluster had a consonant
   * component, returns it so app.js can restore engine pending state.
   */
  handleBackspace() {
    if (this._state === 'complete') return;
    const removed = this._matched.length > 0
      ? this._matched[this._matched.length - 1]
      : null;
    this._doBackspace();
    // Return the consonant of the removed cluster so app.js can
    // restore engine pending state (T45)
    if (removed) {
      const d = decomposeCluster(removed.char);
      if (d) {
        this.setPending(d.consonant);
        this._notify();
        return d.consonant;
      }
    }
    this.setPending(null);
    this._notify();
    return null;
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _finish() {
    if (this._state === 'complete') return;
    this._endTime = Date.now();
    this._state   = 'complete';
    this._notify();
    if (this.onComplete) this.onComplete(this.stats());
  }

  _notify() {
    if (this.onUpdate) this.onUpdate(this.snapshot());
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  snapshot() {
    return {
      target        : this._target,
      typed         : this._matched,     // same field name as TypingEngine
      cursor        : this.cursor,
      state         : this._state,
      wrongChar     : this._wrongKey ? '?' : null,
      accuracyTarget: this._accuracyTarget,
      stats         : this.stats(),
      nextKey       : this.getNextKey(),  // extra: key guidance
      pending       : this._pendingConsonant,
    };
  }

  stats() {
    const elapsed = this._startTime
      ? ((this._endTime || Date.now()) - this._startTime) / 60000
      : 0;
    const words    = this._matched.length / 5;
    const wpm      = elapsed > 0 ? Math.round(words / elapsed) : 0;
    const correct  = this._matched.filter(t => t.correct).length;
    const accuracy = this._totalKeys > 0
      ? Math.round((correct / this._totalKeys) * 100)
      : 100;

    return {
      wpm, accuracy, correct, errors: this._errors,
      total: this._target.length, typed: this._matched.length,
      elapsed, accuracyTarget: this._accuracyTarget,
    };
  }

  get state()  { return this._state;  }
  get target() { return this._target; }
  get typed()  { return this._matched; }
}

if (typeof module !== 'undefined') {
  module.exports = { CombinationEngine };
}
