/**
 * lessons.js
 * Lesson progression system for eluthu
 *
 * Design:
 *   - Characters introduced one by one
 *   - Each level has an intro (new char shown + key highlighted) and practice exercises
 *   - Next level unlocks only when current exercise is completed with 100% accuracy
 *   - Progress saved to localStorage
 *   - You define the order in CURRICULUM array below
 */

// @version 1.0.3
window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['lessons.js'] = '1.0.0';

'use strict';

// ── Curriculum ────────────────────────────────────────────────────────────────
// CURRICULUM is used by app.js to build CHAR_TO_KEY and CHAR_TO_FINGER lookups.
// Lesson content and order is defined in lessons.py / data/lessons.json —
// not by the order of entries here.
// Each entry: { char, keyCode, shiftKey, name, description, finger }

const CURRICULUM = [
  // ── Vowels ─────────────────────────────────────────────────────────────────
  // Fill in your preferred order below.
  // Framework is ready — just add/reorder entries.
  { char: 'அ', keyCode: 'KeyA',      shiftKey: false, name: 'அ',  description: 'a  — Key A', finger: 'L4' },
  { char: 'ஆ', keyCode: 'KeyQ',      shiftKey: false, name: 'ஆ',  description: 'aa — Key Q', finger: 'L4' },
  { char: 'இ', keyCode: 'KeyS',      shiftKey: false, name: 'இ',  description: 'i  — Key S', finger: 'L3' },
  { char: 'ஈ', keyCode: 'KeyW',      shiftKey: false, name: 'ஈ',  description: 'ii — Key W', finger: 'L3' },
  { char: 'உ', keyCode: 'KeyD',      shiftKey: false, name: 'உ',  description: 'u  — Key D', finger: 'L2' },
  { char: 'ஊ', keyCode: 'KeyE',      shiftKey: false, name: 'ஊ',  description: 'uu — Key E', finger: 'L2' },
  { char: 'எ', keyCode: 'KeyG',      shiftKey: false, name: 'எ',  description: 'e  — Key G', finger: 'L1' },
  { char: 'ஏ', keyCode: 'KeyT',      shiftKey: false, name: 'ஏ',  description: 'ee — Key T', finger: 'L1' },
  { char: 'ஐ', keyCode: 'KeyR',      shiftKey: false, name: 'ஐ',  description: 'ai — Key R', finger: 'L1' },
  { char: 'ஒ', keyCode: 'KeyC',      shiftKey: false, name: 'ஒ',  description: 'o  — Key C', finger: 'L2' },
  { char: 'ஓ', keyCode: 'KeyX',      shiftKey: false, name: 'ஓ',  description: 'oo — Key X', finger: 'L3' },
  { char: 'ஔ', keyCode: 'KeyZ',      shiftKey: false, name: 'ஔ',  description: 'au — Key Z', finger: 'L4' },

  // ── Consonants ─────────────────────────────────────────────────────────────
  { char: 'க', keyCode: 'KeyH',      shiftKey: false, name: 'க',  description: 'ka — Key H', finger: 'R1' },
  { char: 'ங', keyCode: 'KeyB',      shiftKey: false, name: 'ங',  description: 'nga— Key B', finger: 'L1' },
  { char: 'ச', keyCode: 'BracketLeft', shiftKey: false, name: 'ச', description: 'cha— Key [', finger: 'R4' },
  { char: 'ஞ', keyCode: 'BracketRight',shiftKey: false, name: 'ஞ', description: 'nya— Key ]', finger: 'R4' },
  { char: 'ட', keyCode: 'KeyO',      shiftKey: false, name: 'ட',  description: 'Ta — Key O', finger: 'R3' },
  { char: 'ண', keyCode: 'KeyP',      shiftKey: false, name: 'ண',  description: 'Na — Key P', finger: 'R4' },
  { char: 'த', keyCode: 'KeyL',      shiftKey: false, name: 'த',  description: 'tha— Key L', finger: 'R3' },
  { char: 'ந', keyCode: 'Semicolon', shiftKey: false, name: 'ந',  description: 'na — Key ;', finger: 'R4' },
  { char: 'ப', keyCode: 'KeyJ',      shiftKey: false, name: 'ப',  description: 'pa — Key J', finger: 'R1' },
  { char: 'ம', keyCode: 'KeyK',      shiftKey: false, name: 'ம',  description: 'ma — Key K', finger: 'R2' },
  { char: 'ய', keyCode: 'Quote',     shiftKey: false, name: 'ய',  description: "ya — Key '", finger: 'R4' },
  { char: 'ர', keyCode: 'KeyM',      shiftKey: false, name: 'ர',  description: 'ra — Key M', finger: 'R1' },
  { char: 'ல', keyCode: 'KeyN',      shiftKey: false, name: 'ல',  description: 'la — Key N', finger: 'R1' },
  { char: 'வ', keyCode: 'KeyV',      shiftKey: false, name: 'வ',  description: 'va — Key V', finger: 'L1' },
  { char: 'ழ', keyCode: 'Slash',     shiftKey: false, name: 'ழ',  description: 'zha— Key /', finger: 'R4' },
  { char: 'ள', keyCode: 'KeyY',      shiftKey: false, name: 'ள',  description: 'La — Key Y', finger: 'R1' },
  { char: 'ற', keyCode: 'KeyU',      shiftKey: false, name: 'ற',  description: 'Ra — Key U', finger: 'R1' },
  { char: 'ன', keyCode: 'KeyI',      shiftKey: false, name: 'ன',  description: 'na — Key I', finger: 'R2' },

  // ── Special ────────────────────────────────────────────────────────────────
  { char: '்',  keyCode: 'KeyF',      shiftKey: false, name: 'புள்ளி', description: 'pulli — Key F', finger: 'L1' },
  { char: 'ஃ',  keyCode: 'KeyF',      shiftKey: true,  name: 'ஆய்தம்', description: 'aytham — Shift+F', finger: 'L1' },

  // ── Punctuation ────────────────────────────────────────────────────────────
  { char: ',',  keyCode: 'Comma',     shiftKey: false, name: ',', description: 'comma — Comma key', finger: 'R4' },
  { char: '.',  keyCode: 'Period',    shiftKey: false, name: '.', description: 'period — Period key', finger: 'R4' },
];

// ── Exercise Generator ────────────────────────────────────────────────────────
/**
 * Generate practice exercises for a given level.
 * Uses only characters learned so far (indices 0..levelIdx).
 *
 * Returns an array of exercise strings.
 */
/**
 * Generate exercises for a level.
 * If a lesson JSON file is loaded (via loadLesson), uses its exercises.
 * Otherwise generates automatically from learned chars.
 */
function generateExercises(levelIdx) {
  const learned = CURRICULUM.slice(0, levelIdx + 1).map(c => c.char);
  const newChar = CURRICULUM[levelIdx].char;
  const exercises = [];

  // Exercise 1: new character repeated
  exercises.push(Array(8).fill(newChar).join(' '));

  // Exercise 2: new + previous alternated
  if (levelIdx > 0) {
    const prev = CURRICULUM[levelIdx - 1].char;
    exercises.push(Array(5).fill([newChar, prev]).flat().join(' '));
  }

  // Exercise 3: random mix
  if (learned.length > 1) {
    const mix = Array.from({length: 12}, () =>
      learned[Math.floor(Math.random() * learned.length)]);
    exercises.push(mix.join(' '));
  }

  // Exercise 4: longer random mix
  if (learned.length > 2) {
    const mix = Array.from({length: 18}, () =>
      learned[Math.floor(Math.random() * learned.length)]);
    exercises.push(mix.join(' '));
  }

  return exercises;
}

/**
 * Load a lesson from a JSON file.
 * Usage: await loadLesson('lessons/lesson-01.json')
 * Returns { chars, exercises } or null on error.
 */
async function loadLesson(path) {
  try {
    const res  = await fetch(path);
    const data = await res.json();
    return { chars: data.chars, exercises: data.exercises };
  } catch(e) {
    console.warn('எழுது: could not load lesson', path, e);
    return null;
  }
}

// ── Progress Storage ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'eluthu_progress';

function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {
    console.warn('eluthu: could not save progress', e);
  }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(e) {
    return null;
  }
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── LessonManager ─────────────────────────────────────────────────────────────
class LessonManager {
  constructor() {
    const saved = loadProgress();

    // currentLevel: index into CURRICULUM (which char we're on)
    this.currentLevel    = saved?.currentLevel    ?? 0;
    // highestUnlocked: furthest level ever reached
    this.highestUnlocked = saved?.highestUnlocked ?? 0;
    // exerciseIdx within current level
    this.exerciseIdx     = 0;
    // whether we're in the intro card or practice
    this.phase           = 'intro'; // 'intro' | 'practice'
    // exercises for current level
    this.exercises       = generateExercises(this.currentLevel);
    // streak across exercises
    this.streak          = saved?.streak ?? 0;
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get totalLevels()    { return CURRICULUM.length; }
  get levelData()      { return CURRICULUM[this.currentLevel]; }
  get currentExercise(){ return this.exercises[this.exerciseIdx]; }
  get isLastExercise() { return this.exerciseIdx >= this.exercises.length - 1; }
  get isLastLevel()    { return this.currentLevel >= CURRICULUM.length - 1; }

  get progress() {
    return {
      level:    this.currentLevel,
      total:    this.totalLevels,
      percent:  Math.round((this.currentLevel / this.totalLevels) * 100),
      streak:   this.streak,
      char:     this.levelData.char,
      phase:    this.phase,
    };
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Called when user completes an exercise with 100% accuracy.
   * Advances to next exercise or next level.
   */
  onPerfectComplete() {
    this.streak++;

    if (this.isLastExercise) {
      // All exercises done for this level — unlock next
      this._unlockNext();
    } else {
      // Move to next exercise within this level
      this.exerciseIdx++;
      this._save();
    }
  }

  /**
   * Called when user completes with < 100% accuracy.
   * Restart the same exercise.
   */
  onImperfectComplete() {
    this.streak = 0;
    this.exerciseIdx = 0; // restart from first exercise of this level
    this.exercises = generateExercises(this.currentLevel); // regenerate random mix
    this._save();
  }

  /**
   * Move from intro card → practice.
   */
  startPractice() {
    this.phase = 'practice';
    this.exerciseIdx = 0;
    this.exercises = generateExercises(this.currentLevel);
  }

  /**
   * Jump to a specific level (for the level picker UI).
   * Only allowed if level <= highestUnlocked.
   */
  jumpTo(levelIdx) {
    if (levelIdx > this.highestUnlocked) return false;
    this.currentLevel = levelIdx;
    this.exerciseIdx  = 0;
    this.phase        = 'intro';
    this.exercises    = generateExercises(levelIdx);
    this._save();
    return true;
  }

  _unlockNext() {
    if (!this.isLastLevel) {
      this.currentLevel++;
      this.highestUnlocked = Math.max(this.highestUnlocked, this.currentLevel);
      this.exerciseIdx = 0;
      this.phase = 'intro';
      this.exercises = generateExercises(this.currentLevel);
    }
    this._save();
  }

  _save() {
    saveProgress({
      currentLevel:    this.currentLevel,
      highestUnlocked: this.highestUnlocked,
      streak:          this.streak,
    });
  }

  resetAll() {
    clearProgress();
    this.currentLevel    = 0;
    this.highestUnlocked = 0;
    this.exerciseIdx     = 0;
    this.phase           = 'intro';
    this.streak          = 0;
    this.exercises       = generateExercises(0);
  }
}

// ── Export ────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
  module.exports = { LessonManager, CURRICULUM, generateExercises };
}
