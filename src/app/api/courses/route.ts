import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments } from "@/lib/db/schema";
import { eq, desc, and, count } from "drizzle-orm";

// GET /api/courses - Get all published courses
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");
        const offset = (page - 1) * limit;

        const allCourses = await db.query.courses.findMany({
            where: eq(courses.status, "published"),
            with: {
                instructor: {
                    columns: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
                lessons: {
                    columns: {
                        id: true,
                    },
                },
            },
            orderBy: [desc(courses.createdAt)],
            limit,
            offset,
        });

        // Get total count
        const [{ total }] = await db
            .select({ total: count() })
            .from(courses)
            .where(eq(courses.status, "published"));

        // Format response
        const formattedCourses = allCourses.map((course) => ({
            ...course,
            lessonCount: course.lessons.length,
            lessons: undefined,
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

        const [newCourse] = await db
            .insert(courses)
            .values({
                title,
                slug,
                description,
                price: parseFloat(price) || 0,
                thumbnailUrl,
                instructorId: session.user.id,
                status: "draft",
            })
            .returning();

        return NextResponse.json(newCourse, { status: 201 });
    } catch (error) {
        console.error("Error creating course:", error);
        return NextResponse.json(
            { error: "Failed to create course" },
            { status: 500 }
        );
    }
}
