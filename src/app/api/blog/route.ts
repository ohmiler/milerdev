import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { eq, desc, and, like, count, sql } from 'drizzle-orm';

// GET /api/blog - Get published blog posts with pagination
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const tagSlug = searchParams.get('tag') || 'all';
    const offset = (page - 1) * limit;

    const conditions = [eq(blogPosts.status, 'published')];

    if (search) {
      conditions.push(like(blogPosts.title, `%${search}%`));
    }

    if (tagSlug && tagSlug !== 'all') {
      conditions.push(
        sql`${blogPosts.id} IN (
          SELECT bpt.post_id FROM blog_post_tags bpt
          INNER JOIN tags t ON bpt.tag_id = t.id
          WHERE t.slug = ${tagSlug}
        )`
      );
    }

    const whereCondition = and(...conditions);

    const [postsResult, totalResult] = await Promise.all([
      db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          excerpt: blogPosts.excerpt,
          thumbnailUrl: blogPosts.thumbnailUrl,
          authorName: users.name,
          authorAvatarUrl: users.avatarUrl,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
        })
        .from(blogPosts)
        .leftJoin(users, eq(blogPosts.authorId, users.id))
        .where(whereCondition)
        .orderBy(desc(blogPosts.publishedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: count() })
        .from(blogPosts)
        .where(whereCondition),
    ]);

    const total = totalResult[0]?.total ?? 0;

    // Fetch tags for posts
    const postIds = postsResult.map(p => p.id);
    const allPostTags = postIds.length > 0
      ? await db
          .select({
            postId: blogPostTags.postId,
            tagId: tags.id,
            tagName: tags.name,
            tagSlug: tags.slug,
          })
          .from(blogPostTags)
          .innerJoin(tags, eq(blogPostTags.tagId, tags.id))
          .where(sql`${blogPostTags.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`)
      : [];

    const tagsByPost = new Map<string, { id: string; name: string; slug: string }[]>();
    for (const pt of allPostTags) {
      if (!tagsByPost.has(pt.postId)) tagsByPost.set(pt.postId, []);
      tagsByPost.get(pt.postId)!.push({ id: pt.tagId, name: pt.tagName, slug: pt.tagSlug });
    }

    const posts = postsResult.map(p => ({
      ...p,
      tags: tagsByPost.get(p.id) || [],
    }));

    return NextResponse.json({
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}
