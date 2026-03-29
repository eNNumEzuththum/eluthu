#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_words_to_lesson.py — எழுது
Reads words.txt, determines which lesson each word/sentence is unlocked in,
then injects them into LESSON_PLAN in lessons.py as frequent_words.

Usage:
    python3 add_words_to_lesson.py

Input:  words.txt   (one word or sentence per line)
Output: lessons.py  (rewritten with updated frequent_words)
"""

import os
import re
import ast
import sys
from collections import defaultdict

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORDS_FILE  = os.path.join(SCRIPT_DIR, 'words.txt')
LESSONS_FILE = os.path.join(SCRIPT_DIR, 'lessons.py')

# ── Import lesson plan ────────────────────────────────────────────────────────
sys.path.insert(0, SCRIPT_DIR)
from lessons import LESSON_PLAN

# ── Tamil character helpers ───────────────────────────────────────────────────

# Vowel markers → base vowel
MARKER_TO_VOWEL = {
    'ா': 'ஆ', 'ி': 'இ', 'ீ': 'ஈ', 'ு': 'உ', 'ூ': 'ஊ',
    'ெ': 'எ', 'ே': 'ஏ', 'ை': 'ஐ', 'ொ': 'ஒ', 'ோ': 'ஓ', 'ௌ': 'ஔ',
}
PULLI = '்'

def is_consonant(ch):
    return '\u0B95' <= ch <= '\u0BB9'

def is_vowel(ch):
    return '\u0B85' <= ch <= '\u0B94'

def is_marker(ch):
    cp = ord(ch)
    # Tamil vowel signs: U+0BBE–U+0BCC, plus pulli U+0BCD
    return (0x0BBE <= cp <= 0x0BCC) or cp == 0x0BCD

def decompose_chars(text):
    """
    Decompose Tamil text into a list of base characters.
    Uyirmei like 'பா' → ['ப', 'ஆ']
    Pure consonant 'ப்' → ['ப', '்']
    Vowel 'ஆ' → ['ஆ']
    Space → [' ']
    Other → [char]
    """
    result = []
    chars  = list(text)
    i = 0
    while i < len(chars):
        ch = chars[i]
        if is_consonant(ch):
            result.append(ch)
            # Check next char for marker or pulli
            if i + 1 < len(chars):
                nxt = chars[i + 1]
                if nxt == PULLI:
                    result.append(PULLI)
                    i += 2
                    continue
                elif is_marker(nxt):
                    # Convert marker back to base vowel for lesson lookup
                    vowel = MARKER_TO_VOWEL.get(nxt, nxt)
                    result.append(vowel)
                    i += 2
                    continue
            i += 1
        elif is_marker(ch):
            # Standalone marker — convert to base vowel
            result.append(MARKER_TO_VOWEL.get(ch, ch))
            i += 1
        else:
            result.append(ch)
            i += 1
    return result


# ── Build letters_lesson mapping ─────────────────────────────────────────────

def build_letters_lesson(lesson_plan):
    """
    Build a mapping: character → lesson_id (int) where it is fully introduced.

    Rules:
    - Vowels and pulli: lesson where they appear in new_chars (non-combination)
    - Consonants: lesson where their FULL uyirmei series is practiced
      (i.e., the uyirmei lesson with combination_mode=True for that consonant)
      If no uyirmei lesson exists, use the non-combination lesson.
    - Space: lesson 1 (always available)
    """
    mapping = {' ': 1}

    # Pass 1: vowels and pulli from non-combination lessons
    for lesson in lesson_plan:
        lid  = int(lesson['id'])
        mode = lesson.get('combination_mode', False)
        if not mode:
            for ch in lesson['new_chars']:
                if is_vowel(ch) or ch == PULLI:
                    if ch not in mapping:
                        mapping[ch] = lid

    # Pass 2: consonants — prefer uyirmei lesson (combination_mode=True)
    # First record non-combination lesson for consonants
    for lesson in lesson_plan:
        lid  = int(lesson['id'])
        mode = lesson.get('combination_mode', False)
        if not mode:
            for ch in lesson['new_chars']:
                if is_consonant(ch):
                    if ch not in mapping:
                        mapping[ch] = lid

    # Override consonants with their uyirmei lesson if available
    for lesson in lesson_plan:
        lid  = int(lesson['id'])
        mode = lesson.get('combination_mode', False)
        if mode and len(lesson['new_chars']) == 1:
            ch = lesson['new_chars'][0]
            if is_consonant(ch):
                mapping[ch] = lid  # override with uyirmei lesson

    return mapping


# ── Build words_lesson mapping ────────────────────────────────────────────────

def build_words_lesson(words, letters_lesson):
    """
    For each word/sentence, find the max lesson_id across all its characters.
    Characters not in letters_lesson are skipped with a warning.
    Returns dict: word → lesson_id
    """
    words_lesson = {}
    max_lesson   = max(int(l['id']) for l in LESSON_PLAN)

    for word in words:
        chars   = decompose_chars(word)
        max_lid = 0
        unknown = []

        for ch in chars:
            if ch == ' ':
                continue
            if ch in letters_lesson:
                max_lid = max(max_lid, letters_lesson[ch])
            else:
                unknown.append(ch)

        if unknown:
            print(f"  ⚠ '{word}' has unknown chars: {unknown} — skipped")
            continue

        if max_lid == 0:
            max_lid = 1

        words_lesson[word] = max_lid

    return words_lesson


# ── Inject frequent_words into LESSON_PLAN ───────────────────────────────────

MAX_FREQUENT_WORDS = 50

def inject_frequent_words(lesson_plan, words_lesson):
    """
    For each lesson, assign frequent_words:
    1. Words unlocked exactly at this lesson (primary)
    2. Fill remaining slots (up to MAX_FREQUENT_WORDS) with least-used
       words from earlier lessons
    3. Track usage count for even distribution
    """
    # Group words by their unlock lesson
    by_lesson = defaultdict(list)
    for word, lid in words_lesson.items():
        by_lesson[lid].append(word)

    # Track usage count across all lessons
    usage = defaultdict(int)

    # Build list of all words sorted by unlock lesson (for fill-in)
    all_words_ordered = sorted(words_lesson.keys(), key=lambda w: words_lesson[w])

    updated_plan = []

    for lesson in lesson_plan:
        lid = int(lesson['id'])

        # Primary: words unlocked at this exact lesson
        primary = list(by_lesson.get(lid, []))

        # Fill remaining slots with least-used words from earlier lessons
        available = [w for w in all_words_ordered
                     if words_lesson[w] <= lid and w not in primary]

        # Sort available by usage count (least used first), then by unlock lesson
        available.sort(key=lambda w: (usage[w], words_lesson[w]))

        fill_count = max(0, MAX_FREQUENT_WORDS - len(primary))
        fill       = available[:fill_count]

        frequent = primary + fill

        # Truncate if over limit
        frequent = frequent[:MAX_FREQUENT_WORDS]

        # Update usage counts
        for w in frequent:
            usage[w] += 1

        # Update lesson
        lesson = dict(lesson)
        if frequent:
            lesson['frequent_words'] = frequent
        else:
            lesson.pop('frequent_words', None)

        updated_plan.append(lesson)

    return updated_plan


# ── Rewrite lessons.py ────────────────────────────────────────────────────────

def rewrite_lessons_py(updated_plan):
    """Rewrite lessons.py with the updated LESSON_PLAN."""

    def format_lesson(lesson):
        lines = ['    {']
        for key, val in lesson.items():
            if isinstance(val, str):
                lines.append(f'        "{key}":{"" if key == "id" else " " * max(1, 20 - len(key))}{repr(val)},')
            elif isinstance(val, bool):
                lines.append(f'        "{key}":{"" if key == "id" else " " * max(1, 20 - len(key))}{val},')
            elif isinstance(val, list):
                if key == 'frequent_words':
                    items = ', '.join(repr(w) for w in val)
                    lines.append(f'        "frequent_words":    [{items}],')
                else:
                    items = ', '.join(repr(c) for c in val)
                    lines.append(f'        "{key}":{"" if key == "id" else " " * max(1, 20 - len(key))}[{items}],')
        lines.append('    },')
        return '\n'.join(lines)

    plan_str = 'LESSON_PLAN = [\n'
    for lesson in updated_plan:
        plan_str += format_lesson(lesson) + '\n'
    plan_str += ']\n'

    header = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lessons.py — எழுது
Lesson plan definition. Imported by generate_lessons.py and add_words_to_lesson.py.
Auto-generated frequent_words by add_words_to_lesson.py.

Fields per lesson:
    id               : lesson identifier string e.g. "01"
    name             : display name
    new_chars        : characters introduced in this lesson
    combination_mode : False = non-combination, True = uyirmei
    reset_review     : (optional) clear accumulated consonants, keep vowels/pulli
    frequent_words   : (auto-generated) words/sentences for review & practice
"""

'''

    with open(LESSONS_FILE, 'w', encoding='utf-8') as f:
        f.write(header + plan_str)

    print(f"lessons.py rewritten ✓")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Read words.txt
    with open(WORDS_FILE, 'r', encoding='utf-8') as f:
        words = [line.strip() for line in f if line.strip()]
    print(f"Words loaded: {len(words)}")

    # Build mappings
    letters_lesson = build_letters_lesson(LESSON_PLAN)
    print(f"Letters mapped: {len(letters_lesson)}")

    words_lesson = build_words_lesson(words, letters_lesson)
    print(f"\nWords unlocked:")
    for word, lid in sorted(words_lesson.items(), key=lambda x: x[1]):
        print(f"  Lesson {lid:02d}: {word}")

    # Inject into lesson plan
    updated_plan = inject_frequent_words(LESSON_PLAN, words_lesson)

    # Count injections
    total = sum(len(l.get('frequent_words', [])) for l in updated_plan)
    lessons_with_words = sum(1 for l in updated_plan if l.get('frequent_words'))
    print(f"\nInjected {total} word slots across {lessons_with_words} lessons")

    # Rewrite lessons.py
    rewrite_lessons_py(updated_plan)
    print("\nDone! ✓")
    print("Run ./generate_lessons.py to regenerate exercise files.")


if __name__ == '__main__':
    main()
