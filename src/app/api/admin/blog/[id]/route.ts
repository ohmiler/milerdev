import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { blogPosts, blogPostTags, tags } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logAudit } from '@/lib/auditLog';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/blog/[id] - Get single blog post
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 });
    }

    const postTags = await db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(blogPostTags)
      .innerJoin(tags, eq(blogPostTags.tagId, tags.id))
      .where(eq(blogPostTags.postId, id));

    return NextResponse.json({ post, tags: postTags });
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด' }, { status: 500 });
  }
}

// PUT /api/admin/blog/[id] - Update blog post
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, slug, excerpt, content, thumbnailUrl, status, tagIds } = body;

    const [existing] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 });
    }

    // If publishing for the first time, set publishedAt
    const isNewlyPublished = status === 'published' && existing.status !== 'published';

    await db
      .update(blogPosts)
      .set({
        title: title || existing.title,
        slug: slug || existing.slug,
        excerpt: excerpt !== undefined ? excerpt : existing.excerpt,
        content: content !== undefined ? content : existing.content,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : existing.thumbnailUrl,
        status: status || existing.status,
        publishedAt: isNewlyPublished ? new Date() : existing.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id));

    // Update tags if provided
    if (tagIds !== undefined && Array.isArray(tagIds)) {
      await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
      if (tagIds.length > 0) {
        await db.insert(blogPostTags).values(
          tagIds.map((tagId: string) => ({
            id: createId(),
            postId: id,
            tagId,
          }))
        );
      }
    }

    await logAudit({ userId: session.user.id, action: 'update', entityType: 'blog', entityId: id, newValue: title || existing.title });

    return NextResponse.json({ message: 'อัพเดทบทความสำเร็จ' });
  } catch (error) {
    console.error('Error updating blog post:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}

// DELETE /api/admin/blog/[id] - Delete blog post
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'ไม่พบบทความ' }, { status: 404 });
    }

    await db.delete(blogPostTags).where(eq(blogPostTags.postId, id));
    await db.delete(blogPosts).where(eq(blogPosts.id, id));

    await logAudit({ userId: session.user.id, action: 'delete', entityType: 'blog', entityId: id, oldValue: existing.title });

    return NextResponse.json({ message: 'ลบบทความสำเร็จ' });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, { status: 500 });
  }
}
