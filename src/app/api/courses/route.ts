import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, users, lessons, courseTags, tags } from "@/lib/db/schema";
import { eq, desc, asc, and, count, like, gt, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// GET /api/courses - Get all published courses with filters and pagination
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");
        const search = searchParams.get("search") || "";
        const priceFilter = searchParams.get("price") || "all";
        const tagSlug = searchParams.get("tag") || "all";
        const sort = searchParams.get("sort") || "newest";
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [eq(courses.status, "published")];
        
        if (search) {
            conditions.push(like(courses.title, `%${search}%`));
        }

        if (priceFilter === "free") {
            conditions.push(eq(courses.price, "0"));
        } else if (priceFilter === "paid") {
            conditions.push(gt(courses.price, "0"));
        }

        if (tagSlug && tagSlug !== "all") {
            conditions.push(
                sql`${courses.id} IN (
                    SELECT ct.course_id FROM course_tags ct
                    INNER JOIN tags t ON ct.tag_id = t.id
                    WHERE t.slug = ${tagSlug}
                )`
            );
        }

        // Build order
        let orderBy;
        switch (sort) {
            case "oldest":
                orderBy = asc(courses.createdAt);
                break;
            case "price-low":
                orderBy = asc(courses.price);
                break;
            case "price-high":
                orderBy = desc(courses.price);
                break;
            default:
                orderBy = desc(courses.createdAt);
        }

        const whereCondition = and(...conditions);

        // Single query with LEFT JOIN for instructor + subquery for lesson count
        const lessonCountSq = db
            .select({
                courseId: lessons.courseId,
                lessonCount: count().as('lesson_count'),
            })
            .from(lessons)
            .groupBy(lessons.courseId)
            .as('lc');

        const [coursesWithDetails, totalResult] = await Promise.all([
            db
                .select({
                    id: courses.id,
                    title: courses.title,
                    slug: courses.slug,
                    description: courses.description,
                    thumbnailUrl: courses.thumbnailUrl,
                    price: courses.price,
                    status: courses.status,
                    instructorId: courses.instructorId,
                    createdAt: courses.createdAt,
                    updatedAt: courses.updatedAt,
                    instructorName: users.name,
                    instructorAvatarUrl: users.avatarUrl,
                    lessonCount: sql<number>`COALESCE(${lessonCountSq.lessonCount}, 0)`.as('lesson_count'),
                })
                .from(courses)
                .leftJoin(users, eq(courses.instructorId, users.id))
                .leftJoin(lessonCountSq, eq(courses.id, lessonCountSq.courseId))
                .where(whereCondition)
                .orderBy(orderBy)
                .limit(limit)
                .offset(offset),
            db
                .select({ total: count() })
                .from(courses)
                .where(whereCondition),
        ]);

        const total = totalResult[0]?.total ?? 0;

        // Fetch tags for all courses in one query
        const courseIds = coursesWithDetails.map(c => c.id);
        const allCourseTags = courseIds.length > 0
            ? await db
                .select({
                    courseId: courseTags.courseId,
                    tagId: tags.id,
                    tagName: tags.name,
                    tagSlug: tags.slug,
                })
                .from(courseTags)
                .innerJoin(tags, eq(courseTags.tagId, tags.id))
                .where(sql`${courseTags.courseId} IN (${sql.join(courseIds.map(id => sql`${id}`), sql`, `)})`)
            : [];

        // Group tags by courseId
        const tagsByCourse = new Map<string, { id: string; name: string; slug: string }[]>();
        for (const ct of allCourseTags) {
            if (!tagsByCourse.has(ct.courseId)) tagsByCourse.set(ct.courseId, []);
            tagsByCourse.get(ct.courseId)!.push({ id: ct.tagId, name: ct.tagName, slug: ct.tagSlug });
        }

        // Format response
        const formattedCourses = coursesWithDetails.map((row) => ({
            id: row.id,
            title: row.title,
            slug: row.slug,
            description: row.description,
            thumbnailUrl: row.thumbnailUrl,
            price: row.price,
            status: row.status,
            instructorId: row.instructorId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            instructor: row.instructorId
                ? { id: row.instructorId, name: row.instructorName, avatarUrl: row.instructorAvatarUrl }
                : null,
            lessonCount: Number(row.lessonCount) || 0,
            tags: tagsByCourse.get(row.id) || [],
        }));

        return NextResponse.json({
            courses: formattedCourses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json(
            { error: "Failed to fetch courses" },
            { status: 500 }
        );
    }
}

// POST /api/courses - Create new course (Admin/Instructor only)
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["admin", "instructor"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { title, description, price, thumbnailUrl } = body;

        // Generate slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9ก-๙]+/g, "-")
            .replace(/^-|-$/g, "");

        // Generate ID manually (MySQL doesn't support .returning())
        const courseId = createId();
        
        await db
            .insert(courses)
            .values({
                id: courseId,
                title,
                slug,
                description,
                price: String(parseFloat(price) || 0),
                thumbnailUrl,
                instructorId: session.user.id,
                status: "draft",
            });

        // Fetch the created course
        const [newCourse] = await db
            .select()
            .from(courses)
            .where(eq(courses.id, courseId))
            .limit(1);

        return NextResponse.json(newCourse, { status: 201 });
    } catch (error) {
        console.error("Error creating course:", error);
        return NextResponse.json(
            { error: "Failed to create course" },
            { status: 500 }
        );
    }
}
