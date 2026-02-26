(function () {
  function getTheme() {
    var stored = localStorage.getItem('theme');
    if (stored) return stored;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(function (btn) {
      btn.textContent = theme === 'dark' ? '\u2600' : '\u263E';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || getTheme();
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  }

  // If no .theme-toggle exists (noHeader pages), create a fixed one
  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(getTheme());

    if (!document.querySelector('.theme-toggle')) {
      var btn = document.createElement('button');
      btn.className = 'theme-toggle theme-toggle-fixed';
      document.body.appendChild(btn);
      applyTheme(getTheme());
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('.theme-toggle')) {
        toggleTheme();
      }
    });

    // Settings gear menu toggle
    document.querySelectorAll('.settings-menu-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var menu = btn.closest('.settings-menu');
        menu.classList.toggle('open');
      });
    });

    document.addEventListener('click', function(e) {
      document.querySelectorAll('.settings-menu.open').forEach(function(menu) {
        if (!menu.contains(e.target)) {
          menu.classList.remove('open');
        }
      });
    });
  });

  // Listen for OS preference changes (only if no manual override)
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (!localStorage.getItem('theme')) {
      applyTheme(getTheme());
    }
  });
})();
