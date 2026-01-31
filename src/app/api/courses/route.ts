import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, users, lessons } from "@/lib/db/schema";
import { eq, desc, asc, and, count, like, gt } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// GET /api/courses - Get all published courses with filters and pagination
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");
        const search = searchParams.get("search") || "";
        const priceFilter = searchParams.get("price") || "all";
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

        // Parallelize courses query and total count query (async-parallel rule)
        const whereCondition = and(...conditions);
        
        const [allCourses, totalResult] = await Promise.all([
            db
                .select()
                .from(courses)
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

        // Get instructor and lesson count for each course
        // Parallelize both queries inside map (async-parallel rule)
        const formattedCourses = await Promise.all(
            allCourses.map(async (course) => {
                // Parallelize instructor and lesson count queries
                const [instructorResult, lessonCountResult] = await Promise.all([
                    course.instructorId
                        ? db
                            .select({
                                id: users.id,
                                name: users.name,
                                avatarUrl: users.avatarUrl,
                            })
                            .from(users)
                            .where(eq(users.id, course.instructorId))
                            .limit(1)
                        : Promise.resolve([]),
                    db
                        .select({ count: count() })
                        .from(lessons)
                        .where(eq(lessons.courseId, course.id)),
                ]);

                return {
                    ...course,
                    instructor: instructorResult[0] || null,
                    lessonCount: lessonCountResult[0]?.count || 0,
                };
            })
        );

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
