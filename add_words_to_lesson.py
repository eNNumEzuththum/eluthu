#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_words_to_lesson.py — எழுது
Reads lesson_plan.json and words.txt, generates lesson_words.json.

For each lesson:
  - Assigns id (sequential, 1-based, zero-padded)
  - Derives name from chars
  - Copies combo flag
  - For combo lessons: finds matching words from words.txt where every
    character in the word is either:
      * any vowel (உயிர்)
      * any உயிர்மெய் using a consonant from the lesson's chars list
      * ',' or '.'
  - Records word_count (number of words added from words.txt)

Usage:
    python3 add_words_to_lesson.py

Input:  lesson_plan.json, words.txt
Output: lesson_words.json
"""

import json
import os

SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
PLAN_FILE     = os.path.join(SCRIPT_DIR, 'lesson_plan.json')
WORDS_FILE    = os.path.join(SCRIPT_DIR, 'words.txt')
OUTPUT_FILE   = os.path.join(SCRIPT_DIR, 'lesson_words.json')

# ── Tamil character sets ───────────────────────────────────────────────────────

VOWELS = set('அஆஇஈஉஊஎஏஐஒஓஔ')
PULLI  = '்'

# Vowel markers (உயிர் குறி) → attached to consonants to form உயிர்மெய்
VOWEL_MARKERS = set('ாிீுூெேைொோௌ')

def is_vowel(ch):
    return ch in VOWELS

def is_consonant(ch):
    return '\u0B95' <= ch <= '\u0BB9'

def is_vowel_marker(ch):
    return ch in VOWEL_MARKERS

# ── Name derivation ────────────────────────────────────────────────────────────

def make_name(chars, combo):
    """
    Derive lesson name from chars list.

    combo=False:
      1 char  → "ப"
      2 chars → "ப மற்றும் ்"
      3+chars → "ப, ், உ"

    combo=True:
      1 char  → "ப வரிசை"
      2 chars → "ப மற்றும் ம வரிசைகள்"
      3+chars → "ப, ம, த வரிசைகள்"
    """
    n = len(chars)
    if n == 0:
        return ""
    if n == 1:
        return chars[0] if not combo else f"{chars[0]} வரிசை"
    if n == 2:
        joined = f"{chars[0]} மற்றும் {chars[1]}"
        return joined if not combo else f"{joined} வரிசைகள்"
    # 3+: comma-separated except last two use மற்றும்
    joined = ", ".join(chars[:-1]) + f" மற்றும் {chars[-1]}"
    return joined if not combo else f"{joined} வரிசைகள்"

# ── Accumulated chars ──────────────────────────────────────────────────────────

def build_accumulated_chars(plan):
    """
    Build accumulated consonant set for each lesson.
    A consonant is available once it appears in any lesson's chars up to
    and including the current lesson (combo or non-combo).
    """
    accumulated = []
    seen = set()
    for lesson in plan:
        for ch in lesson.get('chars', []):
            if is_consonant(ch):
                seen.add(ch)
        accumulated.append(frozenset(seen))
    return accumulated

# ── Word validation ────────────────────────────────────────────────────────────

def word_valid_for_lesson(word, lesson_consonants):
    """
    Returns True if:
      1. Every character in the word is:
           - a vowel (உயிர்)
           - a consonant from lesson_consonants (with or without vowel marker / pulli)
           - ',' or '.'
           - space (word separator)
      2. At least one character is a உயிர்மெய் using a consonant from lesson_consonants
         (ensures the word actually practices the lesson's characters)
    """
    chars = list(word)
    i = 0
    has_lesson_consonant = False

    while i < len(chars):
        ch = chars[i]

        if ch in (' ', ',', '.'):
            i += 1
            continue

        if is_vowel(ch):
            i += 1
            continue

        if is_consonant(ch):
            if ch not in lesson_consonants:
                return False
            has_lesson_consonant = True
            # Consume optional following marker or pulli
            if i + 1 < len(chars) and (is_vowel_marker(chars[i+1]) or chars[i+1] == PULLI):
                i += 2
            else:
                i += 1
            continue

        # Any other character (unknown) — reject
        return False

    return has_lesson_consonant

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Load inputs
    with open(PLAN_FILE, 'r', encoding='utf-8') as f:
        plan = json.load(f)

    with open(WORDS_FILE, 'r', encoding='utf-8') as f:
        words = [line.strip() for line in f if line.strip()]

    print(f"Lessons: {len(plan)}, Words: {len(words)}")

    # Build accumulated consonant sets per lesson
    accumulated = build_accumulated_chars(plan)

    output = []
    for i, lesson in enumerate(plan):
        lesson_id   = f"{i + 1:02d}"

        # Skip message entries — no chars to process
        if 'message' in lesson:
            continue

        chars       = lesson.get('chars', [])
        combo       = lesson.get('combo', False)
        name        = make_name(chars, combo)
        consonants  = accumulated[i]  # all consonants available at this lesson

        entry = {
            'id':    lesson_id,
            'name':  name,
            'chars': chars,
        }
        if combo:
            entry['combo'] = True

        # Add matching words for combo lessons
        # Only allow consonants explicitly listed in this lesson's chars
        if combo:
            lesson_consonant_set = frozenset(ch for ch in chars if is_consonant(ch))
            seen = set()
            matched = []
            for w in words:
                if word_valid_for_lesson(w, lesson_consonant_set) and w not in seen:
                    seen.add(w)
                    matched.append(w)
            entry['words']      = matched
            entry['word_count'] = len(matched)
            print(f"  Lesson {lesson_id} ({name}): {len(matched)} words")

        output.append(entry)

    # IDs in lesson_words.json are sequential excluding message entries

    # Include all lessons
    filtered = output

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(filtered, f, ensure_ascii=False, indent=2)

    total_words = sum(e.get('word_count', 0) for e in filtered)
    print(f"\nlesson_words.json written — {len(filtered)} lessons, {total_words} total words")

if __name__ == '__main__':
    main()
