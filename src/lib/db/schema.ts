import { mysqlTable, varchar, text, int, decimal, datetime, boolean } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// =====================
// USERS TABLE
// =====================
export const users = mysqlTable('users', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }),
    name: varchar('name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    role: varchar('role', { length: 20, enum: ['student', 'instructor', 'admin'] }).default('student').notNull(),
    emailVerifiedAt: datetime('email_verified_at'),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
    enrollments: many(enrollments),
    payments: many(payments),
    lessonProgress: many(lessonProgress),
}));

// =====================
// COURSES TABLE
// =====================
export const courses = mysqlTable('courses', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 20, enum: ['draft', 'published', 'archived'] }).default('draft').notNull(),
    instructorId: varchar('instructor_id', { length: 36 }).references(() => users.id),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export const coursesRelations = relations(courses, ({ one, many }) => ({
    instructor: one(users, {
        fields: [courses.instructorId],
        references: [users.id],
    }),
    lessons: many(lessons),
    enrollments: many(enrollments),
}));

// =====================
// LESSONS TABLE
// =====================
export const lessons = mysqlTable('lessons', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content'),
    videoUrl: text('video_url'),
    videoDuration: int('video_duration').default(0),
    orderIndex: int('order_index').notNull(),
    isFreePreview: boolean('is_free_preview').default(false),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
    course: one(courses, {
        fields: [lessons.courseId],
        references: [courses.id],
    }),
    progress: many(lessonProgress),
}));

// =====================
// ENROLLMENTS TABLE
// =====================
export const enrollments = mysqlTable('enrollments', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    enrolledAt: datetime('enrolled_at').$defaultFn(() => new Date()),
    progressPercent: int('progress_percent').default(0),
    completedAt: datetime('completed_at'),
});

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
    user: one(users, {
        fields: [enrollments.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [enrollments.courseId],
        references: [courses.id],
    }),
}));

// =====================
// LESSON PROGRESS TABLE
// =====================
export const lessonProgress = mysqlTable('lesson_progress', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    lessonId: varchar('lesson_id', { length: 36 }).references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
    completed: boolean('completed').default(false),
    watchTimeSeconds: int('watch_time_seconds').default(0),
    lastWatchedAt: datetime('last_watched_at'),
});

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
    user: one(users, {
        fields: [lessonProgress.userId],
        references: [users.id],
    }),
    lesson: one(lessons, {
        fields: [lessonProgress.lessonId],
        references: [lessons.id],
    }),
}));

// =====================
// PAYMENTS TABLE
// =====================
export const payments = mysqlTable('payments', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'set null' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('THB').notNull(),
    method: varchar('method', { length: 20, enum: ['stripe', 'promptpay', 'bank_transfer'] }).notNull(),
    stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
    slipUrl: text('slip_url'),
    status: varchar('status', { length: 20, enum: ['pending', 'completed', 'failed', 'refunded'] }).default('pending').notNull(),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
    user: one(users, {
        fields: [payments.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [payments.courseId],
        references: [courses.id],
    }),
}));

// =====================
// TYPE EXPORTS
// =====================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
