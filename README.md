# eluthu: Learn Tamil Touch Typing

Thank you for reading this project!

With the help of AI, I have developed **[eluthu](https://github.com/eNNumEzuththum/eluthu)**, a free and open-source Tamil touch typing tool. I created this project with the hope that it will help anyone looking to type in Tamil quickly, easily, and efficiently on a computer.

---

## My Story

Before learning to touch type, I used to hunt-and-press with just two fingers on each hand while constantly staring down at the keyboard. This caused a few major issues:

- **High Error Rate:** Because I was looking at the monitor and the keyboard back and forth, I made a massive number of mistakes.
- **Mental Fatigue:** I had to consciously think about where the keys were instead of focusing on what I was actually trying to write.
- **Slow Speed:** I was stuck typing at around 20 words per minute (WPM).

Ten years ago, a friend introduced me to [TypingClub](https://www.typingclub.com/), a free touch typing tool for English. After practicing for a few weeks, my typing transformed:

- **Fewer Mistakes:** I never look down at the keyboard.
- **Muscle Memory:** I no longer think about the keys; my fingers automatically move to the correct positions.
- **Increased Speed:** My typing speed is around 50 WPM.

My experience with TypingClub inspired me to build a similar tool for Tamil. I wanted to learn Tamil touch typing myself but couldn't find a dedicated tool for it. So, I decided to build **eluthu** — to learn the skill while providing a free, open-source resource for the community.

---

## Why Touch Typing?

You might wonder why we still need to type on a PC in the era of AI and voice-to-text tools.

While voice-to-text tools work well for basic dictation, they fall short for serious writing. To convey your message clearly, you often need to edit an article multiple times, or translate English text into Tamil and refine it. These tasks require manual editing. If you write a fair amount of articles or documentation, old-school typing remains absolutely essential.

Efficient typing depends on minimising keystrokes, reducing finger displacement, and avoiding complex key combinations (like heavy reliance on the `Shift` key).

> **Did you know?** The little bumps on the **F** and **J** keys are there to help you find the "home row" position without looking. Traditional keyboard layouts are intentionally designed so that high-frequency letters require minimal finger movement.

---

## Why Tamil 99?

There are several Tamil keyboard layouts available. You might already be familiar with the phonetic or Romanised layout (where writing **வணக்கம்** requires typing `vaNakkam`).

However, **Tamil 99** is the layout preferred by professional Tamil writers. It uses two key design principles to reduce keystrokes, finger movement, and key combinations:

1. **Frequency-Based Layout:** Keys are organised around the most frequently used letters in the Tamil language.
2. **Grammar-Optimised Flow:** It exploits Tamil grammar patterns. For example, in many Tamil words a pure consonant (மெய்) is immediately followed by its corresponding vowel-consonant (உயிர்மெய்), such as **க்** and **க** in **வணக்கம்**. Tamil 99 is designed to make these natural sequences efficient to type.

### Phonetic vs. Tamil 99

Typing the simple word **வணக்கம்**:

| Layout | Keystrokes | Unique keys | Shift key? |
|---|---|---|---|
| Tamil 99 | 6 | 5 | No |
| Phonetic | 7 | 6 | Yes |

While this looks like a small difference for a single word, Tamil 99 becomes vastly more efficient when writing long-form essays, articles, or complex literature.

---

## Features

- **Progressive lessons** — builds muscle memory for the Tamil 99 layout step by step across 36 lessons
- **Finger-position learning** — introduces keys in pairs based on finger positioning, not alphabetical order; the first two keys you learn are **ப** (J key) and **்** pulli (F key)
- **Visual key guidance** — the keyboard highlights which key to press next, with finger position overlay
- **Grammar integration** — once you practise basic vowels and core combinations, consonants are introduced using the natural, high-efficiency grammar flows of Tamil 99
- **Accuracy targets** — 100% / 90% / 80% targets per exercise; cursor blocks on wrong key in introduction exercises
- **Progress saved** — your lesson progress is saved automatically in the browser
- **Free typing sandbox** — a dedicated practice space (`tamil99-tester.html`) where you can paste any Tamil reference text and practise typing it freely

---

## How to Run

### Step 1 — Download eluthu

1. Go to **[github.com/eNNumEzuththum/eluthu](https://github.com/eNNumEzuththum/eluthu)** in your browser
2. Click the green **Code** button near the top right
3. Click **Download ZIP**
4. Save the ZIP file to your computer

Then extract it:

- **Windows:** Right-click the ZIP file → **Extract All…** → choose a destination (e.g. `C:\Users\yourname\learning\`) → click **Extract**
- **macOS:** Double-click the ZIP file — it extracts automatically to the same folder
- **Linux:** Right-click the ZIP file → **Extract Here**, or run:
  ```bash
  unzip eluthu-main.zip -d ~/learning/
  ```

You should now have an `eluthu-main` folder (rename it to `eluthu` if you prefer).

---

### Step 2 — Install Python 3 (if needed)

- **Windows:** Download from [python.org](https://www.python.org/) — tick **"Add Python to PATH"** during installation
- **macOS:** Python 3 comes pre-installed on modern Macs — no action needed
- **Linux (Debian/Ubuntu):**
  ```bash
  sudo apt install python3
  ```

---

### Step 3 — Run the app

**Windows** — open Command Prompt and run:
```cmd
cd C:\Users\yourname\learning\eluthu-main
python -m http.server 8080
```

**macOS / Linux** — open Terminal and run:
```bash
cd ~/learning/eluthu-main
python3 -m http.server 8080
```

Then open your browser and go to: **http://localhost:8080**

To stop the server press `Ctrl+C` in the terminal.

---

## Roadmap

This is currently an alpha version. With enough community feedback and motivation, I plan to implement:

- Detailed progress history and statistics over time (speed and accuracy graphs)
- Support for all Tamil special characters (ஸ, ஷ, ஜ, etc.)
- Numerical typing exercises
- Real-world practice material — Tamil poems, stories, and historical facts
- Guided audio and animations for introductory lessons
- A fully hosted online version (similar to TypingClub) so users don't have to run it locally

---

## How You Can Help

- **Test the tool** — use the application and share feedback, suggestions, or bug reports
- **Spread the word** — share this project with anyone who would benefit from learning Tamil typing
- **Contribute content** — help expand the word database by adding more Tamil words and exercises to `words.txt`
- **Contribute code** — pull requests are very welcome; feel free to pick up a feature from the roadmap

**Contact:** enn.eluththu@gmail.com

---

## Code Structure

```text
.
├── index.html                # Main entry point for the web application
├── tamil99-tester.html       # Free typing sandbox — paste any Tamil text and practise
├── css/
│   └── style.css             # Main stylesheet
├── js/
│   ├── tamil99.js            # Tamil 99 keyboard engine (combination rules, key map)
│   ├── combination.js        # Combination mode typing engine (keystroke stream model)
│   ├── typing.js             # Non-combination typing engine (character-by-character)
│   ├── lessons.js            # Lesson loading and progression logic
│   ├── app.js                # Main application controller
│   └── version.js            # Version display
├── assets/
│   ├── keyboard.svg          # Keyboard diagram with Tamil labels and finger guides
│   └── keyboard_all_keys.svg # Keyboard diagram showing both Tamil and English labels
├── data/
│   ├── lessons.json          # Lesson manifest — lesson order, names, exercise list
│   ├── tamil99-keymap.json   # QWERTY to Tamil 99 key mapping
│   └── exercises/
│       └── XX-XX.json        # Individual exercise files (lesson-exercise numbered)
├── lessons.py                # Lesson plan definition (imported by generator scripts)
├── generate_lessons.py       # Regenerates all exercise JSON files from lessons.py
├── add_words_to_lesson.py    # Injects frequent words from words.txt into lessons.py
├── words.txt                 # Tamil frequent word database
├── update-tests.sh           # Updates version table in TESTS.md from source files
├── TESTS.md                  # Test suite documentation
├── LICENSE                   # MIT licence
└── README.md                 # This file
```

---

## Resources & References

- [Wikipedia: Tamil 99 Layout](https://en.wikipedia.org/wiki/Tamil_99)
- [Tamil Nadu Government Keyboard Documentation](https://www.tamilvu.org/tkbd/doc_file/Help_Linux.pdf)
- [Interactive Tamil 99 Layout Map](https://kbdlayout.info/kbdtam99)
- [Tamil 99 Keyboard Help Chart (PDF)](https://help.keyman.com/keyboard/ekwtamil99uni/2.0.5/chart.pdf)
- [W3Tamil Online Tamil 99 Typing](https://wk.w3tamil.com/)
- [TypingClub (English Touch Typing)](https://www.typingclub.com/)

---

## Licence

MIT — see [LICENSE](LICENSE)

Free to use, share, and modify. Contributions welcome.

---

Thank you for your time.
