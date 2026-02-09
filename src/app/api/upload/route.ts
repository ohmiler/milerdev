import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";

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
        const folder = (formData.get("folder") as string) || "courses";

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

        const storageApiKey = process.env.BUNNY_STORAGE_API_KEY;
        const storageZone = process.env.BUNNY_STORAGE_ZONE;
        const storageRegion = process.env.BUNNY_STORAGE_REGION || "";
        const cdnUrl = process.env.BUNNY_CDN_URL;

        if (!storageApiKey || !storageZone || !cdnUrl) {
            console.error("[Upload] Missing Bunny Storage env vars");
            return NextResponse.json(
                { error: "ระบบอัปโหลดยังไม่ได้ตั้งค่า" },
                { status: 500 }
            );
        }

        // Generate unique filename
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${createId()}.${ext}`;
        const filePath = `${folder}/${fileName}`;

        // Determine storage host based on region
        const regionHost = storageRegion
            ? `${storageRegion}.storage.bunnycdn.com`
            : "storage.bunnycdn.com";

        // Upload to Bunny Storage
        const fileBuffer = await file.arrayBuffer();
        const uploadResponse = await fetch(
            `https://${regionHost}/${storageZone}/${filePath}`,
            {
                method: "PUT",
                headers: {
                    AccessKey: storageApiKey,
                    "Content-Type": "application/octet-stream",
                },
                body: fileBuffer,
            }
        );

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("[Upload] Bunny Storage error:", errorText);
            return NextResponse.json(
                { error: "อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่" },
                { status: 500 }
            );
        }

        // Return CDN URL
        const imageUrl = `${cdnUrl}/${filePath}`;

        return NextResponse.json({
            success: true,
            url: imageUrl,
            fileName,
        });
    } catch (error) {
        console.error("[Upload] Error:", error);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 }
        );
    }
}
