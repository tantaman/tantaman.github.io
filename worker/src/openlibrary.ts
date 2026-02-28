export interface BookMetadata {
  title: string;
  coverUrl: string;
  author: string;
  year: string;
  olKey: string;
}

export async function fetchBookByKey(
  editionKey: string,
): Promise<BookMetadata | null> {
  try {
    const res = await fetch(`https://openlibrary.org/books/${editionKey}.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string;
      covers?: number[];
      authors?: Array<{ key?: string }>;
      works?: Array<{ key?: string }>;
      publish_date?: string;
    };
    if (!data.covers?.[0]) return null;
    const coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;

    let author = "";
    const authorKey = data.authors?.[0]?.key;
    if (authorKey) {
      try {
        const authorRes = await fetch(`https://openlibrary.org${authorKey}.json`);
        if (authorRes.ok) {
          const authorData = (await authorRes.json()) as { name?: string };
          author = authorData.name ?? "";
        }
      } catch {
        // ignore author fetch failure
      }
    }

    const yearMatch = data.publish_date?.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : "";
    const olKey = data.works?.[0]?.key ?? "";

    return {
      title: data.title ?? editionKey,
      coverUrl,
      author,
      year,
      olKey,
    };
  } catch {
    return null;
  }
}

export async function lookupBook(
  title: string,
): Promise<BookMetadata | null> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      docs?: Array<{
        key?: string;
        title?: string;
        author_name?: string[];
        first_publish_year?: number;
        cover_i?: number;
      }>;
    };
    const result = data.docs?.[0];
    if (!result || !result.cover_i) return null;
    const coverUrl = `https://covers.openlibrary.org/b/id/${result.cover_i}-M.jpg`;
    const year = result.first_publish_year ? String(result.first_publish_year) : "";
    return {
      title: result.title ?? title,
      coverUrl,
      author: result.author_name?.[0] ?? "",
      year,
      olKey: result.key ?? "",
    };
  } catch {
    return null;
  }
}
