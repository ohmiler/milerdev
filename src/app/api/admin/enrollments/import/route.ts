import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { enrollments, users, courses } from '@/lib/db/schema';
import { createId } from '@paralleldrive/cuid2';

// POST /api/admin/enrollments/import - Import enrollments from LearnDash CSV
export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin();
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'กรุณาอัปโหลดไฟล์ CSV' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: 'ไฟล์ CSV ไม่มีข้อมูล' }, { status: 400 });
    }

    // Parse CSV header
    const header = parseCSVLine(lines[0]);
    const emailIdx = header.findIndex(h => h.toLowerCase().includes('email'));
    const courseIdx = header.findIndex(h => h.toLowerCase().includes('course_title'));
    const startedIdx = header.findIndex(h => h.toLowerCase().includes('activity_started'));
    const completedIdx = header.findIndex(h => h.toLowerCase().includes('activity_completed'));
    const statusIdx = header.findIndex(h => h.toLowerCase().includes('activity_status'));
    const accessFromIdx = header.findIndex(h => h.toLowerCase().includes('access_from'));

    if (emailIdx === -1 || courseIdx === -1) {
      return NextResponse.json(
        { error: 'CSV ต้องมีคอลัมน์ user_email และ course_title' },
        { status: 400 }
      );
    }

    // Pre-fetch all users and courses for matching
    const [allUsers, allCourses] = await Promise.all([
      db.select({ id: users.id, email: users.email }).from(users),
      db.select({ id: courses.id, title: courses.title }).from(courses),
    ]);

    // Build lookup maps (case-insensitive)
    const userMap = new Map<string, string>();
    for (const u of allUsers) {
      userMap.set(u.email.toLowerCase(), u.id);
    }

    const courseMap = new Map<string, string>();
    const courseTitles: { id: string; title: string; titleLower: string }[] = [];
    for (const c of allCourses) {
      const titleLower = c.title.toLowerCase().trim();
      courseMap.set(titleLower, c.id);
      courseTitles.push({ id: c.id, title: c.title, titleLower });
    }

    // Fuzzy match cache for renamed courses
    const fuzzyCache = new Map<string, string | null>();
    const matchedAliases: string[] = [];

    function findCourseId(title: string): string | undefined {
      const lower = title.toLowerCase().trim();
      // Exact match first
      const exact = courseMap.get(lower);
      if (exact) return exact;

      // Check fuzzy cache
      if (fuzzyCache.has(lower)) {
        const cached = fuzzyCache.get(lower);
        return cached ?? undefined;
      }

      // Fuzzy: substring match (old name in new, or new name in old)
      for (const c of courseTitles) {
        if (c.titleLower.includes(lower) || lower.includes(c.titleLower)) {
          fuzzyCache.set(lower, c.id);
          matchedAliases.push(`"${title}" → "${c.title}"`);
          return c.id;
        }
      }

      fuzzyCache.set(lower, null);
      return undefined;
    }

    // Pre-fetch existing enrollments to avoid duplicates
    const existingEnrollments = await db
      .select({ userId: enrollments.userId, courseId: enrollments.courseId })
      .from(enrollments);

    const existingSet = new Set(
      existingEnrollments.map(e => `${e.userId}:${e.courseId}`)
    );

    // Process rows
    let success = 0;
    let skipped = 0;
    let userNotFound = 0;
    let courseNotFound = 0;
    const errors: string[] = [];
    const missingUsers = new Set<string>();
    const missingCourses = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < Math.max(emailIdx, courseIdx) + 1) continue;

      const email = cols[emailIdx].trim().toLowerCase();
      const courseTitle = cols[courseIdx].trim();
      const activityStarted = startedIdx !== -1 ? cols[startedIdx]?.trim() : undefined;
      const activityCompleted = completedIdx !== -1 ? cols[completedIdx]?.trim() : undefined;
      const activityStatus = statusIdx !== -1 ? cols[statusIdx]?.trim() : undefined;
      const accessFrom = accessFromIdx !== -1 ? cols[accessFromIdx]?.trim() : undefined;

      if (!email || !courseTitle) continue;

      // Match user
      const userId = userMap.get(email);
      if (!userId) {
        if (!missingUsers.has(email)) {
          missingUsers.add(email);
          userNotFound++;
        }
        skipped++;
        continue;
      }

      // Match course (exact + fuzzy)
      const courseId = findCourseId(courseTitle);
      if (!courseId) {
        if (!missingCourses.has(courseTitle)) {
          missingCourses.add(courseTitle);
          courseNotFound++;
        }
        skipped++;
        continue;
      }

      // Check duplicate
      const key = `${userId}:${courseId}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }

      // Calculate enrollment data - support both formats
      const timestampRaw = accessFrom || activityStarted;
      const enrolledAt = timestampRaw && timestampRaw !== '0' && timestampRaw !== 'NULL'
        ? new Date(parseInt(timestampRaw) * 1000)
        : new Date();

      const completedAt = activityCompleted && activityCompleted !== '0' && activityCompleted !== 'NULL'
        ? new Date(parseInt(activityCompleted) * 1000)
        : null;

      const isCompleted = activityStatus === '1';
      const progressPercent = isCompleted ? 100 : 0;

      try {
        await db.insert(enrollments).values({
          id: createId(),
          userId,
          courseId,
          enrolledAt,
          progressPercent,
          completedAt: completedAt || (isCompleted ? new Date() : null),
        });
        existingSet.add(key);
        success++;
      } catch (err) {
        errors.push(`แถว ${i + 1}: ${email} - ${courseTitle}: ${String(err)}`);
      }
    }

    return NextResponse.json({
      message: 'นำเข้าข้อมูลสำเร็จ',
      results: {
        success,
        skipped,
        userNotFound,
        courseNotFound,
        errors: errors.slice(0, 10),
        missingUsers: Array.from(missingUsers).slice(0, 20),
        missingCourses: Array.from(missingCourses),
        matchedAliases,
        total: lines.length - 1,
      },
    });
  } catch (error) {
    console.error('Error importing enrollments:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการนำเข้า' },
      { status: 500 }
    );
  }
}

// Simple CSV line parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
