import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import { uploadToBunny } from "@/lib/bunny-storage";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user || session.user.role !== "admin") {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const rawFolder = (formData.get("folder") as string) || "courses";
        // Sanitize folder: allow only alphanumeric, hyphens, underscores (prevent path traversal)
        const folder = rawFolder.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) || "courses";

        if (!file) {
            return NextResponse.json(
                { error: "ไม่พบไฟล์" },
                { status: 400 }
            );
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "รองรับเฉพาะไฟล์ JPG, PNG, WEBP, GIF" },
                { status: 400 }
            );
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: "ไฟล์ต้องมีขนาดไม่เกิน 10MB" },
                { status: 400 }
            );
        }

        // Upload to Bunny CDN
        const { url, fileName } = await uploadToBunny(file, folder);

        // Save to media table for tracking
        const mediaId = createId();
        await db.insert(media).values({
            id: mediaId,
            filename: fileName,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            url,
            type: 'image',
            uploadedBy: session.user.id,
        });

        return NextResponse.json({
            success: true,
            url,
            fileName,
            mediaId,
        });
    } catch (error) {
        console.error("[Upload] Error:", error);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 }
        );
    }
}
