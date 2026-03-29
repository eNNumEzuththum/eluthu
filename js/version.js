/**
 * version.js — எழுது
 * Collects versions registered by all files and displays them.
 * This file holds no version numbers — each file owns its own.
 */

document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.getElementById('version-info');
  if (!wrap) return;

  // Display order
  const ORDER = [
    'index.html',
    'style.css',
    'tamil99-keymap.json',
    'tamil99.js',
    'combination.js',
    'typing.js',
    'lessons.js',
    'app.js',
    'version.js',
  ];

  const versions = window.ELUTHU_VERSIONS || {};

  const entries = ORDER
    .filter(f => versions[f])
    .map(f => `<span>${f} <b>v${versions[f]}</b></span>`)
    .join(' &nbsp; ');

  wrap.innerHTML = entries || '<span>no versions registered</span>';
  // Append tester link
  const testerLink = document.createElement('a');
  testerLink.href = 'tamil99-tester.html';
  testerLink.innerHTML = '⌨&nbsp;free typing';
  testerLink.title = 'எழுது விசைப்பலகை பயிற்சி';
  testerLink.style.cssText = 'margin-left:12px;color:#4B9BFF;opacity:0.85;text-decoration:none;font-size:14px;';
  testerLink.target = '_blank';
  wrap.appendChild(testerLink);
});

// Self-register
window.ELUTHU_VERSIONS = window.ELUTHU_VERSIONS || {};
window.ELUTHU_VERSIONS['version.js'] = '1.0.0';
