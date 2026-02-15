(function () {
  var sidebar = document.querySelector('.tags-sidebar');
  if (!sidebar) return;

  function activate(tagId) {
    var prev = sidebar.querySelector('.tag-tab.active');
    var next = sidebar.querySelector('.tag-tab[data-tag="' + tagId + '"]');
    if (!next || next === prev) return;

    if (prev) {
      prev.classList.remove('active');
      prev.setAttribute('aria-selected', 'false');
      var prevPanel = document.getElementById(prev.getAttribute('aria-controls'));
      if (prevPanel) {
        prevPanel.classList.remove('active');
        prevPanel.hidden = true;
      }
    }

    next.classList.add('active');
    next.setAttribute('aria-selected', 'true');
    var nextPanel = document.getElementById(next.getAttribute('aria-controls'));
    if (nextPanel) {
      nextPanel.classList.add('active');
      nextPanel.hidden = false;
    }

    history.replaceState(null, '', '#' + tagId);

    // On mobile, scroll the active pill into view
    if (window.innerWidth <= 768) {
      next.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }

  sidebar.addEventListener('click', function (e) {
    var tab = e.target.closest('.tag-tab');
    if (tab) activate(tab.getAttribute('data-tag'));
  });

  window.addEventListener('hashchange', function () {
    var tag = location.hash.slice(1);
    if (tag) activate(tag);
  });

  // Activate tag from URL hash on load
  var hash = location.hash.slice(1);
  if (hash) activate(hash);
})();
