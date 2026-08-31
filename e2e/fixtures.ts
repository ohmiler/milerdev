type UserFixture = {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'instructor';
};

type CourseFixture = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: `${number}.${number}`;
};

type PaymentFixture = {
  id: string;
  userId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amount: `${number}.${number}`;
};

export const E2E_FIXTURES = {
  users: {
    instructor: {
      id: 'e2e-user-instructor',
      email: 'e2e-instructor@local.test',
      name: 'ผู้สอน E2E',
      role: 'instructor',
    },
    member: {
      id: 'e2e-user-member',
      email: 'e2e-member@local.test',
      name: 'สมาชิก E2E',
      role: 'student',
    },
    learner: {
      id: 'e2e-user-learner',
      email: 'e2e-learner@local.test',
      name: 'ผู้เรียน E2E',
      role: 'student',
    },
    emptyMember: {
      id: 'e2e-user-empty-member',
      email: 'e2e-empty-member@local.test',
      name: 'สมาชิกไม่มีข้อมูล E2E',
      role: 'student',
    },
  } satisfies Record<string, UserFixture>,
  buyers: {
    pending: {
      id: 'e2e-buyer-pending',
      email: 'e2e-buyer-pending@local.test',
      name: 'ผู้ซื้อสถานะรอชำระ E2E',
      role: 'student',
    },
    completed: {
      id: 'e2e-buyer-completed',
      email: 'e2e-buyer-completed@local.test',
      name: 'ผู้ซื้อสถานะสำเร็จ E2E',
      role: 'student',
    },
    failed: {
      id: 'e2e-buyer-failed',
      email: 'e2e-buyer-failed@local.test',
      name: 'ผู้ซื้อสถานะล้มเหลว E2E',
      role: 'student',
    },
    refunded: {
      id: 'e2e-buyer-refunded',
      email: 'e2e-buyer-refunded@local.test',
      name: 'ผู้ซื้อสถานะคืนเงิน E2E',
      role: 'student',
    },
  } satisfies Record<string, UserFixture>,
  courses: {
    paid: {
      id: 'e2e-course-paid',
      title: 'คอร์สชำระเงินสำหรับเส้นทาง E2E',
      slug: 'e2e-paid-course',
      description: '<p>คอร์ส published ที่ใช้ยืนยันเส้นทางจากหน้าสินค้าไปยังการเข้าสู่ระบบ</p>',
      price: '1490.00',
    },
    free: {
      id: 'e2e-course-free',
      title: 'คอร์สฟรีสำหรับเส้นทาง E2E',
      slug: 'e2e-free-course',
      description: '<p>คอร์สฟรีที่มีบทเรียนทดลองและลงทะเบียนเรียนได้</p>',
      price: '0.00',
    },
    certificateMissing: {
      id: 'e2e-course-cert-missing',
      title: 'คอร์สจบแล้วแต่ยังไม่มีใบรับรอง E2E',
      slug: 'e2e-certificate-missing-course',
      description: '<p>สถานะสำหรับทดสอบการกู้คืนใบรับรองที่ยังไม่ถูกออก</p>',
      price: '990.00',
    },
    longThai: {
      id: 'e2e-course-long-thai',
      title: 'คอร์สภาษาไทยชื่อยาวสำหรับตรวจสอบการตัดบรรทัดและการจัดวางบนหน้าจอขนาดเล็กโดยไม่ทำให้เนื้อหา ปุ่มดำเนินการ หรือข้อมูลราคาหลุดออกนอกพื้นที่ที่ผู้ใช้มองเห็น',
      slug: 'e2e-long-thai-course',
      description: '<p>ข้อความภาษาไทยแบบยาวต่อเนื่องสำหรับตรวจ responsive layout และ empty/recovery surfaces อย่างสม่ำเสมอ</p>',
      price: '590.00',
    },
  } satisfies Record<string, CourseFixture>,
  lessons: {
    paid: { id: 'e2e-lesson-paid', courseId: 'e2e-course-paid' },
    freePreview: { id: 'e2e-lesson-free-preview', courseId: 'e2e-course-free' },
    certificateMissing: { id: 'e2e-lesson-cert-missing', courseId: 'e2e-course-cert-missing' },
    longThai: { id: 'e2e-lesson-long-thai', courseId: 'e2e-course-long-thai' },
  },
  bundle: {
    id: 'e2e-bundle-published',
    title: 'Bundle พร้อมขายสำหรับ E2E',
    slug: 'e2e-published-bundle',
    price: '1790.00',
  },
  enrollments: {
    active: {
      id: 'e2e-enrollment-active',
      userId: 'e2e-user-learner',
      courseId: 'e2e-course-paid',
    },
    certificateActive: {
      id: 'e2e-enrollment-cert-active',
      userId: 'e2e-user-learner',
      courseId: 'e2e-course-long-thai',
    },
    certificateRevoked: {
      id: 'e2e-enrollment-cert-revoked',
      userId: 'e2e-user-learner',
      courseId: 'e2e-course-free',
    },
    certificateMissing: {
      id: 'e2e-enrollment-cert-missing',
      userId: 'e2e-user-learner',
      courseId: 'e2e-course-cert-missing',
    },
    paymentCompleted: {
      id: 'e2e-enrollment-payment-completed',
      userId: 'e2e-buyer-completed',
      courseId: 'e2e-course-paid',
    },
  },
  payments: {
    pending: {
      id: 'e2e-payment-pending', userId: 'e2e-buyer-pending', status: 'pending', amount: '1490.00',
    },
    completed: {
      id: 'e2e-payment-completed', userId: 'e2e-buyer-completed', status: 'completed', amount: '1490.00',
    },
    failed: {
      id: 'e2e-payment-failed', userId: 'e2e-buyer-failed', status: 'failed', amount: '1490.00',
    },
    refunded: {
      id: 'e2e-payment-refunded', userId: 'e2e-buyer-refunded', status: 'refunded', amount: '1490.00',
    },
  } satisfies Record<string, PaymentFixture>,
  certificates: {
    active: {
      id: 'e2e-certificate-active',
      code: 'E2E-ACTIVE',
      courseId: 'e2e-course-long-thai',
    },
    revoked: {
      id: 'e2e-certificate-revoked',
      code: 'E2E-REVOKED',
      courseId: 'e2e-course-free',
    },
  },
  analyticsDisabled: {
    key: 'analytics_enabled',
    value: 'false',
  },
} as const;
