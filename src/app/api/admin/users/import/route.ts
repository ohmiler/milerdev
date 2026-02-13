import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';

// POST /api/admin/users/import - Import users from CSV
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'กรุณาเลือกไฟล์' }, { status: 400 });
    }

    // Read CSV content
    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'ไฟล์ CSV ต้องมีข้อมูลอย่างน้อย 1 แถว' },
        { status: 400 }
      );
    }

    // Parse header
    const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
    const emailIndex = header.findIndex(h => h === 'email' || h === 'อีเมล');
    const nameIndex = header.findIndex(h => h === 'name' || h === 'ชื่อ');
    const roleIndex = header.findIndex(h => h === 'role' || h === 'บทบาท');
    const passwordIndex = header.findIndex(h => h === 'password' || h === 'รหัสผ่าน');

    if (emailIndex === -1) {
      return NextResponse.json(
        { error: 'ไม่พบคอลัมน์ email ในไฟล์ CSV' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      const email = row[emailIndex]?.trim().toLowerCase();

      if (!email || !email.includes('@')) {
        results.failed++;
        results.errors.push(`แถว ${i + 1}: อีเมลไม่ถูกต้อง`);
        continue;
      }

      // Check if email already exists
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        results.skipped++;
        continue;
      }

      // Parse data
      const name = nameIndex !== -1 ? row[nameIndex] : null;
      let role = roleIndex !== -1 ? row[roleIndex]?.toLowerCase() : 'student';
      
      // Validate role
      if (!['admin', 'instructor', 'student'].includes(role)) {
        role = 'student';
      }

      // Hash password if provided, otherwise generate random
      const password = passwordIndex !== -1 && row[passwordIndex] 
        ? row[passwordIndex] 
        : Math.random().toString(36).slice(-8);
      const passwordHash = await bcrypt.hash(password, 12);

      try {
        await db.insert(users).values({
          id: createId(),
          email,
          name: name || null,
          role: role as 'admin' | 'instructor' | 'student',
          passwordHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`แถว ${i + 1}: ไม่สามารถสร้างผู้ใช้ได้`);
      }
    }

    return NextResponse.json({
      message: 'นำเข้าข้อมูลเสร็จสิ้น',
      results,
    });
  } catch (error) {
    console.error('Error importing users:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' },
      { status: 500 }
    );
  }
}
