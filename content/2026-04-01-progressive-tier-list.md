---
title: 'Progressive Identity Tier List'
tags: [politics, culture]
layout: bare
description: 'Ranked by criticism immunity score.'
concern: [power]
image: '/img/tier-list.png'
---

<div style="position:fixed;top:12px;right:12px;z-index:9999;">
<button id="share-ig" style="background:#2a2a2a;color:#ddd;border:1px solid #444;border-radius:6px;padding:6px 14px;font-size:13px;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Story image</button>
</div>

<iframe src="https://tantaman.com/paste/49SiAMvYy0" style="width:100%;height:100vh;border:none;"></iframe>

<script>
document.getElementById('share-ig').onclick = async function() {
  const btn = this;
  const slug = '2026-04-01-progressive-tier-list';
  btn.textContent = 'Loading…';
  try {
    const resp = await fetch('https://tantaman.com/api/ig-card/' + slug);
    if (!resp.ok) throw new Error('Failed');
    const blob = await resp.blob();
    const file = new File([blob], slug + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = slug + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  } catch(e) {}
  btn.textContent = 'Story image';
};
</script>
