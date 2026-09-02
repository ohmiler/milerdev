import 'server-only';

import {
  selectContinuationLesson,
  type ContinuationProgress,
} from '@/lib/learning-continuation';

export type LearningPresentationSource = {
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
  };
  enrollment: {
    enrolledAt: Date | null;
    completedAt: Date | null;
  };
  lessons: Array<{
    id: string;
    title: string;
    orderIndex: number;
  }>;
  progress: ContinuationProgress[];
  certificate: {
    revokedAt: Date | null;
  } | null;
};

type CoursePresentation = Omit<LearningPresentationSource['course'], 'id'>;

export type LearningPresentation = {
  enrollment: 'none' | 'active' | 'completed';
  course: CoursePresentation | null;
  progress: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
  };
  continuation: 'start' | 'resume' | 'review' | 'none';
  certificate: 'not_eligible' | 'missing' | 'active' | 'revoked';
  status: {
    label: string;
    description: string;
  };
  action: {
    kind: 'view-catalog' | 'view-course' | 'start' | 'resume' | 'review' | 'view-certificates';
    label: string;
    href: string;
  };
};

const NO_ENROLLMENT: LearningPresentation = {
  enrollment: 'none',
  course: null,
  progress: {
    completedLessons: 0,
    totalLessons: 0,
    percent: 0,
  },
  continuation: 'none',
  certificate: 'not_eligible',
  status: {
    label: 'ยังไม่มีคอร์สในการเรียนของฉัน',
    description: 'เลือกดูรายละเอียดและบทเรียนของแต่ละคอร์สก่อนเริ่มเส้นทางแรก',
  },
  action: {
    kind: 'view-catalog',
    label: 'ดูคอร์สทั้งหมด',
    href: '/courses',
  },
};

export function deriveLearningPresentation(
  source: LearningPresentationSource | null,
): LearningPresentation {
  if (!source) return NO_ENROLLMENT;

  const course: CoursePresentation = {
    title: source.course.title,
    slug: source.course.slug,
    thumbnailUrl: source.course.thumbnailUrl,
  };
  const lessonIds = new Set(source.lessons.map((lesson) => lesson.id));
  const relevantProgress = source.progress.filter((item) => lessonIds.has(item.lessonId));
  const totalLessons = source.lessons.length;
  const completedLessons = new Set(
    relevantProgress.filter((item) => item.completed).map((item) => item.lessonId),
  ).size;
  const percent = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;
  const courseHref = `/courses/${source.course.slug}`;
  const certificate = source.certificate
    ? source.certificate.revokedAt ? 'revoked' : 'active'
    : source.enrollment.completedAt ? 'missing' : 'not_eligible';

  if (source.enrollment.completedAt) {
    const label = certificate === 'active'
      ? 'เรียนจบแล้ว · ใบรับรองพร้อม'
      : certificate === 'revoked'
        ? 'เรียนจบแล้ว · ใบรับรองถูกเพิกถอน'
        : 'เรียนจบแล้ว · ยังไม่พบใบรับรอง';
    const description = certificate === 'active'
      ? 'การเรียนจบและใบรับรองที่ยังมีผลถูกบันทึกแยกกันเรียบร้อยแล้ว'
      : certificate === 'revoked'
        ? 'การเรียนจบยังคงอยู่ แต่ใบรับรองรายการนี้ถูกเพิกถอนแล้ว'
        : 'การเรียนจบถูกบันทึกแล้ว แต่ยังไม่พบใบรับรองในบัญชี';
    const actionLabel = certificate === 'active'
      ? 'ดูและแชร์ใบรับรอง'
      : certificate === 'revoked'
        ? 'ดูสถานะใบรับรอง'
        : 'ตรวจสอบสถานะใบรับรอง';

    return {
      enrollment: 'completed',
      course,
      progress: { completedLessons, totalLessons, percent },
      continuation: 'review',
      certificate,
      status: { label, description },
      action: {
        kind: 'view-certificates',
        label: actionLabel,
        href: '/dashboard/certificates',
      },
    };
  }

  if (totalLessons === 0) {
    return {
      enrollment: 'active',
      course,
      progress: { completedLessons, totalLessons, percent },
      continuation: 'none',
      certificate,
      status: {
        label: 'คอร์สนี้ยังไม่มีบทเรียนที่เปิดให้เรียน',
        description: 'สิทธิ์เรียนยังอยู่ในบัญชี แต่ยังไม่มีบทเรียนให้เริ่มในตอนนี้',
      },
      action: { kind: 'view-course', label: 'ดูรายละเอียดคอร์ส', href: courseHref },
    };
  }

  if (completedLessons === totalLessons && !source.enrollment.completedAt) {
    return {
      enrollment: 'active',
      course,
      progress: { completedLessons, totalLessons, percent },
      continuation: 'review',
      certificate,
      status: {
        label: 'เรียนครบแล้ว · กำลังยืนยันการจบ',
        description: 'ความคืบหน้าครบทุกบทแล้ว แต่ระบบยังไม่บันทึกการเรียนจบอย่างเป็นทางการ',
      },
      action: {
        kind: 'review',
        label: 'เปิดคอร์สเพื่อตรวจสถานะ',
        href: `${courseHref}/learn`,
      },
    };
  }

  const continuationLesson = selectContinuationLesson(source.lessons, relevantProgress);
  const hasLearningActivity = relevantProgress.some((item) => (
    item.completed === true
    || (item.watchTimeSeconds ?? 0) > 0
    || Boolean(item.lastWatchedAt)
  ));
  const continuation = hasLearningActivity ? 'resume' : 'start';

  return {
    enrollment: 'active',
    course,
    progress: { completedLessons, totalLessons, percent },
    continuation,
    certificate,
    status: {
      label: hasLearningActivity
        ? `กำลังเรียน · ${completedLessons}/${totalLessons} บท`
        : 'พร้อมเริ่มเรียน',
      description: hasLearningActivity
        ? `เรียนจบแล้ว ${completedLessons} จาก ${totalLessons} บท สามารถกลับมาเรียนต่อได้`
        : 'สิทธิ์เรียนพร้อมแล้ว เริ่มจากบทแรกได้ทันที',
    },
    action: continuationLesson
      ? {
          kind: continuation,
          label: continuation === 'start'
            ? 'เริ่มบทแรก'
            : `เรียนต่อ: ${source.lessons.find((lesson) => lesson.id === continuationLesson.id)?.title ?? source.course.title}`,
          href: `${courseHref}/learn`,
        }
      : { kind: 'view-course', label: 'ดูรายละเอียดคอร์ส', href: courseHref },
  };
}
