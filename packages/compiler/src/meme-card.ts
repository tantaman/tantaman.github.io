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
  sentimentColor,
}: {
  url: string;
  title: string;
  thesis: string;
  image: string | null;
  sentimentColor?: string;
}): string {
  const imgTag = image
    ? `<img src="${image}" alt="" class="meme-bg" loading="lazy" />`
    : '';
  const noImageClass = image ? '' : ' no-image';
  const inlineStyle =
    !image && sentimentColor ? ` style="background:${sentimentColor}"` : '';

  return `
    <a class="meme-card${noImageClass}"${inlineStyle} href="${url}">
      ${imgTag}
      <div class="meme-overlay">
        <p class="meme-thesis">${thesis}</p>
        <span class="meme-title">${escapeHtml(title)} &rarr;</span>
      </div>
    </a>`;
}
