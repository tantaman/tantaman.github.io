(function () {
  var API = 'https://tantamanlands.tantaman.workers.dev';
  var limit = 50;
  var offset = 0;
  var loading = false;

  var currentView = 'feed';
  var currentThreadId = null;

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

  function renderThought(t, options) {
    var isParent = options && options.isParent;
    var div = document.createElement('div');
    div.className = 'thought' + (isParent ? ' thought--parent' : '');
    div.dataset.id = t.id;
    var deleteBtn = getSecret()
      ? '<button class="thought-delete" aria-label="Delete thought">&times;</button>'
      : '';
    var footerHtml = '';
    if (!isParent) {
      var count = t.reply_count || 0;
      if (count > 0) {
        footerHtml = '<div class="thought-footer">' +
          '<a href="#thought-' + t.id + '" class="thought-replies-link">' + count + (count === 1 ? ' reply' : ' replies') + '</a>' +
          '</div>';
      } else if (getSecret()) {
        footerHtml = '<div class="thought-footer">' +
          '<a href="#thought-' + t.id + '" class="thought-replies-link thought-replies-link--subtle">Reply</a>' +
          '</div>';
      }
    }
    div.innerHTML =
      '<div class="thought-header">' +
        '<span class="thought-author">tantaman</span>' +
        '<span class="thought-meta-sep">&middot;</span>' +
        '<span class="thought-time">' + escapeHtml(formatTime(t.timestamp)) + '</span>' +
        deleteBtn +
      '</div>' +
      '<div class="thought-body">' + escapeHtml(t.body) + '</div>' +
      renderAttachments(t) +
      footerHtml;

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
        if (currentView === 'thread' && String(id) === String(currentThreadId)) {
          navigateToFeed();
        } else if (currentView === 'thread') {
          el.remove();
          updateRepliesLabel();
        } else {
          el.remove();
          offset -= 1;
        }
      }
    });
  }

  function updateRepliesLabel() {
    var label = listEl.querySelector('.replies-label');
    if (!label) return;
    var replies = listEl.querySelectorAll('.thought:not(.thought--parent)');
    var count = replies.length;
    label.textContent = count > 0 ? count + (count === 1 ? ' Reply' : ' Replies') : 'No replies yet';
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
    if (currentView === 'feed') {
      formWrap.style.display = getSecret() ? '' : 'none';
    }
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

  // ── Routing ──

  function route() {
    var hash = location.hash;
    var match = hash.match(/^#thought-(\d+)$/);
    if (match) {
      loadThread(match[1]);
    } else {
      showFeed();
    }
  }

  function navigateToThread(id) {
    location.hash = '#thought-' + id;
  }

  function navigateToFeed() {
    history.pushState(null, '', location.pathname);
    route();
  }

  function showFeed() {
    currentView = 'feed';
    currentThreadId = null;

    // Remove thread-specific elements
    var backBar = listEl.parentNode.querySelector('.thread-back');
    if (backBar) backBar.remove();
    var replyForm = listEl.parentNode.querySelector('.reply-form-wrap');
    if (replyForm) replyForm.remove();

    listEl.innerHTML = '';
    offset = 0;

    formWrap.style.display = getSecret() ? '' : 'none';
    loadMoreBtn.style.display = 'none';

    loadThoughts();
  }

  function loadThread(id) {
    currentView = 'thread';
    currentThreadId = id;

    // Hide main form and load-more
    formWrap.style.display = 'none';
    loadMoreBtn.style.display = 'none';

    // Clear list
    listEl.innerHTML = '';

    // Remove old back bar / reply form if any
    var oldBack = listEl.parentNode.querySelector('.thread-back');
    if (oldBack) oldBack.remove();
    var oldReplyForm = listEl.parentNode.querySelector('.reply-form-wrap');
    if (oldReplyForm) oldReplyForm.remove();

    // Insert back button
    var backBar = document.createElement('div');
    backBar.className = 'thread-back';
    var backLink = document.createElement('a');
    backLink.className = 'thread-back-link';
    backLink.href = '#';
    backLink.textContent = '\u2190 Back';
    backLink.addEventListener('click', function (e) {
      e.preventDefault();
      navigateToFeed();
    });
    backBar.appendChild(backLink);
    listEl.parentNode.insertBefore(backBar, listEl);

    // Show loading
    var loadingEl = document.createElement('div');
    loadingEl.className = 'thought-loading';
    loadingEl.textContent = 'Loading...';
    listEl.appendChild(loadingEl);

    fetch(API + '/thoughts/' + id + '/replies')
      .then(function (r) {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(function (data) {
        listEl.innerHTML = '';

        // Parent thought
        listEl.appendChild(renderThought(data.parent, { isParent: true }));

        // Replies label
        var label = document.createElement('div');
        label.className = 'replies-label';
        var count = data.replies.length;
        label.textContent = count > 0 ? count + (count === 1 ? ' Reply' : ' Replies') : 'No replies yet';
        listEl.appendChild(label);

        // Replies
        data.replies.forEach(function (r) {
          listEl.appendChild(renderThought(r));
        });

        // Reply form if authed
        if (getSecret()) {
          listEl.appendChild(createReplyForm(id));
        }
      })
      .catch(function () {
        listEl.innerHTML = '';
        var msg = document.createElement('div');
        msg.className = 'thought-loading';
        msg.innerHTML = 'Thought not found. <a href="#" class="thread-back-link">Back to feed</a>';
        var link = msg.querySelector('a');
        link.addEventListener('click', function (e) {
          e.preventDefault();
          navigateToFeed();
        });
        listEl.appendChild(msg);
      });
  }

  function createReplyForm(parentId) {
    var wrap = document.createElement('div');
    wrap.className = 'reply-form-wrap';

    var replyForm = document.createElement('form');
    replyForm.className = 'reply-form';

    var composeArea = document.createElement('div');
    composeArea.className = 'compose-area';
    var textarea = document.createElement('textarea');
    textarea.placeholder = 'Write a reply...';
    textarea.maxLength = 1000;
    textarea.rows = 3;
    composeArea.appendChild(textarea);
    replyForm.appendChild(composeArea);

    var fileRow = document.createElement('div');
    fileRow.className = 'compose-file-row';
    var replyFileInput = document.createElement('input');
    replyFileInput.type = 'file';
    replyFileInput.multiple = true;
    replyFileInput.style.display = 'none';
    replyFileInput.id = 'reply-file-' + parentId;
    var replyFileLabel = document.createElement('label');
    replyFileLabel.className = 'compose-file-btn';
    replyFileLabel.setAttribute('for', replyFileInput.id);
    replyFileLabel.textContent = 'Attach files';
    var replyFileName = document.createElement('span');
    replyFileName.className = 'compose-file-name';
    var replyFileClear = document.createElement('button');
    replyFileClear.type = 'button';
    replyFileClear.className = 'compose-file-clear';
    replyFileClear.innerHTML = '&times;';
    fileRow.appendChild(replyFileLabel);
    fileRow.appendChild(replyFileInput);
    fileRow.appendChild(replyFileName);
    fileRow.appendChild(replyFileClear);
    replyForm.appendChild(fileRow);

    function updateReplyFileLabel() {
      var files = replyFileInput.files;
      if (files && files.length > 0) {
        var names = [];
        for (var i = 0; i < files.length; i++) names.push(files[i].name);
        replyFileName.textContent = names.join(', ');
        replyFileClear.style.display = '';
      } else {
        replyFileName.textContent = '';
        replyFileClear.style.display = 'none';
      }
    }

    replyFileInput.addEventListener('change', function () {
      var files = replyFileInput.files;
      for (var i = 0; i < files.length; i++) {
        if (files[i].size > 5 * 1024 * 1024) {
          alert('File "' + files[i].name + '" exceeds 5MB limit');
          replyFileInput.value = '';
          updateReplyFileLabel();
          return;
        }
      }
      updateReplyFileLabel();
    });

    replyFileClear.addEventListener('click', function () {
      replyFileInput.value = '';
      updateReplyFileLabel();
    });

    updateReplyFileLabel();

    var footer = document.createElement('div');
    footer.className = 'thoughts-form-footer';
    var replyCharCount = document.createElement('span');
    replyCharCount.className = 'char-count';
    replyCharCount.textContent = '0 / 1000';
    var replySubmit = document.createElement('button');
    replySubmit.type = 'submit';
    replySubmit.textContent = 'Reply';
    replySubmit.className = 'reply-submit';
    footer.appendChild(replyCharCount);
    footer.appendChild(replySubmit);
    replyForm.appendChild(footer);

    textarea.addEventListener('input', function () {
      replyCharCount.textContent = textarea.value.length + ' / 1000';
    });

    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        replyForm.requestSubmit();
      }
    });

    replyForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var body = textarea.value.trim();
      if (!body) return;

      replySubmit.disabled = true;
      replySubmit.textContent = 'Posting...';

      var files = replyFileInput.files;
      var hasFiles = files && files.length > 0;
      var fetchOpts = {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + getSecret() },
      };

      if (hasFiles) {
        var fd = new FormData();
        fd.append('body', body);
        fd.append('parent_id', parentId);
        for (var i = 0; i < files.length; i++) fd.append('file', files[i]);
        fetchOpts.body = fd;
      } else {
        fetchOpts.headers['Content-Type'] = 'application/json';
        fetchOpts.body = JSON.stringify({ body: body, parent_id: parseInt(parentId, 10) });
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
          var replyEl = renderThought(t);
          listEl.insertBefore(replyEl, wrap);
          textarea.value = '';
          replyCharCount.textContent = '0 / 1000';
          replyFileInput.value = '';
          updateReplyFileLabel();
          updateRepliesLabel();
        })
        .catch(function (err) {
          if (err.message !== 'Unauthorized') {
            alert('Failed to post reply');
          }
        })
        .finally(function () {
          replySubmit.disabled = false;
          replySubmit.textContent = 'Reply';
        });
    });

    wrap.appendChild(replyForm);
    return wrap;
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

  window.addEventListener('hashchange', route);

  updateFormVisibility();
  route();
})();
