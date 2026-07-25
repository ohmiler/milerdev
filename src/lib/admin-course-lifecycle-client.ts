import type {
  CourseLifecycleAction,
  CourseStatus,
  PublishedBundleReference,
} from '@/lib/course-lifecycle';

type LifecycleResponse = {
  error?: string;
  code?: string;
  blockingBundles?: PublishedBundleReference[];
  course?: { id?: string; status?: CourseStatus };
};

type TransitionResult =
  | {
    ok: true;
    course: { id: string; status: CourseStatus };
  }
  | {
    ok: false;
    code: string;
    message: string;
  };

const courseStatuses: CourseStatus[] = ['draft', 'published', 'archived'];

export async function transitionAdminCourse({
  courseId,
  action,
  expectedStatus,
  request = fetch,
}: {
  courseId: string;
  action: CourseLifecycleAction;
  expectedStatus: CourseStatus;
  request?: typeof fetch;
}): Promise<TransitionResult> {
  try {
    const response = await request(`/api/admin/courses/${courseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, expectedStatus }),
    });
    const data = await response.json() as LifecycleResponse;

    if (!response.ok) {
      const bundleDetails = data.code === 'PUBLISHED_BUNDLE_DEPENDENCY'
        ? (data.blockingBundles ?? []).map((bundle) => bundle.title).join(', ')
        : '';
      return {
        ok: false,
        code: data.code || 'REQUEST_FAILED',
        message: bundleDetails
          ? `${data.error || 'ไม่สามารถเปลี่ยนสถานะคอร์สได้'}: ${bundleDetails}`
          : data.error || 'เปลี่ยนสถานะคอร์สไม่สำเร็จ',
      };
    }

    if (
      data.course?.id !== courseId
      || !data.course.status
      || !courseStatuses.includes(data.course.status)
    ) {
      return {
        ok: false,
        code: 'INVALID_RESPONSE',
        message: 'เซิร์ฟเวอร์ส่งสถานะคอร์สที่ไม่ถูกต้อง กรุณาโหลดหน้าใหม่',
      };
    }

    return {
      ok: true,
      course: { id: courseId, status: data.course.status },
    };
  } catch {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ กรุณาลองใหม่',
    };
  }
}
