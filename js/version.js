/**
 * version.js — எழுது
 * Collects versions registered by all files and displays them.
 * This file holds no version numbers — each file owns its own.
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

  // ── Footer: Tamil-primary, A1 quiet gloss ───────────────────────────────
  wrap.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;text-align:center;">
      <div style="font-size:13px;color:#555;">🔒 100% Offline &amp; Private</div>
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:center;">
        <a href="tamil99-tester.html" target="_blank"
           style="color:#4B9BFF;text-decoration:none;font-family:'Noto Sans Tamil',serif;">⌨️ சொந்தப் பயிற்சி</a>
        <a href="https://forms.gle/uwwtEWPmU6NVf6QaA" target="_blank"
           style="color:#4B9BFF;text-decoration:none;font-family:'Noto Sans Tamil',serif;">📝 பின்னூட்டம்</a>
        <a href="https://github.com/eNNumEzuththum/eluthu" target="_blank"
           style="color:#4B9BFF;text-decoration:none;">💻 GitHub</a>
      </div>
      <div style="font-size:11px;color:#aaa;">v1.2.3 (04 Aug 2026)</div>
    </div>
  `;
});

// Self-register
window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['version.js'] = '1.2.3';
