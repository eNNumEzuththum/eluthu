/**
 * version.js — எழுது
 * Collects versions registered by all files and displays them.
 * This file holds no version numbers — each file owns its own.
 * @version 1.0.3
 */

// ── Welcome modal ─────────────────────────────────────────────────────────────
const WELCOME_KEY = 'eluthu_welcomed';

function showWelcome() {
  const overlay = document.getElementById('welcome-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function hideWelcome() {
  const overlay = document.getElementById('welcome-overlay');
  if (overlay) overlay.classList.add('hidden');
  localStorage.setItem(WELCOME_KEY, '1');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay  = document.getElementById('welcome-overlay');
  const btnStart = document.getElementById('welcome-start');
  const btnClose = document.getElementById('welcome-close');
  const btnHelp  = document.getElementById('btn-welcome');

  // Show on first visit
  if (!localStorage.getItem(WELCOME_KEY)) {
    showWelcome();
  }

  // Dismiss via button, close ✕, or clicking outside panel
  if (btnStart) btnStart.addEventListener('click', hideWelcome);
  if (btnClose) btnClose.addEventListener('click', hideWelcome);
  if (overlay)  overlay.addEventListener('click', e => {
    if (e.target === overlay) hideWelcome();
  });

  // Dismiss via Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
      hideWelcome();
    }
  });

  // ? button reopens modal
  if (btnHelp) btnHelp.addEventListener('click', showWelcome);
});

document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.getElementById('version-info');
  if (!wrap) return;

  // ── Single app version + free typing link (left side) ──────────────────
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;flex:1;">
      <span>எழுது <b>v1.0.0</b> <span style="opacity:0.6;font-size:10px;">(updated 23 July 2026)</span></span>
      <a href="tamil99-tester.html"
         title="எழுது விசைப்பலகை பயிற்சி"
         target="_blank"
         style="color:#4B9BFF;opacity:0.85;text-decoration:none;">⌨&nbsp;சுய தட்டச்சுப் பயிற்சி&nbsp;/&nbsp;type anything</a>
      <a href="https://forms.gle/uwwtEWPmU6NVf6QaA"
         target="_blank"
         style="color:#4B9BFF;opacity:0.85;text-decoration:none;">📝&nbsp;கருத்து&nbsp;/&nbsp;Feedback</a>
      <a href="https://github.com/eNNumEzuththum/eluthu"
         target="_blank"
        style="color:#4B9BFF;opacity:0.85;text-decoration:none;">&nbsp;மூலக்குறியீடு&nbsp;/&nbsp;source code</a>
    </div>
    <div style="font-size:12px;opacity:1;text-align:right;line-height:1.6;">
உங்களது தகவல்களின் பாதுகாப்புக்கு உத்தரவாதம் -- தட்டச்சு செய்வது உங்களது கணணியை விட்டு வெளியே போகாது <br>
(your privacy is completely guaranteed  --Nothing you type ever leaves your computer).
    </div>
  `;
});

// Self-register
window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['version.js'] = '1.0.3';
