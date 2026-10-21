#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_lessons.py — எழுது
Generates exercise JSON files and updates data/lessons.json manifest.

Reads:
  - lesson_plan.json  (hand-written: messages and lesson structure, no ids)
  - lesson_words.json (lesson metadata, words and the permanent lesson ids; created and
                       updated by add_words_to_lesson.py — run that script first)

Lesson ids are permanent and never derived from list position; exercise ids are
lesson-local ("01", "02", ...) fixed slots (see "Exercise ids" below).

Usage:
    python3 generate_lessons.py
"""

import json
import os
import random

from add_words_to_lesson import LessonIds   # ids are created there; read-only here

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR        = os.path.dirname(os.path.abspath(__file__))
EXERCISES_DIR     = os.path.join(SCRIPT_DIR, 'data', 'exercises')
LESSONS_FILE      = os.path.join(SCRIPT_DIR, 'data', 'lessons.json')
LESSON_WORDS_FILE = os.path.join(SCRIPT_DIR, 'lesson_words.json')
LESSON_PLAN_FILE  = os.path.join(SCRIPT_DIR, 'lesson_plan.json')

# ── Tamil character classification ────────────────────────────────────────────

def is_consonant(ch):
    return '\u0B95' <= ch <= '\u0BB9'

def is_vowel(ch):
    return '\u0B85' <= ch <= '\u0B94'

# ── Vowel → marker mapping ────────────────────────────────────────────────────

VOWEL_TO_MARKER = {
    'அ': '',  'ஆ': 'ா', 'இ': 'ி', 'ஈ': 'ீ', 'உ': 'ு',
    'ஊ': 'ூ', 'எ': 'ெ', 'ஏ': 'ே', 'ஐ': 'ை', 'ஒ': 'ொ',
    'ஓ': 'ோ', 'ஔ': 'ௌ',
}

UYIRMEI_VOWEL_ORDER = ['அ', '்', 'ஐ', 'எ', 'ஏ', 'உ', 'ஊ', 'ஒ', 'இ', 'ஈ', 'ஓ', 'ஆ', 'ஔ']

# ── Uyirmei helpers ───────────────────────────────────────────────────────────

def make_uyirmei_chars(consonant):
    result = []
    for vowel in UYIRMEI_VOWEL_ORDER:
        if vowel == '்':
            result.append(consonant + '்')
        elif vowel == 'அ':
            result.append(consonant)
        else:
            result.append(consonant + VOWEL_TO_MARKER[vowel])
    return result

# ── Smart join ────────────────────────────────────────────────────────────────

def smart_join(chars, combination_mode):
    if not combination_mode:
        return ''.join(chars).strip()
    result = []
    i = 0
    while i < len(chars):
        ch = chars[i]
        if is_consonant(ch) and i + 1 < len(chars) and is_vowel(chars[i + 1]):
            result.append(ch + VOWEL_TO_MARKER.get(chars[i + 1], ''))
            i += 2
        else:
            result.append(ch)
            i += 1
    return ''.join(result).strip()

# ── Practice word generator (non-combo) ──────────────────────────────────────

def make_practice_words(pool, target=30):
    words = []
    intro = [ch * 3 for ch in pool]
    random.shuffle(intro)
    words += intro
    for i in range(len(pool)):
        c1 = pool[i]; c2 = pool[(i + 1) % len(pool)]
        words += [c1 * 2 + c2, c2 + c1 * 2, c1 + c2 + c1 + c2]
    words = words[:target]
    needed = max(target - len(words), 8)
    words += [''.join(random.choice(pool) for _ in range(random.randint(3, 5)))
              for _ in range(needed)]
    words = words[:target]
    conclusion = []
    for i in range(4):
        conclusion.append(pool[i % len(pool)] + pool[(i+1) % len(pool)] + pool[(i+2) % len(pool)])
    random.shuffle(conclusion)
    words += conclusion[:4]
    words = [w for w in words if 3 <= len(w) <= 5]
    while len(words) < target:
        w = ''.join(random.choice(pool) for _ in range(random.randint(3, 5)))
        if 3 <= len(w) <= 5:
            words.append(w)
    words = words[:target]
    result = []
    for i, word in enumerate(words):
        result += list(word)
        if i < len(words) - 1:
            result.append(' ')
    return result

# ── Non-combo exercise generator ──────────────────────────────────────────────

def max_words(chars):
    """N = 25 + (number of chars - 1) × 2, capped at 50"""
    return min(50, 25 + (len(chars) - 1) * 2)

def make_non_combo_exercises(chars, lesson_id):
    exercises     = []
    practice_pool = [c for c in chars if c != ' ']

    if not chars:
        if len(practice_pool) >= 2:
            text = make_practice_words(practice_pool, target=max_words(chars))
            exercises.append(smart_join(text, False))
        return exercises

    # Intro_1, Intro_2, ... — each key repeated twice
    intro_parts = [smart_join([ch] * 2, False) for ch in chars]

    pattern1 = ''  # Intro_3 — mix both keys, no space
    pattern2 = ''  # Intro_4 — mix both keys, with space (not used in the combined form)
    if len(chars) >= 2:
        text = []
        for i in range(len(chars)):
            c1 = chars[i]; c2 = chars[(i + 1) % len(chars)]
            text += [c1]*4 + [c2]*4 + [c1]*2 + [c2]*2 + [c1, c2, c2, c1]
        pattern1 = smart_join(text, False)

        text = []
        for ch in chars:
            text += ([ch] + [' ']) * 3
        for i in range(len(chars)):
            c1 = chars[i]; c2 = chars[(i+1) % len(chars)]
            text += [c1, c2, ' '] * 2
        pattern2 = smart_join(text, False)

    practice_text = ''  # Intro_5 — pseudo-word practice
    if len(practice_pool) >= 2:
        practice_text = smart_join(make_practice_words(practice_pool, target=max_words(chars)), False)

    if len(chars) == 2:
        # Combine Intro_1 + Intro_2 + Intro_3 (Intro_4 dropped) into a single
        # introduction exercise, no length limit. Practice words (Intro_5)
        # remain a separate exercise, not part of the introduction.
        combined = ' '.join(p for p in (intro_parts[0], intro_parts[1], pattern1) if p)
        exercises.append(combined)
        if practice_text:
            exercises.append(practice_text)
        return exercises

    # Fallback (len(chars) == 1, or >= 3 if ever routed here): old behavior.
    exercises.extend(intro_parts)
    if pattern1:
        exercises.append(pattern1)
    if pattern2:
        exercises.append(pattern2)
    if practice_text:
        exercises.append(practice_text)

    return exercises

# ── Combo exercise generator ──────────────────────────────────────────────────

def make_combo_exercises(consonants, words, lesson_id, has_words=True, include_review=True):
    """
    Ex 1: Introduction — each uyirmei char twice with space (100%)
    Ex 2: Short words only, each repeated at least twice, fill to N (90%)
          Skipped if word_count == 0
    Ex 3: If words > N → all words (incl. sentences), no repeats, first N (80%)
          If words ≤ N → all words, randomized order, fill to N (80%)
          Skipped if word_count == 0, or if include_review is False
    """
    exercises = []
    words     = words or []
    N         = max_words(consonants)

    uyirmei_pool = []
    for consonant in consonants:
        uyirmei_pool += make_uyirmei_chars(consonant)

    # Ex 1: Introduction
    intro = []
    for ch in uyirmei_pool:
        intro += [ch, ' ', ch, ' ']
    exercises.append(''.join(intro).strip())

    if not has_words:
        return exercises

    # Ex 2: Short words, filled/truncated to a flat cap of MAX_WORDS
    short_words = [w for w in words if ' ' not in w]
    ex2 = list(short_words)
    if short_words:
        if len(ex2) > N:
            ex2 = ex2[:N]
        else:
            while len(ex2) < N:
                ex2 += short_words
            ex2 = ex2[:N]
    exercises.append(' '.join(ex2).strip())

    if not include_review:
        return exercises

    # Ex 3: All words, fill to N, randomized
    if len(words) > N:
        ex3 = words[:N]
    else:
        ex3 = []
        while len(ex3) < N:
            batch = list(words)
            random.shuffle(batch)
            ex3 += batch
        ex3 = ex3[:N]
    exercises.append(' '.join(ex3).strip())

    return exercises

# ── Lesson ids ────────────────────────────────────────────────────────────────
# Permanent lesson ids are created by add_words_to_lesson.py and stored in
# lesson_words.json (see the "Lesson ids" section there). This script only
# READS them: run add_words_to_lesson.py first.

# ── Exercise ids ──────────────────────────────────────────────────────────────
# Exercise ids are lesson-local ("01", "02", ...) and are fixed SLOTS, not list
# positions: a slot number always means the same exercise within that kind of
# lesson, so adding or removing an exercise never renumbers the others, and a
# retired slot is never reused. To add a new kind of exercise, give it the next
# number above everything listed here (including retired slots).
#
#   kind              slot 1          slot 2     retired (never reuse)
#   message           message         -          -
#   special           review          -          -
#   combo_multi       review          -          -
#   combo_single      introduction    practice   3 (review)
#   review_only       review          -          -
#   non_combo_pair    introduction    practice   3-6 (older multi-step intro)
#   non_combo_single  introduction    -          2-6
EXERCISE_SLOTS = {
    'message':          (1,),
    'special':          (1,),
    'combo_multi':      (1,),
    'combo_single':     (1, 2),
    'review_only':      (1,),
    'non_combo_pair':   (1, 2),
    'non_combo_single': (1,),
}

# accuracy target per slot (100 = introduction, 90 = practice, 80 = review)
EXERCISE_ACCURACY = {
    'message':          {1: 100},
    'special':          {1: 80},
    'combo_multi':      {1: 80},
    'combo_single':     {1: 100, 2: 90},
    'review_only':      {1: 80},
    'non_combo_pair':   {1: 100, 2: 90},
    'non_combo_single': {1: 100},
}

ACCURACY_TO_TYPE = {100: 'introduction', 90: 'practice', 80: 'review'}

def exercise_file_stem(lid, ex):
    """Exercise files stay data/exercises/<lesson id>-<exercise id>.json"""
    return f"{lid}-{ex}"

def write_exercise(lid, ex, data):
    stem = exercise_file_stem(lid, ex)
    with open(os.path.join(EXERCISES_DIR, f"{stem}.json"), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return stem

# ── Milestone helper ──────────────────────────────────────────────────────────

def apply_mile_stone(exercises_dir, stem, mile_stone):
    """Attach a 'mile_stone' field to an already-written exercise file
    (<lesson id>-<exercise id>), inserted just before the 'text' key."""
    path = os.path.join(exercises_dir, f"{stem}.json")
    if not os.path.exists(path):
        print(f"  ⚠ mile_stone '{mile_stone}' — exercise {stem} not found, skipped")
        return
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    new_data = {}
    inserted = False
    for k, v in data.items():
        if k == 'text' and not inserted:
            new_data['mile_stone'] = mile_stone
            inserted = True
        new_data[k] = v
    if not inserted:
        new_data['mile_stone'] = mile_stone
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    print(f"  ★ mile_stone '{mile_stone}' → {stem}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    random.seed(0)
    os.makedirs(EXERCISES_DIR, exist_ok=True)

    if not os.path.exists(LESSON_WORDS_FILE):
        raise SystemExit('lesson_words.json not found — run add_words_to_lesson.py first.')
    with open(LESSON_WORDS_FILE, 'r', encoding='utf-8') as f:
        lesson_words = json.load(f)['lessons']

    with open(LESSON_PLAN_FILE, 'r', encoding='utf-8') as f:
        lesson_plan = json.load(f)

    # Permanent ids come from lesson_words.json (written by add_words_to_lesson.py).
    ids = LessonIds(lesson_plan, allocate=False)

    # lesson_words.json is matched to the plan by lesson id (not position)
    words_by_id = {l['id']: l for l in lesson_words}

    manifest_lessons   = []
    last_exercise_stem = None   # most recently written exercise file (any lesson)

    for plan_entry, entry_id_key in zip(lesson_plan, ids.keys):

        # ── Milestone ────────────────────────────────────────────────────────
        # Normally mile_stone points BACKWARD: tag the previous entry's last
        # exercise. Exception: on 'sentence'/'paragraph' special entries, the
        # entry generates its own exercises, so mile_stone points FORWARD to
        # the very first exercise this entry produces.
        mile_stone      = plan_entry.get('mile_stone')
        _entry_chars    = plan_entry.get('chars', [])
        is_fwd_special  = _entry_chars in (['sentence'], ['paragraph'])
        forward_mile_stone = mile_stone if (mile_stone and is_fwd_special) else None

        if mile_stone and not is_fwd_special:
            if last_exercise_stem:
                apply_mile_stone(EXERCISES_DIR, last_exercise_stem, mile_stone)
            else:
                print(f"  ⚠ mile_stone '{mile_stone}' — no previous exercise to tag, skipped")

        # ── Message entry ─────────────────────────────────────────────────────
        if 'message' in plan_entry:
            lid          = ids.id_of(entry_id_key)
            message_text = plan_entry['message']
            message_key  = plan_entry.get('key', 'any')
            slots        = EXERCISE_SLOTS['message']
            ex           = f"{slots[0]:02d}"
            data  = {
                '_version':         '1.0.0',
                'exercise_type':    'message',
                'combination_mode': True,
                'accuracy_target':  100,
                'text':             message_text,
                'key':              message_key,
            }
            last_exercise_stem = write_exercise(lid, ex, data)
            manifest_lessons.append({
                'id': lid, 'name': '─', 'chars': [],
                'combination_mode': False, 'exercises': [ex],
            })
            print(f"\nLesson {lid} — [message] {repr(message_text[:50])}")
            continue

        # ── Special chars: expand multiple lessons from lesson_words ──────────
        chars = plan_entry.get('chars', [])
        if chars in [['word'], ['sentence'], ['paragraph']]:
            special_name = {'word': 'சொற்கள்', 'sentence': 'வாக்கியங்கள்',
                            'paragraph': 'பந்தி'}[chars[0]]
            # Find all lesson_words entries for this special type
            special_entries = [w for w in lesson_words
                               if w.get('name', '').startswith(special_name)]
            fwd_milestone_applied = False
            for lesson in special_entries:
                # id comes from lesson_words.json, which add_words_to_lesson.py
                # builds from this entry's "ids" in the plan
                lid = lesson['id']
                if lid not in ids.special_ids(entry_id_key):
                    print(f"  ⚠ lesson {lid} ({lesson.get('name', '')}) is not one of this "
                          f"entry's ids in lesson_words.json — lesson_words.json looks stale, "
                          f"re-run add_words_to_lesson.py")
                name       = lesson.get('name', '')
                words      = lesson.get('words', [])
                consonants = [ch for ch in lesson.get('chars', []) if is_consonant(ch)]
                word_count = lesson.get('word_count', 0)
                combo      = True

                # Words/sentences/paragraphs: single review exercise, as-is, no repeat
                texts        = [' '.join(words)] if words else []
                slots        = EXERCISE_SLOTS['special']
                accuracy_map = EXERCISE_ACCURACY['special']
                # Override exercise_type to 'review' for all special lessons
                _special_type = 'review'

                exercise_ids = []
                for slot, text in zip(slots, texts):
                    ex              = f"{slot:02d}"
                    accuracy_target = accuracy_map.get(slot, 80)
                    exercise_type   = _special_type
                    data = {
                        '_version': '1.0.0',
                        'exercise_type': exercise_type,
                        'combination_mode': combo, 'accuracy_target': accuracy_target,
                        'text': text.strip(),
                    }
                    stem = write_exercise(lid, ex, data)
                    last_exercise_stem = stem
                    if forward_mile_stone and not fwd_milestone_applied:
                        apply_mile_stone(EXERCISES_DIR, stem, forward_mile_stone)
                        fwd_milestone_applied = True
                    print(f"  {stem}: [{exercise_type}] {repr(text[:60])}{'...' if len(text)>60 else ''}")
                    exercise_ids.append(ex)

                manifest_chars = list(consonants)
                for vowel in VOWEL_TO_MARKER:
                    manifest_chars.append(vowel)
                manifest_lessons.append({
                    'id': lid, 'name': name, 'chars': manifest_chars,
                    'combination_mode': combo, 'exercises': exercise_ids,
                })
                print(f"\nLesson {lid} — {name}  [combination]")
            continue

        # ── Normal lesson — lookup by its permanent id ────────────────────────
        lid    = ids.id_of(entry_id_key)
        lesson = words_by_id.get(lid)
        if lesson is None:
            print(f"  Lesson {lid} — skipped (not in lesson_words.json)")
            continue

        chars      = lesson.get('chars', [])
        combo      = lesson.get('combo', False)
        name       = lesson.get('name', '')
        words      = lesson.get('words', [])
        consonants = [ch for ch in chars if is_consonant(ch)]

        mode_label = 'combination' if combo else 'non-combination'
        print(f"\nLesson {lid} — {name}  [{mode_label}]")

        if combo and consonants:
            word_count   = lesson.get('word_count', 0)
            if len(consonants) >= 2:
                kind = 'combo_multi'
                # Review lesson — single exercise, words as-is from lesson_words.json
                if words:
                    texts = [' '.join(words)]
                else:
                    texts = make_combo_exercises(consonants, words, lesson_id=lid, has_words=False)[:1]
            else:
                kind  = 'combo_single'
                texts = make_combo_exercises(consonants, words, lesson_id=lid,
                                             has_words=word_count > 0, include_review=False)
        else:
            if len(chars) >= 3:
                kind = 'review_only'
                # Review only — single exercise, random words from lesson chars
                pool = [c for c in chars if c != ' ']
                if len(pool) >= 2:
                    text = smart_join(make_practice_words(pool, target=max_words(chars)), False)
                    texts = [text]
                else:
                    texts = []
            elif len(chars) == 2:
                kind  = 'non_combo_pair'
                texts = make_non_combo_exercises(chars, lesson_id=lid)
            else:
                kind  = 'non_combo_single'
                texts = make_non_combo_exercises(chars, lesson_id=lid)

        slots        = EXERCISE_SLOTS[kind]
        accuracy_map = EXERCISE_ACCURACY[kind]
        if len(texts) > len(slots):
            raise SystemExit(f"Lesson {lid} ({kind}) produced {len(texts)} exercises but only "
                             f"slots {slots} are defined — add a new slot to EXERCISE_SLOTS "
                             f"(next number above all used/retired ones).")

        exercise_ids   = []
        exercise_types = []
        for slot, text in zip(slots, texts):
            ex              = f"{slot:02d}"
            accuracy_target = accuracy_map.get(slot, 80)
            exercise_type   = ACCURACY_TO_TYPE.get(accuracy_target, 'review')
            data = {
                '_version': '1.0.0',
                'exercise_type': exercise_type,
                'combination_mode': combo, 'accuracy_target': accuracy_target,
                'text': text.strip(),
            }
            stem = write_exercise(lid, ex, data)
            last_exercise_stem = stem
            print(f"  {stem}: [{exercise_type}] acc={accuracy_target} {repr(text[:50])}{'...' if len(text)>50 else ''}")
            exercise_ids.append(ex)
            exercise_types.append(exercise_type)

        if combo and consonants:
            manifest_chars = list(consonants)
            for vowel in VOWEL_TO_MARKER:
                manifest_chars.append(vowel)
        else:
            manifest_chars = chars

        manifest_lessons.append({
            'id': lid, 'name': name, 'chars': manifest_chars,
            'combination_mode': combo, 'exercises': exercise_ids,
            'exercise_types': exercise_types,
        })

    manifest = {
        '_version':       '1.0.0',
        '_description':   'எழுது lesson manifest',
        'next_lesson_id': ids.next_id,
        'lessons':        manifest_lessons,
    }
    with open(LESSONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\ndata/lessons.json updated — {len(manifest_lessons)} lessons, "
          f"next_lesson_id = {ids.next_id}")
    print(f"Exercise files: {EXERCISES_DIR}")
    print("\nDone! ✓")

if __name__ == '__main__':
    main()
