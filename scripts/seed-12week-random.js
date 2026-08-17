// ── Paste into the browser devtools console while eluthu is open ──────────────
// Seeds exactly 12 weeks (84 days, filling the whole visible grid) ending
// today. Each day's practice time is picked from:
//   [0, 0, 0, 2, 4, 6, 8, 10, 15, 20, 25]
// The three 0s give ~27% of days no practice at all (no activity entry that
// day), so streaks break and reform naturally across the grid instead of
// running as one unbroken 84-day streak.
//
// Overwrites eluthu_activity / eluthu_badges entirely. To reset afterward:
//   localStorage.removeItem('eluthu_activity');
//   localStorage.removeItem('eluthu_badges');
// then reload.

(function seed12WeeksRandom() {
  const MINUTE_CHOICES = [0, 0, 0, 2, 4, 6, 8, 10, 15, 20, 25];

  function todayKey(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'),
          day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
  function randInt(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
  function pickMinutes() { return MINUTE_CHOICES[randInt(0, MINUTE_CHOICES.length - 1)]; }

  // Read live badge config from the running app if available (so this
  // respects whatever thresholds app.js currently has, e.g. your testing
  // tweak of daily_15min -> 1 minute). Falls back to defaults otherwise.
  const badgeCfg = (typeof BADGES !== 'undefined') ? BADGES : [
    { id: 'daily_15min', type: 'daily_minutes', threshold: 15, icon: '⏱️' },
    { id: 'streak_5',    type: 'streak_days',    threshold: 5,  icon: '🔥' },
  ];

  const activity = {};
  const badges   = {};
  const today    = new Date();

  let streak = 0;
  for (let daysAgo = 83; daysAgo >= 0; daysAgo--) {
    const date    = addDays(today, -daysAgo);
    const key     = todayKey(date);
    const minutes = pickMinutes();

    if (minutes === 0) {
      streak = 0;
      continue; // no activity entry — a real rest day
    }
    streak++;

    const exercises = randInt(1, 4);
    const accuracy  = randInt(75, 100);
    const wpm       = randInt(10, 40);

    activity[key] = { exercises, accuracy_avg: accuracy, wpm_avg: wpm, minutes };

    const dayBadges = [];
    badgeCfg.forEach(b => {
      const qualifies = b.type === 'streak_days'
        ? streak === b.threshold          // exact-match: fires once, the day the streak first hits it
        : minutes >= b.threshold;         // daily_minutes: per-day value, >= is correct
      if (qualifies) {
        dayBadges.push({ id: b.id, unlocked_at: new Date(date.getTime() + randInt(8, 22) * 3600e3).toISOString() });
      }
    });
    if (dayBadges.length) badges[key] = dayBadges;
  }

  localStorage.setItem('eluthu_activity', JSON.stringify(activity));
  localStorage.setItem('eluthu_badges', JSON.stringify(badges));

  console.log(`Seeded ${Object.keys(activity).length} active days out of 84 (12 weeks).`);
  console.log('Reload the page to see the heatmap.');
})();
