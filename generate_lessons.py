#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_lessons.py — எழுது
Generates exercise JSON files and updates lessons.json manifest.

Edit LESSON_PLAN below to add or change lessons.

"""

import json
import os
import random

# ── Lesson plan ───────────────────────────────────────────────────────────────
# new_chars        : characters introduced in this lesson
# combination_mode : False = non-combination (default for early lessons)
#                    True  = combination allowed
# ── Lesson plan ───────────────────────────────────────────────────────────────
# Lesson plan is defined in lessons.py — edit that file to add/change lessons.
from lessons import LESSON_PLAN
# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
EXERCISES_DIR = os.path.join(SCRIPT_DIR, "data", "exercises")
LESSONS_FILE  = os.path.join(SCRIPT_DIR, "data", "lessons.json")

# ── Tamil character classification ────────────────────────────────────────────
def is_consonant(ch):
    """Tamil consonants: U+0B95–U+0BB9"""
    return '\u0B95' <= ch <= '\u0BB9'

def is_vowel(ch):
    """Tamil pure vowels: U+0B85–U+0B94"""
    return '\u0B85' <= ch <= '\u0B94'

# ── Vowel to marker mapping ──────────────────────────────────────────────────
# Used in combination mode to pre-combine consonant+vowel pairs
VOWEL_TO_MARKER = {
    'அ': '',    # implicit — consonant alone carries அ sound
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
}

# ── Uyirmei vowel sequence (finger order) ────────────────────────────────────
UYIRMEI_VOWEL_ORDER = ['அ', '்', 'உ', 'இ', 'எ', 'ஐ', 'ஊ', 'ஈ', 'ஆ', 'ஏ', 'ஒ', 'ஓ', 'ஔ']
KNOWN_CHARACTERS = ['உ', 'இ', 'அ', 'எ', 'ஐ', 'ஊ', 'ஈ', 'ஆ', 'ஏ', 'ஒ', 'ஓ', 'ஔ', ',', '.']


def make_uyirmei_chars(consonant):
    """Generate all 13 uyirmei combinations for a consonant in finger order."""
    result = []
    for vowel in UYIRMEI_VOWEL_ORDER:
        if vowel == '்':
            result.append(consonant + '்')
        elif vowel == 'அ':
            result.append(consonant)           # consonant alone = implicit அ
        else:
            marker = VOWEL_TO_MARKER.get(vowel, '')
            result.append(consonant + marker)
    return result


def build_exercise_words(frequent_words, review_pool, random_pool,
                         combination_mode, target=50):
    """
    Build exercise word list with priority:
    1. All frequent_words of current lesson (single words + sentences)
    2. If < target: add each frequent word a second time
    3. If < target: add randomly selected words from review_pool (previous lessons)
    4. If < target: add randomly generated words from random_pool
    5. If > target: truncate to target

    Returns a list of word strings (not joined).
    """
    single_words = [w for w in frequent_words if ' ' not in w]
    sentences    = [w for w in frequent_words if ' ' in w]

    words = []

    # Step 1: all frequent words once
    words += list(single_words)

    # Step 2: each frequent word a second time if still under target
    if len(words) < target:
        remaining = target - len(words)
        second_round = list(single_words)
        random.shuffle(second_round)
        words += second_round[:remaining]

    # Step 3: randomly selected words from review_pool (previous lessons)
    if len(words) < target:
        remaining = target - len(words)
        pool = [w for w in review_pool if w not in words]
        random.shuffle(pool)
        words += pool[:remaining]

    # Step 4: randomly generated words from random_pool chars
    if len(words) < target:
        remaining = target - len(words)
        for _ in range(remaining):
            length = random.randint(3, 5)
            words.append(''.join(random.choice(random_pool) for _ in range(length)))

    # Step 5: truncate if over target
    words = words[:target]

    # Append sentences at the end (not counted in target)
    words += sentences

    return words


def make_uyirmei_exercises(consonant, review_chars, combination_mode, frequent_words=None, lesson_id=19):
    """
    Generate 3 exercises for a uyirmei lesson.
    Ex 1: Introduction — each of 13 uyirmei chars repeated twice with space (100%)
    Ex 2: Review       — frequent words first, then random uyirmei words (90%)
    Ex 3: Practice     — frequent words first, then random words from all chars (80%)

    Word count: 25 + (lesson_id - 20) / 2  (grows with lesson progression)
    """
    uyirmei_chars  = make_uyirmei_chars(consonant)
    pool           = [c for c in uyirmei_chars if c != ' ']
    frequent_words = frequent_words or []
    exercises      = []

    # Ex 1: each combo twice with space between each — e.g. ப் ப் பு பு ...
    intro = []
    for ch in uyirmei_chars:
        intro += [ch, ' ', ch, ' ']
    exercises.append(''.join(intro).strip())

    # Ex 2: review — frequent words first, fill with uyirmei random words
    word_target = 25 + max(0, lesson_id - 20) // 2
    review_random = [w for w in make_practice_words(pool, target=word_target)
                     if isinstance(w, str) and w != ' ']
    ex2_words = build_exercise_words(
        frequent_words, review_pool=[], random_pool=pool,
        combination_mode=combination_mode, target=word_target)
    exercises.append(' '.join(ex2_words).strip())

    # Ex 3: practice — frequent words first, fill with all-chars random words
    practice_pool = pool + [c for c in review_chars if c not in pool and c != ' ']
    ex3_words = build_exercise_words(
        frequent_words, review_pool=[], random_pool=practice_pool,
        combination_mode=combination_mode, target=word_target)
    exercises.append(' '.join(ex3_words).strip())

    return exercises


# ── Smart join ────────────────────────────────────────────────────────────────
def smart_join(chars, combination_mode: bool):
    """
    Join chars into an exercise string.

    combination_mode=False (non-combination):
        Each character is standalone. Prevent the Tamil engine merging them.
        e.g. ['ம', 'உ'] → 'மஉ'  (two separate chars)

    combination_mode=True (combination):
        Consonant+vowel pairs are pre-combined into uyirmei characters
        by the generator — the engine receives already-combined text.
        e.g. ['ம', 'உ'] → 'மு'  (one combined char)
        Other sequences are concatenated as-is.
    """
    if not combination_mode:
        return "".join(chars).strip()

    # Combination mode: pre-combine consonant+vowel pairs
    result = []
    i = 0
    while i < len(chars):
        ch = chars[i]
        if is_consonant(ch) and i + 1 < len(chars) and is_vowel(chars[i + 1]):
            marker = VOWEL_TO_MARKER.get(chars[i + 1], '')
            result.append(ch + marker)
            i += 2
        else:
            result.append(ch)
            i += 1
    return "".join(result).strip()

# ── Practice word generator ──────────────────────────────────────────────────
def make_word(pool, length):
    """Generate a single word of exact length from pool."""
    return ''.join(random.choice(pool) for _ in range(length))


def make_practice_words(pool, target=30):
    """
    Generate words up to target count, each strictly 3-5 characters long.
    No 1-char, 2-char or 6+ char words allowed.
    Structure:
      1. Introduction  — 3-char repeated words covering all chars
      2. Progression   — 3-4 char mixed words
      3. Randomization — random 3-5 char words
      4. Conclusion    — easy 3-char patterned words
    target: number of words (caller computes based on lesson id)
    """

    words = []

    # 1. Introduction: 3-char repeated words (one per char)
    intro = [ch * 3 for ch in pool]
    random.shuffle(intro)
    words += intro

    # 2. Progression: 3-4 char mixed words
    for i in range(len(pool)):
        c1 = pool[i]
        c2 = pool[(i + 1) % len(pool)]
        words.append(c1 * 2 + c2)          # 3 chars
        words.append(c2 + c1 * 2)          # 3 chars
        words.append(c1 + c2 + c1 + c2)    # 4 chars

    # Trim to target before randomization
    words = words[:target]

    # 3. Randomization: strictly 3-5 char words
    needed = max(target - len(words), 8)
    for _ in range(needed):
        words.append(''.join(random.choice(pool) for _ in range(random.randint(3, 5))))

    # Trim to target
    words = words[:target]

    # 4. Conclusion: 3-char patterned words
    conclusion = []
    for i in range(4):
        c1 = pool[i % len(pool)]
        c2 = pool[(i + 1) % len(pool)]
        c3 = pool[(i + 2) % len(pool)]
        conclusion.append(c1 + c2 + c3)    # 3 chars
    random.shuffle(conclusion)
    words += conclusion[:4]

    # Final strict filter — only 3-5 chars, no exceptions
    words = [w for w in words if 3 <= len(w) <= 5]

    # Top up if filter removed too many
    while len(words) < target:
        words.append(''.join(random.choice(pool) for _ in range(random.randint(3, 5))))
        words = [w for w in words if 3 <= len(w) <= 5]

    # Join words with space separator
    result = []
    for i, word in enumerate(words):
        result += list(word)
        if i < len(words) - 1:
            result.append(' ')
    return result

# ── Exercise generator ────────────────────────────────────────────────────────
def make_exercises(new_chars, review_chars, combination_mode: bool, lesson_id=1):
    """
    Generate exercise texts for a lesson.
    Follows TypingClub pattern:
      Ex 1-2 : Introduction — single char repeated
      Ex 3   : Introduction — alternating without spaces
      Ex 4   : Introduction — with spaces
      Ex 5   : Review — varied patterns with spaces
    Returns list of strings.
    """
    exercises = []
    k1, k2 = new_chars[0], new_chars[1]

    # ── Introduction ──────────────────────────────────────────────────────────

    # Ex 1: Key_1 repeated 2 times
    exercises.append(smart_join([k1] * 2, combination_mode))

    # Ex 2: Key_2 repeated 2 times
    exercises.append(smart_join([k2] * 2, combination_mode))

    # Ex 3: Alternating without spaces (building up then down)
    text  = [k1] * 4 + [k2] * 4
    text += [k1] * 2 + [k2] * 2
    text += [k1] * 1 + [k2] * 1
    text += [k2] * 1 + [k1] * 1
    exercises.append(smart_join(text, combination_mode))

    # Ex 4: With spaces — gradual introduction
    text  = ([k1] * 1 + [" "]) * 2
    text += ([k2] * 1 + [" "]) * 2
    text += ([k1] * 2 + [" "]) * 2
    text += ([k2] * 2 + [" "]) * 2
    text += ([k1] * 1 + [k2] * 1 + [" "]) * 2
    text += ([k1] * 1 + [" "]) * 2
    text += ([k2] * 1 + [" "]) * 2
    exercises.append(smart_join(text, combination_mode))

    # ── Review ────────────────────────────────────────────────────────────────

    # Ex 5: Full review with varied patterns
    text  = ([k1] * 4 + [" "]) * 1
    text += ([k2] * 4 + [" "]) * 1
    text += ([k1] * 2 + [" "]) * 1
    text += ([k2] * 2 + [" "]) * 1
    text += ([k1] * 3 + [" "]) * 1
    text += ([k2] * 3 + [" "]) * 1
    text += ([k1] * 1 + [k2] * 1 + [" "]) * 1
    text += ([k2] * 1 + [k1] * 1 + [" "]) * 1
    text += ([k1] * 2 + [k2] * 1 + [" "]) * 1
    text += ([k2] * 2 + [k1] * 1 + [" "]) * 1
    text += ([k1] * 1 + [" "]) * 2
    text += ([k2] * 1 + [" "]) * 2
    text += ([k1] * 3 + [" "]) * 1
    text += ([k2] * 3 + [" "]) * 1
    text += (([k1] * 1 + [k2] * 1) * 2 + [" "]) * 1
    text += (([k1] * 3 + [k2] * 1) * 2 + [" "]) * 1
    text += (([k2] * 3 + [k1] * 1) * 2 + [" "]) * 1
    text += ([k1] * 2 + [k2] * 2 + [" "]) * 1
    text += (([k2] * 3 + [k1] * 1) * 2 + [" "]) * 1
    text += ([k1] * 2 + [" "]) * 1
    text += ([k2] * 2 + [" "]) * 1
    text += ([k2] * 4 + [" "]) * 1
    text += ([k1] * 4 + [" "]) * 1
    exercises.append(smart_join(text, combination_mode))

    # ── Practice ──────────────────────────────────────────────────────────────

    # Ex 6: ~25 words using all chars (new + review)
    all_chars = new_chars + review_chars
    practice_pool = [c for c in all_chars if c != ' ']
    if len(practice_pool) >= 2:
        word_target = 25 + lesson_id // 2
        text = make_practice_words(practice_pool, target=word_target)
        exercises.append(smart_join(text, combination_mode))

    return exercises


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    random.seed(0)  # fixed seed — exercises identical every run
    os.makedirs(EXERCISES_DIR, exist_ok=True)

    manifest_lessons = []

    all_previous_chars = []  # accumulates new_chars from all previous lessons

    for lesson in LESSON_PLAN:
        lid              = lesson["id"]
        new_chars        = lesson["new_chars"]

        # reset_review: clear accumulated consonants but keep vowels and pulli
        # so uyirmei lessons still have vowel context in review
        if lesson.get("reset_review", False):
            all_previous_chars = [c for c in all_previous_chars
                                  if c in KNOWN_CHARACTERS]

        # review_chars = all chars from previous lessons (auto-computed, no duplicates)
        review_chars     = [c for c in all_previous_chars if c not in new_chars]
        all_chars        = new_chars + review_chars
        # Default to False (non-combination) if the key is missing
        combination_mode = lesson.get("combination_mode", False)

        mode_label = "combination" if combination_mode else "non-combination"
        print(f"\nLesson {lid} — {lesson['name']}  [{mode_label}]")

        # Generate exercises based on mode
        if combination_mode and len(new_chars) == 1 and is_consonant(new_chars[0]):
            frequent_words = lesson.get("frequent_words", [])
            texts       = make_uyirmei_exercises(new_chars[0], review_chars, combination_mode, frequent_words, lesson_id=int(lid))
            accuracy_map = {1: 100, 2: 90, 3: 80}
        else:
            texts       = make_exercises(new_chars, review_chars, combination_mode, lesson_id=int(lid))
            accuracy_map = {1:100, 2:100, 3:100, 4:100, 5:90, 6:80}

        exercise_ids = []

        for i, text in enumerate(texts, 1):
            ex_id           = f"{lid}-{i:02d}"
            ex_file         = os.path.join(EXERCISES_DIR, f"{ex_id}.json")
            accuracy_target = accuracy_map.get(i, 80)

            if accuracy_target == 100:
                exercise_type = "introduction"
            elif accuracy_target == 90:
                exercise_type = "review"
            else:
                exercise_type = "practice"

            data = {
                "_version":         "1.0.0",
                "exercise_type":    exercise_type,
                "combination_mode": combination_mode,
                "accuracy_target":  accuracy_target,
                "text":             text.strip(),
            }
            with open(ex_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  {ex_id}.json: {repr(text)}")

            exercise_ids.append(ex_id)

        # For uyirmei lessons store all 13 combinations in manifest
        if combination_mode and len(new_chars) == 1 and is_consonant(new_chars[0]):
            manifest_chars = make_uyirmei_chars(new_chars[0]) + review_chars
        else:
            manifest_chars = all_chars

        manifest_lessons.append({
            "id":               lid,
            "name":             lesson["name"],
            "chars":            manifest_chars,
            "combination_mode": combination_mode,
            "exercises":        exercise_ids,
        })

        # Accumulate new_chars for next lesson's review
        for ch in new_chars:
            if ch not in all_previous_chars:
                all_previous_chars.append(ch)

    manifest = {
        "_version":     "1.0.0",
        "_description": "எழுது lesson manifest",
        "lessons":      manifest_lessons,
    }
    with open(LESSONS_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nlessons.json updated with {len(manifest_lessons)} lessons")
    print(f"Exercise files in: {EXERCISES_DIR}")
    print("\nDone! ✓")


if __name__ == "__main__":
    main()
