import { NextResponse } from 'next/server';
import { logError } from '@/lib/error-handler';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, users } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';

// GET /api/admin/blog - List all blog posts
export async function GET(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
    const offset = (page - 1) * limit;

    const [posts, [{ total }]] = await Promise.all([
      db
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
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(blogPosts),
    ]);

    return NextResponse.json({
      posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error fetching blog posts:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// POST /api/admin/blog - Create blog post
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

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

    await logAudit({ userId: session.user.id, action: 'create', entityType: 'blog', entityId: postId, newValue: title });

    return NextResponse.json(
      { message: 'สร้างบทความสำเร็จ', postId },
      { status: 201 }
    );
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { action: 'Error creating blog post:' });
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
