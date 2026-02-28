export interface BookMetadata {
  title: string;
  coverUrl: string;
  author: string;
  year: string;
  olKey: string;
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
