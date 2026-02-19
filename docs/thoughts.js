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
  var fileInput = document.getElementById('thought-file');
  var fileLabel = document.getElementById('thought-file-label');
  var fileClear = document.getElementById('thought-file-clear');

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function renderAttachments(t) {
    if (!t.attachments || !t.attachments.length) return '';
    var html = '<div class="thought-attachments">';
    for (var i = 0; i < t.attachments.length; i++) {
      var att = t.attachments[i];
      var url = API + '/attachments/' + att.key;
      if (att.type && att.type.startsWith('image/')) {
        html += '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(att.name) + '" loading="lazy">';
      } else {
        html += '<a class="thought-file-link" href="' + escapeHtml(url) + '" download="' + escapeHtml(att.name) + '">' + escapeHtml(att.name) + '</a>';
      }
    }
    html += '</div>';
    return html;
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
    div.dataset.id = t.id;
    var deleteBtn = getSecret()
      ? '<button class="thought-delete" aria-label="Delete thought">&times;</button>'
      : '';
    div.innerHTML =
      '<div class="thought-header">' +
        '<span class="thought-author">tantaman</span>' +
        '<span class="thought-meta-sep">&middot;</span>' +
        '<span class="thought-time">' + escapeHtml(formatTime(t.timestamp)) + '</span>' +
        deleteBtn +
      '</div>' +
      '<div class="thought-body">' + escapeHtml(t.body) + '</div>' +
      renderAttachments(t);

    var btn = div.querySelector('.thought-delete');
    if (btn) {
      btn.addEventListener('click', function () {
        deleteThought(t.id, div);
      });
    }
    return div;
  }

  function deleteThought(id, el) {
    if (!confirm('Delete this thought?')) return;
    fetch(API + '/thoughts/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + getSecret() },
    }).then(function (r) {
      if (r.status === 401) {
        setSecret(null);
        updateFormVisibility();
        updateDeleteButtons();
        return;
      }
      if (r.ok) {
        el.remove();
        offset -= 1;
      }
    });
  }

  function updateDeleteButtons() {
    var authed = !!getSecret();
    var thoughts = listEl.querySelectorAll('.thought');
    for (var i = 0; i < thoughts.length; i++) {
      var header = thoughts[i].querySelector('.thought-header');
      var existing = header.querySelector('.thought-delete');
      if (authed && !existing) {
        var btn = document.createElement('button');
        btn.className = 'thought-delete';
        btn.setAttribute('aria-label', 'Delete thought');
        btn.innerHTML = '&times;';
        var thoughtId = thoughts[i].dataset.id;
        var thoughtEl = thoughts[i];
        (function (id, el) {
          btn.addEventListener('click', function () { deleteThought(id, el); });
        })(thoughtId, thoughtEl);
        header.appendChild(btn);
      } else if (!authed && existing) {
        existing.remove();
      }
    }
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

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  function updateFileLabel() {
    var files = fileInput.files;
    if (files && files.length > 0) {
      var names = [];
      for (var i = 0; i < files.length; i++) names.push(files[i].name);
      fileLabel.textContent = names.join(', ');
      fileClear.style.display = '';
    } else {
      fileLabel.textContent = '';
      fileClear.style.display = 'none';
    }
  }

  fileInput.addEventListener('change', function () {
    var files = fileInput.files;
    for (var i = 0; i < files.length; i++) {
      if (files[i].size > 5 * 1024 * 1024) {
        alert('File "' + files[i].name + '" exceeds 5MB limit');
        fileInput.value = '';
        updateFileLabel();
        return;
      }
    }
    updateFileLabel();
  });

  fileClear.addEventListener('click', function () {
    fileInput.value = '';
    updateFileLabel();
  });

  updateFileLabel();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var body = input.value.trim();
    if (!body) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    var files = fileInput.files;
    var hasFiles = files && files.length > 0;
    var fetchOpts = {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + getSecret() },
    };

    if (hasFiles) {
      var fd = new FormData();
      fd.append('body', body);
      for (var i = 0; i < files.length; i++) fd.append('file', files[i]);
      fetchOpts.body = fd;
    } else {
      fetchOpts.headers['Content-Type'] = 'application/json';
      fetchOpts.body = JSON.stringify({ body: body });
    }

    fetch(API + '/thoughts', fetchOpts)
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
        fileInput.value = '';
        updateFileLabel();
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
      updateDeleteButtons();
    }
  });

  updateFormVisibility();
  loadThoughts();
})();
