import rss from '@astrojs/rss';
import { getAllBlogPosts, getCleanSlug } from '../lib/blog';

export async function GET(context: { site: URL }) {
  const posts = await getAllBlogPosts();

  return rss({
    title: 'Workouse Engineering Journal',
    description: 'Technical insights, system architecture patterns, and production engineering practices from Workouse.',
    site: context.site || 'https://workouse.com',
    items: posts.map((post) => {
      const cleanSlug = getCleanSlug(post.slug);
      const link = post.data.lang === 'tr' ? `/blog/tr/${cleanSlug}` : `/blog/${cleanSlug}`;

      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: link,
        author: post.data.author,
      };
    }),
    customData: `<language>en-us</language>`,
  });
}
