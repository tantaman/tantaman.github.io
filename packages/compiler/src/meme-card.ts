function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMemeCard({
  url,
  title,
  thesis,
  image,
}: {
  url: string;
  title: string;
  thesis: string;
  image: string | null;
}): string {
  const imgTag = image
    ? `<img src="${image}" alt="" class="meme-bg" />`
    : '';
  const noImageClass = image ? '' : ' no-image';

  return `
    <a class="meme-card${noImageClass}" href="${url}">
      ${imgTag}
      <div class="meme-overlay">
        <p class="meme-thesis">${thesis}</p>
        <span class="meme-title">${escapeHtml(title)} &rarr;</span>
      </div>
    </a>`;
}
