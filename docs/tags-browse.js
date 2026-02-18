(function () {
  var dataEl = document.getElementById('posts-data');
  if (!dataEl) return;

  var posts = JSON.parse(dataEl.textContent);
  var sidebar = document.querySelector('.tags-sidebar');
  var listContainer = document.getElementById('filtered-posts');
  var breadcrumbBar = document.getElementById('breadcrumb-bar');
  if (!sidebar || !listContainer || !breadcrumbBar) return;

  // State: active filters per facet + search query
  var state = { subject: new Set(), concern: new Set(), form: new Set(), q: '' };
  var searchInput = document.getElementById('tags-search-input');

  // Slug helper matching server-side tagId()
  function tagId(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function filterPosts() {
    return posts.filter(function (p) {
      // AND across facets, AND within subject/concern, OR within form
      if (state.subject.size > 0) {
        var slugged = new Set();
        p.subjects.forEach(function (s) { slugged.add(tagId(s)); });
        var allMatch = true;
        state.subject.forEach(function (v) { if (!slugged.has(v)) allMatch = false; });
        if (!allMatch) return false;
      }
      if (state.concern.size > 0) {
        var slugged = new Set();
        p.concerns.forEach(function (c) { slugged.add(tagId(c)); });
        var allMatch = true;
        state.concern.forEach(function (v) { if (!slugged.has(v)) allMatch = false; });
        if (!allMatch) return false;
      }
      if (state.form.size > 0) {
        if (!state.form.has(tagId(p.form))) return false;
      }
      // Text search filter
      if (state.q) {
        var haystack = (p.title + ' ' + p.description).toLowerCase();
        if (haystack.indexOf(state.q) === -1) return false;
      }
      return true;
    });
  }

  function countFacetValues(filtered) {
    var counts = { subject: {}, concern: {}, form: {} };
    filtered.forEach(function (p) {
      p.subjects.forEach(function (s) {
        var id = tagId(s);
        counts.subject[id] = (counts.subject[id] || 0) + 1;
      });
      p.concerns.forEach(function (c) {
        var id = tagId(c);
        counts.concern[id] = (counts.concern[id] || 0) + 1;
      });
      var fid = tagId(p.form);
      counts.form[fid] = (counts.form[fid] || 0) + 1;
    });
    return counts;
  }

  function render() {
    var filtered = filterPosts();
    var counts = countFacetValues(filtered);

    // Update breadcrumb bar
    var crumbs = [];
    ['subject', 'concern', 'form'].forEach(function (facet) {
      state[facet].forEach(function (val) {
        var btn = sidebar.querySelector('.tag-tab[data-facet="' + facet + '"][data-value="' + val + '"]');
        var label = btn ? btn.childNodes[0].textContent.trim() : val;
        crumbs.push('<button class="crumb" data-facet="' + facet + '" data-value="' + val + '">' + esc(label) + ' ×</button>');
      });
    });
    var countText = filtered.length + ' post' + (filtered.length !== 1 ? 's' : '');
    if (crumbs.length > 0) {
      breadcrumbBar.innerHTML = crumbs.join('') + '<span class="result-count">' + countText + '</span>';
      breadcrumbBar.classList.add('has-crumbs');
    } else {
      breadcrumbBar.innerHTML = '<span class="result-count">' + countText + '</span>';
      breadcrumbBar.classList.remove('has-crumbs');
    }

    // Update post list
    if (filtered.length === 0) {
      listContainer.innerHTML = '<p style="color:var(--text-muted)">No posts match the selected filters.</p>';
    } else {
      var html = '<ul class="tag-posts">';
      filtered.forEach(function (p) {
        html += '<li class="tag-post"><a href="' + p.url + '">';
        html += '<span class="post-title">' + esc(p.title) + '</span>';
        if (p.date) html += '<span class="post-date">' + p.date + '</span>';
        if (p.description) html += '<span class="post-description">' + esc(p.description) + '</span>';
        html += '</a></li>';
      });
      html += '</ul>';
      listContainer.innerHTML = html;
    }

    // Update button states, counts, and fill bars
    var groups = sidebar.querySelectorAll('.facet-group');
    for (var g = 0; g < groups.length; g++) {
      var group = groups[g];
      var facet = group.getAttribute('data-facet');
      var facetCounts = counts[facet] || {};
      var buttons = group.querySelectorAll('.tag-tab');

      // Find max count in this group for fill calculation
      var maxInGroup = 0;
      for (var i = 0; i < buttons.length; i++) {
        var val = buttons[i].getAttribute('data-value');
        var c = facetCounts[val] || 0;
        if (c > maxInGroup) maxInGroup = c;
      }

      for (var i = 0; i < buttons.length; i++) {
        var btn = buttons[i];
        var value = btn.getAttribute('data-value');
        var isActive = state[facet] && state[facet].has(value);
        var count = facetCounts[value] || 0;

        btn.classList.toggle('active', isActive);

        var countEl = btn.querySelector('.tag-count');
        if (countEl) countEl.textContent = count;

        var fill = maxInGroup > 0 ? Math.round((count / maxInGroup) * 100) : 0;
        btn.style.setProperty('--fill', fill + '%');
      }
    }
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Breadcrumb click to remove filter
  breadcrumbBar.addEventListener('click', function (e) {
    var crumb = e.target.closest('.crumb');
    if (!crumb) return;

    var facet = crumb.getAttribute('data-facet');
    var value = crumb.getAttribute('data-value');
    if (state[facet]) {
      state[facet].delete(value);
      render();
      updateHash();
    }
  });

  // Search input with debounce
  var searchTimer = null;
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.q = searchInput.value.trim().toLowerCase();
        render();
        updateHash();
      }, 150);
    });
  }

  // Event delegation for button clicks
  sidebar.addEventListener('click', function (e) {
    var btn = e.target.closest('.tag-tab');
    if (!btn) return;

    var facet = btn.getAttribute('data-facet');
    var value = btn.getAttribute('data-value');
    if (!state[facet]) return;

    if (state[facet].has(value)) {
      state[facet].delete(value);
    } else {
      state[facet].add(value);
    }

    render();
    updateHash();

    // On mobile, scroll the tapped pill into view
    if (window.innerWidth <= 768) {
      btn.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  });

  // URL hash sync
  function parseHash() {
    state.subject = new Set();
    state.concern = new Set();
    state.form = new Set();
    state.q = '';

    var hash = location.hash.slice(1);
    if (!hash) return;

    hash.split('&').forEach(function (part) {
      var eq = part.indexOf('=');
      if (eq === -1) return;
      var key = decodeURIComponent(part.slice(0, eq));
      var val = decodeURIComponent(part.slice(eq + 1));
      if (key === 'q') {
        state.q = val.toLowerCase();
      } else if (state[key]) {
        val.split(',').filter(Boolean).forEach(function (v) { state[key].add(v); });
      }
    });

    if (searchInput) searchInput.value = state.q;
  }

  function updateHash() {
    var parts = [];
    ['subject', 'concern', 'form'].forEach(function (facet) {
      if (state[facet].size > 0) {
        parts.push(facet + '=' + Array.from(state[facet]).join(','));
      }
    });
    if (state.q) {
      parts.push('q=' + encodeURIComponent(state.q));
    }
    var newHash = parts.length > 0 ? '#' + parts.join('&') : '';
    if (newHash !== location.hash && !(newHash === '' && location.hash === '')) {
      history.replaceState(null, '', newHash || location.pathname);
    }
  }

  window.addEventListener('hashchange', function () {
    parseHash();
    render();
  });

  // Init: parse hash, render
  parseHash();
  render();
})();
