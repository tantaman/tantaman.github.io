document.addEventListener('DOMContentLoaded', function () {
  var nav = document.querySelector('nav.toc');
  if (!nav) return;

  nav.style.display = 'none';

  var widget = document.createElement('div');
  widget.className = 'toc-widget';

  // Build minimap
  var minimap = document.createElement('div');
  minimap.className = 'toc-minimap';

  var items = nav.querySelectorAll('.toc-item');
  items.forEach(function (item) {
    var dash = document.createElement('div');
    dash.className = 'toc-dash';
    dash.style.width = '20px';
    minimap.appendChild(dash);
  });

  // Build panel
  var panel = document.createElement('div');
  panel.className = 'toc-panel';

  var title = document.createElement('div');
  title.className = 'toc-panel-title';
  title.textContent = 'CONTENTS';
  panel.appendChild(title);

  var list = nav.querySelector('ol');
  if (list) {
    var cloned = list.cloneNode(true);
    panel.appendChild(cloned);
  }

  widget.appendChild(minimap);
  widget.appendChild(panel);

  minimap.addEventListener('click', function (e) {
    e.stopPropagation();
    widget.classList.add('toc-widget-open');
  });

  panel.addEventListener('click', function (e) {
    // If a link was clicked, let it navigate, then close
    if (e.target.tagName === 'A') {
      widget.classList.remove('toc-widget-open');
      return;
    }
    e.stopPropagation();
    widget.classList.remove('toc-widget-open');
  });

  document.body.appendChild(widget);
});
