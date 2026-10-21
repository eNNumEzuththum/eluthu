#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
add_words_to_lesson.py — எழுது
Reads lesson_plan.json and words.txt, generates lesson_words.json.

For each lesson:
  - Keeps each lesson's permanent id by reading the previous lesson_words.json
    (matched by content, never list position). lesson_plan.json stays
    hand-written and is never modified; new lessons take next_lesson_id.
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
Output: lesson_words.json  (also carries the ids — keep it, do not delete)
"""

import json
import os


SCRIPT_DIR        = os.path.dirname(os.path.abspath(__file__))
PLAN_FILE         = os.path.join(SCRIPT_DIR, 'lesson_plan.json')
WORDS_FILE        = os.path.join(SCRIPT_DIR, 'words.txt')
OUTPUT_FILE       = os.path.join(SCRIPT_DIR, 'lesson_words.json')
LESSONS_FILE      = os.path.join(SCRIPT_DIR, 'data', 'lessons.json')

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

# ── Lesson ids ────────────────────────────────────────────────────────────────
# Every lesson has ONE permanent id (a 2+ digit zero-padded string, e.g. "13").
# lesson_plan.json is hand-written and carries NO ids. The ids live in
# lesson_words.json itself: this script reads the previous lesson_words.json
# first, keeps the id of every lesson it finds there, and writes the file back
# (generate_lessons.py only READS it). So lesson_words.json is no longer
# disposable: keep it in git and never delete it.
#   * a lesson is matched to its old entry by CONTENT (letters + combo flag),
#     not by position, so inserting / deleting / re-ordering never changes
#     another lesson's id
#   * a new lesson takes "next_lesson_id" and the counter is incremented; it
#     only ever goes UP, so ids of deleted lessons are never reused
#   * ids of deleted lessons are kept under "retired"; if identical content is
#     put back it gets its old id back
#   * editing a lesson's letters makes it a NEW lesson with a new id
#   * word / sentence / paragraph entries hold a list of ids, one per generated lesson
#   * MESSAGES are not tracked (no performance data is saved for them). The file
#     keeps a plain list "message_ids"; messages in the plan take those ids in
#     plan order and extra messages take new numbers from the counter. Insert,
#     delete, edit or move messages freely.

SPECIAL_CHARS = (['word'], ['sentence'], ['paragraph'])
SPECIAL_NAMES = {'சொற்கள்': 'word', 'வாக்கியங்கள்': 'sentence', 'பந்தி': 'paragraph'}

def is_special(entry):
    return entry.get('chars') in SPECIAL_CHARS

def format_lesson_id(n):
    return f"{n:02d}"

def plan_key(entry):
    """Identity of a plan entry = its content."""
    if 'message' in entry:
        return 'message'
    chars = entry.get('chars', [])
    if chars in SPECIAL_CHARS:
        return 'special:' + chars[0]
    return 'chars:' + json.dumps([chars, bool(entry.get('combo'))], ensure_ascii=False)

def words_key(lesson):
    """Same identity for an entry of lesson_words.json."""
    for prefix, kind in SPECIAL_NAMES.items():
        if lesson.get('name', '').startswith(prefix):
            return 'special:' + kind
    return 'chars:' + json.dumps([lesson.get('chars', []), bool(lesson.get('combo'))],
                                 ensure_ascii=False)

class LessonIds:
    """Reads the previous lesson_words.json and gives every plan entry its
    permanent id(s), allocating new ones where needed."""

    def __init__(self, plan, words_file=None, lessons_file=None, allocate=True):
        path = words_file or OUTPUT_FILE
        fname = os.path.basename(path)
        lessons_file = lessons_file or LESSONS_FILE
        self.allocate = allocate

        old = {}
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                old = json.load(f)
            if not isinstance(old, dict):
                raise SystemExit(f"{fname} is in the old format (a plain list, no ids kept). "
                                 f"Use the new {fname} that carries next_lesson_id.")
        elif not allocate:
            raise SystemExit(f"{fname} not found — run add_words_to_lesson.py first.")
        elif os.path.exists(lessons_file):
            raise SystemExit(f"{fname} is missing but data/lessons.json already exists. Restore "
                             f"{fname} (it is in git) — running without it would hand out new ids "
                             f"to existing lessons and lose the link to their performance data.")

        # old ids by content key (repeated identical lessons: "#2", "#3"; specials grouped)
        self.pool, seen = {}, {}
        for l in old.get('lessons', []):
            k = words_key(l)
            if not k.startswith('special:'):
                seen[k] = seen.get(k, 0) + 1
                if seen[k] > 1:
                    k = f"{k}#{seen[k]}"
            self.pool.setdefault(k, []).append(l['id'])
        self.retired = {r['key']: list(r['ids']) for r in old.get('retired', [])}
        self.message_pool = list(old.get('message_ids', []))

        used = ([int(i) for ids in self.pool.values() for i in ids] +
                [int(i) for ids in self.retired.values() for i in ids] +
                [int(i) for i in self.message_pool])
        if len(used) != len(set(used)):
            raise SystemExit(f"{fname} has duplicate lesson ids")
        self.next_id = max(int(old.get('next_lesson_id', 1)), (max(used) + 1) if used else 1)

        # key per plan entry: repeated identical lessons get "#2", "#3", ...;
        # messages are numbered by their order in the plan ("message#1", ...)
        self.keys, seen, n_msg = [], {}, 0
        for entry in plan:
            k = plan_key(entry)
            if k == 'message':
                n_msg += 1
                self.keys.append(f"message#{n_msg}")
                continue
            seen[k] = seen.get(k, 0) + 1
            self.keys.append(k if seen[k] == 1 else f"{k}#{seen[k]}")

        self.message_ids = {}
        for i in range(1, n_msg + 1):
            if i > len(self.message_pool):
                self.message_pool.append(self._new_id(f"a message ({i})"))
            self.message_ids[f"message#{i}"] = self.message_pool[i - 1]

        self.single, self.special = {}, {}
        for entry, key in zip(plan, self.keys):
            if key.startswith('message#'):
                continue
            if is_special(entry):
                self.special[key] = self.pool.pop(key, []) + self.retired.pop(key, [])
            else:
                got = self.pool.pop(key, None) or self.retired.pop(key, None)
                self.single[key] = got[0] if got else self._new_id(key)
                if got and len(got) > 1:
                    self.retired[key] = got[1:]
        self._used_special = {k: 0 for k in self.special}
        self.fname = fname

    def _new_id(self, what):
        if not self.allocate:
            raise SystemExit(f"{what} has no id in lesson_words.json — run add_words_to_lesson.py first.")
        lid = format_lesson_id(self.next_id)
        self.next_id += 1
        return lid

    def id_of(self, key):
        """The single permanent id of a message / chars entry."""
        return self.message_ids[key] if key.startswith('message#') else self.single[key]

    def special_ids(self, key):
        """Ids issued so far to a word/sentence/paragraph entry, in order."""
        return self.special[key]

    def special_id_source(self, key):
        """next_id(): yields the entry's own ids in order, allocating more
        only when the expansion needs them."""
        ids = self.special[key]
        def next_id():
            i = self._used_special[key]
            if i >= len(ids):
                ids.append(self._new_id(key))
            self._used_special[key] = i + 1
            return ids[i]
        return next_id

    def state(self):
        """Everything lesson_words.json must carry besides the lessons."""
        retired = {k: list(v) for k, v in self.retired.items()}
        for k, ids in self.pool.items():                       # deleted lessons
            retired.setdefault(k, []).extend(ids)
        for k, ids in self.special.items():                    # unused special ids
            if ids[self._used_special[k]:]:
                retired.setdefault(k, []).extend(ids[self._used_special[k]:])
        return {
            'next_lesson_id': self.next_id,
            'message_ids':    self.message_pool,
            'retired':        [{'key': k, 'ids': sorted(set(v), key=int)}
                               for k, v in sorted(retired.items()) if v],
        }

# ── Special lesson expanders ───────────────────────────────────────────────────

def expand_word_lessons(all_consonants, words_section, next_id):
    """
    Expand ["word"] into multiple lessons, 50 words each.
    next_id() returns the permanent id for each generated lesson, in order.
    Returns list of lesson entries.
    """
    entries = []
    batches = [words_section[i:i+WORDS_PER_EXERCISE]
               for i in range(0, len(words_section), WORDS_PER_EXERCISE)]

    for idx, batch in enumerate(batches, 1):
        lid = next_id()
        entries.append({
            'id':         lid,
            'name':       f"சொற்கள் {idx}",
            'chars':      list(all_consonants),
            'combo':      True,
            'words':      batch,
            'word_count': len(batch),
        })
        print(f"  Lesson {lid} (சொற்கள் {idx}): {len(batch)} words")

    return entries

def expand_sentence_lessons(all_consonants, short_sentences, long_sentences, next_id):
    """
    Expand ["sentence"] into multiple lessons combining short + long sentences.
    Each lesson targets ~SENTENCE_WORD_TARGET total words.
    next_id() returns the permanent id for each generated lesson, in order.
    Returns list of lesson entries.
    """
    all_sentences = short_sentences + long_sentences
    entries = []
    batch = []
    word_count = 0
    lesson_num = 1

    def flush(batch, lesson_num):
        lid = next_id()
        entry = {
            'id':         lid,
            'name':       f"வாக்கியங்கள் {lesson_num}",
            'chars':      list(all_consonants),
            'combo':      True,
            'words':      list(batch),
            'word_count': len(batch),
        }
        print(f"  Lesson {lid} (வாக்கியங்கள் {lesson_num}): {len(batch)} sentences")
        return entry

    for sentence in all_sentences:
        w = len(sentence.split())
        if batch and word_count + w > SENTENCE_WORD_TARGET:
            entries.append(flush(batch, lesson_num))
            batch = []
            word_count = 0
            lesson_num += 1
        batch.append(sentence)
        word_count += w

    if batch:
        entries.append(flush(batch, lesson_num))

    return entries

def expand_paragraph_lessons(all_consonants, paragraphs, next_id):
    """
    Expand ["paragraph"] into one lesson per paragraph. No word limit.
    next_id() returns the permanent id for each generated lesson, in order.
    Returns list of lesson entries.
    """
    entries = []
    for idx, para in enumerate(paragraphs, 1):
        lid = next_id()
        entries.append({
            'id':         lid,
            'name':       f"பந்தி {idx}",
            'chars':      list(all_consonants),
            'combo':      True,
            'words':      [para],
            'word_count': 1,
        })
        print(f"  Lesson {lid} (பந்தி {idx}): paragraph {idx}")

    return entries

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

    # Permanent ids are read from the previous lesson_words.json (see "Lesson ids").
    ids = LessonIds(plan)

    output       = []

    for plan_entry, key in zip(plan, ids.keys):
        # Skip message entries (they have an id but no words entry)
        if 'message' in plan_entry:
            continue

        chars = plan_entry.get('chars', [])
        combo = plan_entry.get('combo', False)

        # ── Special chars ────────────────────────────────────────────────────
        if chars == ['word']:
            print(f"\nExpanding [word] lessons:")
            entries = expand_word_lessons(
                all_consonants, sections['WORDS'], ids.special_id_source(key))
            output.extend(entries)
            continue

        if chars == ['sentence']:
            print(f"\nExpanding [sentence] lessons:")
            entries = expand_sentence_lessons(
                all_consonants, sections['SHORT SENTENCES'],
                sections['LONG SENTENCES'], ids.special_id_source(key))
            output.extend(entries)
            continue

        if chars == ['paragraph']:
            print(f"\nExpanding [paragraph] lessons:")
            entries = expand_paragraph_lessons(
                all_consonants, sections['PARAGRAPHS'], ids.special_id_source(key))
            output.extend(entries)
            continue

        # ── Normal lesson ────────────────────────────────────────────────────
        lesson_id = ids.id_of(key)
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

    # Include all lessons — combo with 0 words included; matched to the plan by id
    filtered = output

    result = {
        '_description': 'Generated by add_words_to_lesson.py. Also holds the permanent lesson ids '
                        '(next_lesson_id, message_ids, retired) — keep in git, do not delete.',
        **ids.state(),
        'lessons': filtered,
    }
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    total_words = sum(e.get('word_count', 0) for e in filtered)
    print(f"\nlesson_words.json written — {len(filtered)} lessons, {total_words} total words")

if __name__ == '__main__':
    main()
