// ── Paste into the browser devtools console while eluthu is open ──────────────
// Simulates 12 weeks (84 days) of a user's practice activity, ending today,
// and writes the resulting eluthu_activity / eluthu_badges / eluthu_lesson_stars
// directly to localStorage.
//
// This is a FULLY INDEPENDENT simulation — it does not call, read, or depend
// on any app.js function or variable. It only touches localStorage, in
// exactly the shape the real app reads/writes. A real user's keystrokes
// never call evaluateBadges() directly either; the app's own pipeline does
// (keystroke -> _onComplete -> recordActivity -> evaluateBadges), so a test
// script pretending to be a user shouldn't reach into that pipeline's
// internals — it should only produce the DATA a user's real play session
// would have produced.
//
// Because of that independence, this script carries its OWN copy of the
// badge rules below (BADGE_RULES) rather than reading the live BADGES array
// off the page. If app.js's badge config changes (new ids, new thresholds,
// new types), update BADGE_RULES here to match, or this script's output
// will silently drift from what the real app would award.
//
// milestone-type badges are NOT simulated — by design, real gameplay can
// only unlock those via a `mile_stone`-tagged exercise, not from activity
// data alone. Use unlockMilestone('row_home') etc. in the console to test
// those independently.
//
// Overwrites eluthu_activity / eluthu_badges entirely. Adds synthetic
// entries to eluthu_lesson_stars (keyed 9000+, won't collide with real
// lesson indices) so star_rating badges have data to evaluate against. To
// reset afterward:
//   localStorage.removeItem('eluthu_activity');
//   localStorage.removeItem('eluthu_badges');
//   localStorage.removeItem('eluthu_lesson_stars');
// then reload.

(function seed12WeeksIndependent() {
  // Keep this in sync with app.js's BADGES array.
  const BADGE_RULES = [
    { id: 'daily_15min', type: 'daily_minutes', threshold: 15 },
    { id: 'daily_30min', type: 'daily_minutes', threshold: 30 },
    { id: 'daily_60min', type: 'daily_minutes', threshold: 60 },
    { id: 'total_5hr',   type: 'cumulative_minutes', threshold: 300 },
    { id: 'total_24hr',  type: 'cumulative_minutes', threshold: 1440 },
    { id: 'streak_5',    type: 'streak_days', threshold: 5 },
    { id: 'streak_14',   type: 'streak_days', threshold: 14 },
    { id: 'streak_30',   type: 'streak_days', threshold: 30 },
    { id: 'wpm_10', type: 'daily_wpm_avg', threshold: 10 },
    { id: 'wpm_20', type: 'daily_wpm_avg', threshold: 20 },
    { id: 'wpm_30', type: 'daily_wpm_avg', threshold: 30 },
    { id: 'wpm_40', type: 'daily_wpm_avg', threshold: 40 },
    { id: 'wpm_50', type: 'daily_wpm_avg', threshold: 50 },
    { id: 'wpm_60', type: 'daily_wpm_avg', threshold: 60 },
    { id: 'stars_50',   type: 'star_rating', threshold: 50 },
    { id: 'stars_100',  type: 'star_rating', threshold: 100 },
    { id: 'stars_250',  type: 'star_rating', threshold: 250 },
    { id: 'stars_500',  type: 'star_rating', threshold: 500 },
    { id: 'stars_1000', type: 'star_rating', threshold: 1000 },
    { id: 'perfect_exercise',   type: 'exercise_accuracy',   threshold: 100 },
    { id: 'weekly_accuracy_95', type: 'weekly_accuracy_avg', threshold: 95 },
    { id: 'comeback', type: 'comeback', threshold: 7 },
  ];

  const MINUTE_CHOICES   = [0, 0, 0, 2, 4, 6, 8, 10, 15, 20, 25];
  const ACCURACY_CHOICES = [80, 85, 90, 95, 100, 100]; // extra 100 lets perfect_exercise fire sometimes
  const WPM_CHOICES      = [5, 10, 15, 20, 25, 30, 35];

  function todayKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'),
          day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
  function mondayOf(date) {
    const d = new Date(date);
    const dow = (d.getDay() + 6) % 7; // 0 = Monday
    d.setDate(d.getDate() - dow);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pickFrom(arr) { return arr[randInt(0, arr.length - 1)]; }

  function computeStreak(activity, dateKeyStr) {
    const dates = Object.keys(activity)
      .filter(d => d <= dateKeyStr && (activity[d]?.exercises ?? 0) > 0)
      .sort();
    if (dates.length === 0) return 0;
    let run = 0, prev = null;
    dates.forEach(d => {
      if (prev) {
        const [py, pm, pd] = prev.split('-').map(Number);
        const p = new Date(py, pm - 1, pd); p.setDate(p.getDate() + 1);
        run = (todayKey(p) === d) ? run + 1 : 1;
      } else {
        run = 1;
      }
      prev = d;
    });
    return dates[dates.length - 1] === dateKeyStr ? run : 0;
  }

  function cumulativeMinutesTotal(activity, dateKeyStr) {
    return Object.entries(activity)
      .filter(([d]) => d <= dateKeyStr)
      .reduce((sum, [, day]) => sum + (day.minutes || 0), 0);
  }

  function weeklyAccuracyAvg(activity, dateKeyStr) {
    const [y, m, d] = dateKeyStr.split('-').map(Number);
    const monday = mondayOf(new Date(y, m - 1, d));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = activity[todayKey(addDays(monday, i))];
      if (day && day.exercises > 0) days.push(day);
    }
    if (days.length === 0) return null;
    const totalEx = days.reduce((s, dd) => s + dd.exercises, 0);
    const weighted = days.reduce((s, dd) => s + dd.accuracy_avg * dd.exercises, 0);
    return totalEx > 0 ? weighted / totalEx : null;
  }

  function daysSinceLastActivity(activity, dateKeyStr) {
    const priorDates = Object.keys(activity)
      .filter(d => d < dateKeyStr && (activity[d]?.exercises ?? 0) > 0)
      .sort();
    if (priorDates.length === 0) return null;
    const [ly, lm, ld] = priorDates[priorDates.length - 1].split('-').map(Number);
    const [ty, tm, td] = dateKeyStr.split('-').map(Number);
    return Math.round((new Date(ty, tm - 1, td) - new Date(ly, lm - 1, ld)) / 86400000);
  }

  function badgeQualifies(rule, value) {
    if (value == null) return false;
    if (rule.type === 'streak_days') return value === rule.threshold;
    return value >= rule.threshold;
  }

  // Dedup rules — must match app.js's alreadyEarned() exactly:
  //   weekly_accuracy_avg -> once per Mon-Sun week
  //   comeback             -> once per exact day
  //   everything else      -> once ever, across all dates
  function alreadyEarned(rule, dateKeyStr, badges) {
    if (rule.type === 'weekly_accuracy_avg') {
      const [y, m, d] = dateKeyStr.split('-').map(Number);
      const monday = mondayOf(new Date(y, m - 1, d));
      const sunday = addDays(monday, 6);
      return Object.entries(badges).some(([k, list]) => {
        const [ky, km, kd] = k.split('-').map(Number);
        const kdate = new Date(ky, km - 1, kd);
        return kdate >= monday && kdate <= sunday && list.some(b => b.id === rule.id);
      });
    }
    if (rule.type === 'comeback') {
      return (badges[dateKeyStr] || []).some(b => b.id === rule.id);
    }
    return Object.values(badges).flat().some(b => b.id === rule.id);
  }

  // daily_minutes / daily_wpm_avg reset every day, so a big day can jump
  // straight to a high threshold — suppress any threshold at or below the
  // family's historical max so a later smaller day can't award a skipped
  // lower one after a higher one already showed.
  function familyMaxThresholdEverAwarded(type, badges) {
    const earnedIds = new Set(Object.values(badges).flat().map(b => b.id));
    let max = 0;
    BADGE_RULES.forEach(r => { if (r.type === type && earnedIds.has(r.id)) max = Math.max(max, r.threshold); });
    return max;
  }
  function tierSuppressed(rule, badges) {
    if (rule.type !== 'daily_minutes' && rule.type !== 'daily_wpm_avg') return false;
    return rule.threshold <= familyMaxThresholdEverAwarded(rule.type, badges);
  }

  // ── Build the simulated activity + badges ──────────────────────────────
  const activity     = {};
  const badges       = {};
  const lessonStars  = {};
  let syntheticLessonIdx = 9000;
  const today = new Date();

  for (let daysAgo = 83; daysAgo >= 0; daysAgo--) {
    const date    = addDays(today, -daysAgo);
    const key     = todayKey(date);
    const minutes = pickFrom(MINUTE_CHOICES);

    if (minutes === 0) continue; // real rest day — no activity entry

    const exercises = randInt(1, 4);
    const accuracy  = pickFrom(ACCURACY_CHOICES);
    const wpm       = pickFrom(WPM_CHOICES);
    activity[key] = { exercises, accuracy_avg: accuracy, wpm_avg: wpm, minutes };

    // Occasionally "complete a lesson" worth of stars, so star_rating badges
    // have real cumulative data to cross their thresholds against.
    if (Math.random() < 0.3) {
      lessonStars[syntheticLessonIdx++] = { best_accuracy: accuracy, best_wpm: wpm, stars: randInt(1, 3) };
    }

    const streak = computeStreak(activity, key);
    const valueByType = {
      daily_minutes:       minutes,
      daily_wpm_avg:       wpm,
      streak_days:         streak,
      cumulative_minutes:  cumulativeMinutesTotal(activity, key),
      star_rating:         Object.values(lessonStars).reduce((s, l) => s + l.stars, 0),
      weekly_accuracy_avg: weeklyAccuracyAvg(activity, key),
      exercise_accuracy:   accuracy, // this day's own exercise accuracy stands in for "one exercise"
      comeback:            daysSinceLastActivity(activity, key),
    };

    const dayBadges = badges[key] ?? [];
    let changed = false;
    BADGE_RULES.forEach(rule => {
      if (alreadyEarned(rule, key, badges)) return;
      if (tierSuppressed(rule, badges)) return;
      if (badgeQualifies(rule, valueByType[rule.type])) {
        dayBadges.push({ id: rule.id, unlocked_at: new Date(date.getTime() + randInt(8, 22) * 3600e3).toISOString() });
        changed = true;
      }
    });
    if (changed) badges[key] = dayBadges;
  }

  localStorage.setItem('eluthu_activity', JSON.stringify(activity));
  localStorage.setItem('eluthu_badges', JSON.stringify(badges));
  if (Object.keys(lessonStars).length) {
    localStorage.setItem('eluthu_lesson_stars', JSON.stringify(lessonStars));
  }

  console.log(`Seeded ${Object.keys(activity).length} active days out of 84 (12 weeks).`);
  console.log(`Badges awarded on ${Object.keys(badges).length} of those days.`);
  console.log('All badge ids awarded:', [...new Set(Object.values(badges).flat().map(b => b.id))]);
  console.log('Reload the page to see the heatmap.');
})();
