import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// =====================
// USERS TABLE
// =====================
export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    role: text('role', { enum: ['student', 'instructor', 'admin'] }).default('student').notNull(),
    emailVerifiedAt: integer('email_verified_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
    enrollments: many(enrollments),
    payments: many(payments),
    lessonProgress: many(lessonProgress),
}));

// =====================
// COURSES TABLE
// =====================
export const courses = sqliteTable('courses', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    price: real('price').notNull().default(0),
    status: text('status', { enum: ['draft', 'published', 'archived'] }).default('draft').notNull(),
    instructorId: text('instructor_id').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
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
export const lessons = sqliteTable('lessons', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    content: text('content'),
    videoUrl: text('video_url'),
    videoDuration: integer('video_duration').default(0),
    orderIndex: integer('order_index').notNull(),
    isFreePreview: integer('is_free_preview', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
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
export const enrollments = sqliteTable('enrollments', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    courseId: text('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    enrolledAt: integer('enrolled_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
    progressPercent: integer('progress_percent').default(0),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
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
export const lessonProgress = sqliteTable('lesson_progress', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    lessonId: text('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
    completed: integer('completed', { mode: 'boolean' }).default(false),
    watchTimeSeconds: integer('watch_time_seconds').default(0),
    lastWatchedAt: integer('last_watched_at', { mode: 'timestamp' }),
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
export const payments = sqliteTable('payments', {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
    amount: real('amount').notNull(),
    currency: text('currency').default('THB').notNull(),
    method: text('method', { enum: ['stripe', 'promptpay', 'bank_transfer'] }).notNull(),
    stripePaymentId: text('stripe_payment_id'),
    slipUrl: text('slip_url'),
    status: text('status', { enum: ['pending', 'completed', 'failed', 'refunded'] }).default('pending').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
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
