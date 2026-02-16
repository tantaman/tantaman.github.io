(function () {
  var dataEl = document.getElementById('posts-data');
  if (!dataEl) return;

  var posts = JSON.parse(dataEl.textContent);
  var sidebar = document.querySelector('.tags-sidebar');
  var listContainer = document.getElementById('filtered-posts');
  var resultCount = document.querySelector('.result-count');
  if (!sidebar || !listContainer || !resultCount) return;

  // State: active filters per facet
  var state = { subject: new Set(), concern: new Set(), form: new Set() };

  // Slug helper matching server-side tagId()
  function tagId(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function filterPosts() {
    return posts.filter(function (p) {
      // AND across facets, OR within each facet
      if (state.subject.size > 0) {
        var match = false;
        p.subjects.forEach(function (s) { if (state.subject.has(tagId(s))) match = true; });
        if (!match) return false;
      }
      if (state.concern.size > 0) {
        var match = false;
        p.concerns.forEach(function (c) { if (state.concern.has(tagId(c))) match = true; });
        if (!match) return false;
      }
      if (state.form.size > 0) {
        if (!state.form.has(tagId(p.form))) return false;
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

    // Update result count
    resultCount.textContent = filtered.length + ' post' + (filtered.length !== 1 ? 's' : '');

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

    var hash = location.hash.slice(1);
    if (!hash) return;

    hash.split('&').forEach(function (part) {
      var eq = part.indexOf('=');
      if (eq === -1) return;
      var key = decodeURIComponent(part.slice(0, eq));
      var vals = decodeURIComponent(part.slice(eq + 1)).split(',').filter(Boolean);
      if (state[key]) {
        vals.forEach(function (v) { state[key].add(v); });
      }
    });
  }

  function updateHash() {
    var parts = [];
    ['subject', 'concern', 'form'].forEach(function (facet) {
      if (state[facet].size > 0) {
        parts.push(facet + '=' + Array.from(state[facet]).join(','));
      }
    });
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
