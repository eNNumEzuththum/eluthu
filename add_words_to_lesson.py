#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_words_to_lesson.py — எழுது
Reads lesson_plan.json and words.txt, generates lesson_words.json.

For each lesson:
  - Assigns id (sequential, 1-based, zero-padded)
  - Derives name from chars
  - Copies combo flag
  - For normal combo lessons: finds matching words from # WORDS section
    where every character belongs to lesson consonants or vowels/punctuation
    and at least one lesson consonant is present
  - For special chars:
      ["word"]      → multiple lessons from # WORDS, 50 words each
      ["sentence"]  → multiple lessons from # SHORT SENTENCES + # LONG SENTENCES,
                      ~50 total words per lesson
      ["paragraph"] → one lesson per paragraph from # PARAGRAPHS
  - Records word_count (combo lessons only)

Usage:
    python3 add_words_to_lesson.py

Input:  lesson_plan.json, words.txt
Output: lesson_words.json
"""

import json
import os

SCRIPT_DIR        = os.path.dirname(os.path.abspath(__file__))
PLAN_FILE         = os.path.join(SCRIPT_DIR, 'lesson_plan.json')
WORDS_FILE        = os.path.join(SCRIPT_DIR, 'words.txt')
OUTPUT_FILE       = os.path.join(SCRIPT_DIR, 'lesson_words.json')

WORDS_PER_EXERCISE   = 50   # words per ["word"] exercise
SENTENCE_WORD_TARGET = 50   # target total words per ["sentence"] exercise

# ── Tamil character sets ───────────────────────────────────────────────────────

VOWELS       = set('அஆஇஈஉஊஎஏஐஒஓஔ')
PULLI        = '்'
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
      3+chars → "ப, ், உ மற்றும் ம"

    combo=True:
      1 char  → "ப வரிசை"
      2 chars → "ப மற்றும் ம வரிசைகள்"
      3+chars → "ப, ம, த மற்றும் ள வரிசைகள்"
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

# ── words.txt parser ───────────────────────────────────────────────────────────

def parse_words_file(path):
    """
    Parse words.txt into sections.
    Returns dict: { 'WORDS': [...], 'SHORT SENTENCES': [...],
                    'LONG SENTENCES': [...], 'PARAGRAPHS': [...] }
    Lines starting with ## are skipped.
    Paragraphs are separated by blank lines within # PARAGRAPHS section.
    """
    sections = {
        'WORDS': [],
        'SHORT SENTENCES': [],
        'LONG SENTENCES': [],
        'PARAGRAPHS': [],
    }
    current_section = None
    current_paragraph = []

    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            stripped = line.strip()

            # Skip subcategory lines
            if stripped.startswith('##'):
                continue

            # Category header
            if stripped.startswith('#'):
                # Save any in-progress paragraph
                if current_section == 'PARAGRAPHS' and current_paragraph:
                    sections['PARAGRAPHS'].append('\n'.join(current_paragraph))
                    current_paragraph = []
                header = stripped.lstrip('#').strip()
                current_section = header if header in sections else None
                continue

            if current_section is None:
                continue

            if current_section == 'PARAGRAPHS':
                if stripped == '':
                    # Blank line = paragraph separator
                    if current_paragraph:
                        sections['PARAGRAPHS'].append('\n'.join(current_paragraph))
                        current_paragraph = []
                else:
                    current_paragraph.append(stripped)
            else:
                if stripped:
                    sections[current_section].append(stripped)

    # Save last paragraph if any
    if current_section == 'PARAGRAPHS' and current_paragraph:
        sections['PARAGRAPHS'].append('\n'.join(current_paragraph))

    return sections

# ── Word validation ────────────────────────────────────────────────────────────

def word_valid_for_lesson(word, lesson_consonants):
    """
    Returns True if:
      1. Every character in the word is a vowel, lesson consonant
         (with or without marker/pulli), ',' '.' or space
      2. At least one character uses a lesson consonant
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
            if i + 1 < len(chars) and (is_vowel_marker(chars[i+1]) or chars[i+1] == PULLI):
                i += 2
            else:
                i += 1
            continue

        return False

    return has_lesson_consonant

# ── Accumulated consonants ─────────────────────────────────────────────────────

def get_all_consonants(plan):
    """Return all consonants across all non-special lessons in lesson_plan.json."""
    consonants = []
    for lesson in plan:
        if 'message' in lesson:
            continue
        for ch in lesson.get('chars', []):
            if is_consonant(ch) and ch not in consonants:
                consonants.append(ch)
    return consonants

# ── Max words per lesson ─────────────────────────────────────────────────────

def max_words(consonants):
    # N = 25 + (number of consonants - 1) x 2, capped at 50
    return min(50, 25 + (len(consonants) - 1) * 2)

# ── Special lesson expanders ───────────────────────────────────────────────────

def expand_word_lessons(all_consonants, words_section, lesson_counter):
    """
    Expand ["word"] into multiple lessons, 50 words each.
    Returns list of lesson entries and updated lesson_counter.
    """
    entries = []
    batches = [words_section[i:i+WORDS_PER_EXERCISE]
               for i in range(0, len(words_section), WORDS_PER_EXERCISE)]

    for idx, batch in enumerate(batches, 1):
        lesson_counter += 1
        entries.append({
            'id':         f"{lesson_counter:02d}",
            'name':       f"சொற்கள் {idx}",
            'chars':      list(all_consonants),
            'combo':      True,
            'words':      batch,
            'word_count': len(batch),
        })
        print(f"  Lesson {lesson_counter:02d} (சொற்கள் {idx}): {len(batch)} words")

    return entries, lesson_counter

def expand_sentence_lessons(all_consonants, short_sentences, long_sentences, lesson_counter):
    """
    Expand ["sentence"] into multiple lessons combining short + long sentences.
    Each lesson targets ~SENTENCE_WORD_TARGET total words.
    Returns list of lesson entries and updated lesson_counter.
    """
    all_sentences = short_sentences + long_sentences
    entries = []
    batch = []
    word_count = 0
    lesson_num = 1

    def flush(batch, lesson_num, lesson_counter):
        lesson_counter += 1
        entry = {
            'id':         f"{lesson_counter:02d}",
            'name':       f"வாக்கியங்கள் {lesson_num}",
            'chars':      list(all_consonants),
            'combo':      True,
            'words':      list(batch),
            'word_count': len(batch),
        }
        print(f"  Lesson {lesson_counter:02d} (வாக்கியங்கள் {lesson_num}): {len(batch)} sentences")
        return entry, lesson_counter

    for sentence in all_sentences:
        w = len(sentence.split())
        if batch and word_count + w > SENTENCE_WORD_TARGET:
            entry, lesson_counter = flush(batch, lesson_num, lesson_counter)
            entries.append(entry)
            batch = []
            word_count = 0
            lesson_num += 1
        batch.append(sentence)
        word_count += w

    if batch:
        entry, lesson_counter = flush(batch, lesson_num, lesson_counter)
        entries.append(entry)

    return entries, lesson_counter

def expand_paragraph_lessons(all_consonants, paragraphs, lesson_counter):
    """
    Expand ["paragraph"] into one lesson per paragraph. No word limit.
    Returns list of lesson entries and updated lesson_counter.
    """
    entries = []
    for idx, para in enumerate(paragraphs, 1):
        lesson_counter += 1
        entries.append({
            'id':         f"{lesson_counter:02d}",
            'name':       f"பந்தி {idx}",
            'chars':      list(all_consonants),
            'combo':      True,
            'words':      [para],
            'word_count': 1,
        })
        print(f"  Lesson {lesson_counter:02d} (பந்தி {idx}): paragraph {idx}")

    return entries, lesson_counter

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    with open(PLAN_FILE, 'r', encoding='utf-8') as f:
        plan = json.load(f)

    sections = parse_words_file(WORDS_FILE)
    print(f"Words loaded: {len(sections['WORDS'])} words, "
          f"{len(sections['SHORT SENTENCES'])} short sentences, "
          f"{len(sections['LONG SENTENCES'])} long sentences, "
          f"{len(sections['PARAGRAPHS'])} paragraphs")

    all_consonants = get_all_consonants(plan)
    print(f"Total consonants in lesson_plan.json: {len(all_consonants)}")

    output       = []
    lesson_counter = 0

    for plan_entry in plan:
        # Skip message entries
        if 'message' in plan_entry:
            lesson_counter += 1
            continue

        chars = plan_entry.get('chars', [])
        combo = plan_entry.get('combo', False)

        # ── Special chars ────────────────────────────────────────────────────
        if chars == ['word']:
            print(f"\nExpanding [word] lessons:")
            entries, lesson_counter = expand_word_lessons(
                all_consonants, sections['WORDS'], lesson_counter)
            output.extend(entries)
            continue

        if chars == ['sentence']:
            print(f"\nExpanding [sentence] lessons:")
            entries, lesson_counter = expand_sentence_lessons(
                all_consonants, sections['SHORT SENTENCES'],
                sections['LONG SENTENCES'], lesson_counter)
            output.extend(entries)
            continue

        if chars == ['paragraph']:
            print(f"\nExpanding [paragraph] lessons:")
            entries, lesson_counter = expand_paragraph_lessons(
                all_consonants, sections['PARAGRAPHS'], lesson_counter)
            output.extend(entries)
            continue

        # ── Normal lesson ────────────────────────────────────────────────────
        lesson_counter += 1
        lesson_id = f"{lesson_counter:02d}"
        name      = make_name(chars, combo)

        entry = {
            'id':    lesson_id,
            'name':  name,
            'chars': chars,
        }
        if combo:
            entry['combo'] = True

        if combo:
            consonants = frozenset(ch for ch in chars if is_consonant(ch))
            seen = set()
            matched = []
            for w in sections['WORDS']:
                if word_valid_for_lesson(w, consonants) and w not in seen:
                    seen.add(w)
                    matched.append(w)
            consonants_list = [ch for ch in chars if is_consonant(ch)]
            matched = matched[:max_words(consonants_list)]
            entry['words']      = matched
            entry['word_count'] = len(matched)
            print(f"  Lesson {lesson_id} ({name}): {len(matched)} words")

        output.append(entry)

    # Include all lessons — combo with 0 words included so IDs match plan positions
    filtered = output

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(filtered, f, ensure_ascii=False, indent=2)

    total_words = sum(e.get('word_count', 0) for e in filtered)
    print(f"\nlesson_words.json written — {len(filtered)} lessons, {total_words} total words")

if __name__ == '__main__':
    main()
