#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_lessons.py — எழுது
Generates exercise JSON files and updates data/lessons.json manifest.

Reads:
  - lesson_plan.json  (for messages and lesson structure)
  - lesson_words.json (for lesson metadata and words)

Usage:
    python3 generate_lessons.py
"""

import json
import os
import random

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

UYIRMEI_VOWEL_ORDER = ['அ', '்', 'உ', 'இ', 'எ', 'ஐ', 'ஊ', 'ஈ', 'ஆ', 'ஏ', 'ஒ', 'ஓ', 'ஔ']

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

    for ch in chars:
        exercises.append(smart_join([ch] * 2, False))

    if len(chars) >= 2:
        text = []
        for i in range(len(chars)):
            c1 = chars[i]; c2 = chars[(i + 1) % len(chars)]
            text += [c1]*4 + [c2]*4 + [c1]*2 + [c2]*2 + [c1, c2, c2, c1]
        exercises.append(smart_join(text, False))
        text = []
        for ch in chars:
            text += ([ch] + [' ']) * 3
        for i in range(len(chars)):
            c1 = chars[i]; c2 = chars[(i+1) % len(chars)]
            text += [c1, c2, ' '] * 2
        exercises.append(smart_join(text, False))

    if len(practice_pool) >= 2:
        text = make_practice_words(practice_pool, target=max_words(chars))
        exercises.append(smart_join(text, False))

    return exercises

# ── Combo exercise generator ──────────────────────────────────────────────────

def make_combo_exercises(consonants, words, lesson_id, has_words=True):
    """
    Ex 1: Introduction — each uyirmei char twice with space (100%)
    Ex 2: Short words only, each repeated at least twice, fill to N (90%)
          Skipped if word_count == 0
    Ex 3: If words > N → all words (incl. sentences), no repeats, first N (80%)
          If words ≤ N → all words, randomized order, fill to N (80%)
          Skipped if word_count == 0
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

    # Ex 2: Short words, each repeated at least twice
    short_words = [w for w in words if ' ' not in w]
    ex2 = []
    if short_words:
        for w in short_words:
            ex2 += [w, w]
        while len(ex2) < N:
            extra = list(short_words)
            random.shuffle(extra)
            ex2 += extra
        ex2 = ex2[:N]
    exercises.append(' '.join(ex2).strip())

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

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    random.seed(0)
    os.makedirs(EXERCISES_DIR, exist_ok=True)

    with open(LESSON_WORDS_FILE, 'r', encoding='utf-8') as f:
        lesson_words = json.load(f)

    with open(LESSON_PLAN_FILE, 'r', encoding='utf-8') as f:
        lesson_plan = json.load(f)

    # Lookup lesson_words by ID — IDs match sequential plan positions
    words_by_id = {l['id']: l for l in lesson_words}

    manifest_lessons = []
    lesson_counter   = 0

    for plan_entry in lesson_plan:
        lesson_counter += 1
        lid = str(lesson_counter) if lesson_counter >= 100 else f"{lesson_counter:02d}"

        # ── Message entry ─────────────────────────────────────────────────────
        if 'message' in plan_entry:
            message_text = plan_entry['message']
            message_key  = plan_entry.get('key', 'any')
            ex_id = f"{lid}-01"
            data  = {
                '_version':         '1.0.0',
                'exercise_type':    'message',
                'combination_mode': True,
                'accuracy_target':  100,
                'text':             message_text,
                'key':              message_key,
            }
            with open(os.path.join(EXERCISES_DIR, f"{ex_id}.json"), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            manifest_lessons.append({
                'id': lid, 'name': '─', 'chars': [],
                'combination_mode': False, 'exercises': [ex_id],
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
            for lesson in special_entries:
                lesson_counter += 1
                lid = str(lesson_counter) if lesson_counter >= 100 else f"{lesson_counter:02d}"
                name       = lesson.get('name', '')
                words      = lesson.get('words', [])
                consonants = [ch for ch in lesson.get('chars', []) if is_consonant(ch)]
                word_count = lesson.get('word_count', 0)
                combo      = True

                # Words/sentences/paragraphs: single review exercise, as-is, no repeat
                texts        = [' '.join(words)] if words else []
                accuracy_map = {1: 80}
                # Override exercise_type to 'review' for all special lessons
                _special_type = 'review'

                exercise_ids = []
                for i, text in enumerate(texts, 1):
                    ex_id           = f"{lid}-{i:02d}"
                    accuracy_target = accuracy_map.get(i, 80)
                    exercise_type   = _special_type
                    data = {
                        '_version': '1.0.0', 'exercise_type': exercise_type,
                        'combination_mode': combo, 'accuracy_target': accuracy_target,
                        'text': text.strip(),
                    }
                    with open(os.path.join(EXERCISES_DIR, f"{ex_id}.json"), 'w', encoding='utf-8') as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"  {ex_id}: [{exercise_type}] {repr(text[:60])}{'...' if len(text)>60 else ''}")
                    exercise_ids.append(ex_id)

                manifest_chars = list(consonants)
                for vowel in VOWEL_TO_MARKER:
                    manifest_chars.append(vowel)
                manifest_lessons.append({
                    'id': lid, 'name': name, 'chars': manifest_chars,
                    'combination_mode': combo, 'exercises': exercise_ids,
                })
                print(f"\nLesson {lid} — {name}  [combination]")
            continue

        # ── Normal lesson — lookup by ID ──────────────────────────────────────
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
                # Review lesson — single exercise, words as-is from lesson_words.json
                if words:
                    texts = [' '.join(words)]
                else:
                    texts = make_combo_exercises(consonants, words, lesson_id=lesson_counter, has_words=False)[:1]
                accuracy_map = {1: 80}
            else:
                texts        = make_combo_exercises(consonants, words, lesson_id=lesson_counter, has_words=word_count > 0)
                accuracy_map = {1: 100, 2: 90, 3: 80} if word_count > 0 else {1: 100}
        else:
            if len(chars) >= 3:
                # Review only — single exercise, random words from lesson chars
                pool = [c for c in chars if c != ' ']
                if len(pool) >= 2:
                    text = smart_join(make_practice_words(pool, target=max_words(chars)), False)
                    texts = [text]
                else:
                    texts = []
                accuracy_map = {1: 80}
            else:
                texts        = make_non_combo_exercises(chars, lesson_id=lesson_counter)
                accuracy_map = {1:100, 2:100, 3:100, 4:100, 5:90, 6:80}

        exercise_ids = []
        for i, text in enumerate(texts, 1):
            ex_id           = f"{lid}-{i:02d}"
            accuracy_target = accuracy_map.get(i, 80)
            exercise_type   = {100: 'introduction', 90: 'practice', 80: 'review'}.get(accuracy_target, 'review')
            data = {
                '_version': '1.0.0', 'exercise_type': exercise_type,
                'combination_mode': combo, 'accuracy_target': accuracy_target,
                'text': text.strip(),
            }
            with open(os.path.join(EXERCISES_DIR, f"{ex_id}.json"), 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  {ex_id}: [{exercise_type}] acc={accuracy_target} {repr(text[:50])}{'...' if len(text)>50 else ''}")
            exercise_ids.append(ex_id)

        if combo and consonants:
            manifest_chars = list(consonants)
            for vowel in VOWEL_TO_MARKER:
                manifest_chars.append(vowel)
        else:
            manifest_chars = chars

        manifest_lessons.append({
            'id': lid, 'name': name, 'chars': manifest_chars,
            'combination_mode': combo, 'exercises': exercise_ids,
            'exercise_types': [
                {100: 'introduction', 90: 'practice', 80: 'review'}.get(
                    accuracy_map.get(i, 80), 'review')
                for i in range(1, len(texts) + 1)
            ],
        })

    manifest = {
        '_version':     '1.0.0',
        '_description': 'எழுது lesson manifest',
        'lessons':      manifest_lessons,
    }
    with open(LESSONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\ndata/lessons.json updated — {len(manifest_lessons)} lessons")
    print(f"Exercise files: {EXERCISES_DIR}")
    print("\nDone! ✓")

if __name__ == '__main__':
    main()
