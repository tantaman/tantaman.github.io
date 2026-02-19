(function () {
  var API = 'https://tantamanlands.tantaman.workers.dev';
  var limit = 50;
  var offset = 0;
  var loading = false;

  var listEl = document.getElementById('thoughts-list');
  var loadMoreBtn = document.getElementById('load-more');
  var formWrap = document.getElementById('thoughts-form-wrap');
  var form = document.getElementById('thoughts-form');
  var input = document.getElementById('thought-input');
  var charCount = document.getElementById('char-count');
  var submitBtn = document.getElementById('thought-submit');
  var secretToggle = document.getElementById('secret-toggle');

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function formatTime(timestamp) {
    var d = new Date(timestamp * 1000);
    var now = new Date();
    var diff = (now - d) / 1000;

    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';

    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }

  function renderThought(t) {
    var div = document.createElement('div');
    div.className = 'thought';
    div.innerHTML =
      '<div class="thought-body">' + escapeHtml(t.body) + '</div>' +
      '<div class="thought-time">' + escapeHtml(formatTime(t.timestamp)) + '</div>';
    return div;
  }

  function getSecret() {
    return localStorage.getItem('thought-secret');
  }

  function setSecret(s) {
    if (s) {
      localStorage.setItem('thought-secret', s);
    } else {
      localStorage.removeItem('thought-secret');
    }
  }

  function updateFormVisibility() {
    formWrap.style.display = getSecret() ? '' : 'none';
  }

  function loadThoughts() {
    if (loading) return;
    loading = true;
    loadMoreBtn.textContent = 'Loading...';

    fetch(API + '/thoughts?limit=' + limit + '&offset=' + offset)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data.thoughts.forEach(function (t) {
          listEl.appendChild(renderThought(t));
        });
        offset += data.thoughts.length;
        loadMoreBtn.style.display = data.meta.hasMore ? '' : 'none';
        loadMoreBtn.textContent = 'Load more';
        loading = false;
      })
      .catch(function () {
        loadMoreBtn.textContent = 'Load more';
        loading = false;
      });
  }

  loadMoreBtn.addEventListener('click', loadThoughts);

  input.addEventListener('input', function () {
    charCount.textContent = input.value.length + ' / 1000';
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = input.value.trim();
    if (!body) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    fetch(API + '/thoughts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getSecret(),
      },
      body: JSON.stringify({ body: body }),
    })
      .then(function (r) {
        if (r.status === 401) {
          setSecret(null);
          updateFormVisibility();
          throw new Error('Unauthorized');
        }
        return r.json();
      })
      .then(function (t) {
        listEl.insertBefore(renderThought(t), listEl.firstChild);
        input.value = '';
        charCount.textContent = '0 / 1000';
        offset += 1;
      })
      .catch(function (err) {
        if (err.message !== 'Unauthorized') {
          alert('Failed to post thought');
        }
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post';
      });
  });

  secretToggle.addEventListener('click', function () {
    var current = getSecret();
    var val = prompt(current ? 'Update or clear secret:' : 'Enter secret:', current || '');
    if (val !== null) {
      setSecret(val || null);
      updateFormVisibility();
    }
  });

  updateFormVisibility();
  loadThoughts();
})();
