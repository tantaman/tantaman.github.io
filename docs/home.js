(function () {
  document.addEventListener('click', function (e) {
    var pill = e.target.closest('.pill[data-facet]');
    if (!pill) return;

    e.preventDefault();
    e.stopPropagation();

    var facet = pill.getAttribute('data-facet');
    var value = pill.getAttribute('data-value');
    window.location.href = '/tags.html#' + facet + '=' + value;
  });

  // Infinite scroll pagination
  var sentinel = document.getElementById('page-sentinel');
  if (!sentinel) return;

  var loading = false;
  var observer = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !loading) {
      loadNextPage();
    }
  }, { rootMargin: '400px' });

  observer.observe(sentinel);

  function loadNextPage() {
    var nextPage = parseInt(sentinel.getAttribute('data-next-page'), 10);
    var totalPages = parseInt(sentinel.getAttribute('data-total-pages'), 10);
    if (nextPage > totalPages) {
      observer.disconnect();
      sentinel.remove();
      return;
    }

    loading = true;
    sentinel.classList.add('loading');

    fetch('/page-' + nextPage + '.html')
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var grid = document.querySelector('.more-grid');
        if (!grid) return;
        grid.insertAdjacentHTML('beforeend', html);
        sentinel.setAttribute('data-next-page', nextPage + 1);
        loading = false;
        sentinel.classList.remove('loading');

        if (nextPage + 1 > totalPages) {
          observer.disconnect();
          sentinel.remove();
        }
      })
      .catch(function () {
        loading = false;
        sentinel.classList.remove('loading');
      });
  }
})();
