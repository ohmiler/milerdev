import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags, users } from '@/lib/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// GET /api/admin/blog - List all blog posts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        thumbnailUrl: blogPosts.thumbnailUrl,
        status: blogPosts.status,
        authorName: users.name,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .orderBy(desc(blogPosts.createdAt));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST /api/admin/blog - Create blog post
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, slug: customSlug, excerpt, content, thumbnailUrl, status, tagIds } = body;

    if (!title) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อบทความ' }, { status: 400 });
    }

    const slug = (customSlug || title)
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);

    const postId = createId();
    const isPublished = status === 'published';

    await db.insert(blogPosts).values({
      id: postId,
      title,
      slug: slug || postId,
      excerpt: excerpt || null,
      content: content || null,
      thumbnailUrl: thumbnailUrl || null,
      status: status || 'draft',
      authorId: session.user.id,
      publishedAt: isPublished ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save tags
    if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
      await db.insert(blogPostTags).values(
        tagIds.map((tagId: string) => ({
          id: createId(),
          postId,
          tagId,
        }))
      );
    }

    return NextResponse.json(
      { message: 'สร้างบทความสำเร็จ', postId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating blog post:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
