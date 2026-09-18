import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;
export type SupportedLang = 'en' | 'tr';

/**
 * Get all non-draft blog posts sorted by publish date (newest first).
 */
export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', (entry) => {
    return import.meta.env.PROD ? !entry.data.draft : true;
  });

  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/**
 * Get blog posts filtered by target language ('en' | 'tr').
 * Strips the language folder prefix ('en/' or 'tr/') to get a clean base slug.
 */
export async function getPostsByLang(lang: SupportedLang): Promise<BlogPost[]> {
  const allPosts = await getAllBlogPosts();
  return allPosts.filter((post) => {
    const isLangFolder = post.slug.startsWith(`${lang}/`);
    return isLangFolder || post.data.lang === lang;
  });
}

/**
 * Clean slug without language prefix (e.g. 'en/hello-world' -> 'hello-world')
 */
export function getCleanSlug(slug: string): string {
  return slug.replace(/^(en|tr)\//, '');
}

/**
 * Find corresponding translation for a post if available.
 */
export async function getPostTranslation(
  currentPost: BlogPost,
  targetLang: SupportedLang
): Promise<BlogPost | undefined> {
  const cleanSlug = getCleanSlug(currentPost.slug);
  const targetPosts = await getPostsByLang(targetLang);
  
  return targetPosts.find((post) => getCleanSlug(post.slug) === cleanSlug);
}

/**
 * Calculate reading time in minutes based on word count.
 */
export function calculateReadTime(content: string, wpm = 200): number {
  const cleanText = content.replace(/<[^>]*>/g, '').replace(/```[\s\S]*?```/g, '');
  const wordCount = cleanText.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wpm));
}

/**
 * Get latest non-draft blog posts for a given language, limited by count.
 */
export async function getLatestPosts(lang: SupportedLang = 'en', limit = 3): Promise<BlogPost[]> {
  const posts = await getPostsByLang(lang);
  return posts.slice(0, limit);
}

/**
 * Get featured or latest blog posts for a given language.
 * Prioritizes posts with `featured: true`, then sorts by publish date desc.
 */
export async function getFeaturedOrLatestPosts(lang: SupportedLang = 'en', limit = 3): Promise<BlogPost[]> {
  const posts = await getPostsByLang(lang);

  const sorted = [...posts].sort((a, b) => {
    const aFeatured = a.data.featured ? 1 : 0;
    const bFeatured = b.data.featured ? 1 : 0;
    if (aFeatured !== bFeatured) {
      return bFeatured - aFeatured;
    }
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });

  return sorted.slice(0, limit);
}

