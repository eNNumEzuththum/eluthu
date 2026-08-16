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

function renderFooter() {
  const wrap = document.getElementById('version-info');
  if (!wrap) return;

  // ── Minimal footer ───────────────────────────────────────────────────────────
  wrap.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;padding:8px 0;">
      <div style="font-size:12px;color:#888;">🔒 100% Offline &amp; Private</div>
      <div style="font-size:11px;color:#aaa;">v1.4.11 (16 Aug 2026)</div>
    </div>
  `;
}

// Run immediately if DOM ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderFooter);
} else {
  renderFooter();
}

// Self-register
window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['version.js'] = '1.4.11';
