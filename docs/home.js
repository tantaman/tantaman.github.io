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
})();
