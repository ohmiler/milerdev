import { mysqlTable, varchar, text, int, decimal, datetime, boolean, uniqueIndex, index } from 'drizzle-orm/mysql-core';
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
    resetToken: varchar('reset_token', { length: 255 }),
    resetExpires: datetime('reset_expires'),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
    enrollments: many(enrollments),
    payments: many(payments),
    lessonProgress: many(lessonProgress),
    accounts: many(accounts),
    analyticsEvents: many(analyticsEvents),
}));

// =====================
// ACCOUNTS TABLE (OAuth — NextAuth)
// =====================
export const accounts = mysqlTable('accounts', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('userId', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: varchar('type', { length: 255 }).notNull(),
    provider: varchar('provider', { length: 255 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: int('expires_at'),
    token_type: varchar('token_type', { length: 255 }),
    scope: varchar('scope', { length: 255 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 255 }),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
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
    certificateColor: varchar('certificate_color', { length: 20 }).default('blue'),
    certificateHeaderImage: text('certificate_header_image'),
    certificateBadge: varchar('certificate_badge', { length: 50 }),
    previewVideoUrl: text('preview_video_url'),
    promoPrice: decimal('promo_price', { precision: 10, scale: 2 }),
    promoStartsAt: datetime('promo_starts_at'),
    promoEndsAt: datetime('promo_ends_at'),
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
    analyticsEvents: many(analyticsEvents),
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
}, (table) => [
    uniqueIndex('uq_enrollment_user_course').on(table.userId, table.courseId),
]);

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
    bundleId: varchar('bundle_id', { length: 36 }).references(() => bundles.id, { onDelete: 'set null' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 10 }).default('THB').notNull(),
    method: varchar('method', { length: 20, enum: ['stripe', 'promptpay', 'bank_transfer'] }).notNull(),
    stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
    slipUrl: text('slip_url'),
    itemTitle: varchar('item_title', { length: 255 }),
    status: varchar('status', { length: 20, enum: ['pending', 'completed', 'failed', 'refunded', 'verifying'] }).default('pending').notNull(),
    retryCount: int('retry_count').default(0),
    lastRetryAt: datetime('last_retry_at'),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const paymentsRelations = relations(payments, ({ one, many }) => ({
    user: one(users, {
        fields: [payments.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [payments.courseId],
        references: [courses.id],
    }),
    bundle: one(bundles, {
        fields: [payments.bundleId],
        references: [bundles.id],
    }),
    analyticsEvents: many(analyticsEvents),
}));

// =====================
// ANNOUNCEMENTS TABLE
// =====================
export const announcements = mysqlTable('announcements', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    type: varchar('type', { length: 20, enum: ['info', 'warning', 'success', 'error'] }).default('info').notNull(),
    targetRole: varchar('target_role', { length: 20, enum: ['all', 'student', 'instructor', 'admin'] }).default('all').notNull(),
    isActive: boolean('is_active').default(true),
    startsAt: datetime('starts_at'),
    endsAt: datetime('ends_at'),
    createdBy: varchar('created_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export const announcementsRelations = relations(announcements, ({ one }) => ({
    creator: one(users, {
        fields: [announcements.createdBy],
        references: [users.id],
    }),
}));

// =====================
// NOTIFICATIONS TABLE
// =====================
export const notifications = mysqlTable('notifications', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message'),
    type: varchar('type', { length: 20, enum: ['info', 'warning', 'success', 'error'] }).default('info').notNull(),
    link: varchar('link', { length: 500 }),
    isRead: boolean('is_read').default(false),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

// =====================
// SETTINGS TABLE
// =====================
export const settings = mysqlTable('settings', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: text('value'),
    type: varchar('type', { length: 20, enum: ['string', 'number', 'boolean', 'json'] }).default('string').notNull(),
    description: text('description'),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
    updatedBy: varchar('updated_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
});

export const settingsRelations = relations(settings, ({ one }) => ({
    updater: one(users, {
        fields: [settings.updatedBy],
        references: [users.id],
    }),
}));

// =====================
// AUDIT LOGS TABLE
// =====================
export const auditLogs = mysqlTable('audit_logs', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 50 }).notNull(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 36 }),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    user: one(users, {
        fields: [auditLogs.userId],
        references: [users.id],
    }),
}));

// =====================
// MEDIA TABLE
// =====================
export const media = mysqlTable('media', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    filename: varchar('filename', { length: 255 }).notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    size: int('size').notNull(),
    url: text('url').notNull(),
    type: varchar('type', { length: 20, enum: ['image', 'video', 'document'] }).default('image').notNull(),
    uploadedBy: varchar('uploaded_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const mediaRelations = relations(media, ({ one }) => ({
    uploader: one(users, {
        fields: [media.uploadedBy],
        references: [users.id],
    }),
}));

// =====================
// COURSE TAGS TABLE
// =====================
export const tags = mysqlTable('tags', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const courseTags = mysqlTable('course_tags', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    tagId: varchar('tag_id', { length: 36 }).references(() => tags.id, { onDelete: 'cascade' }).notNull(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
    courseTags: many(courseTags),
}));

export const courseTagsRelations = relations(courseTags, ({ one }) => ({
    course: one(courses, {
        fields: [courseTags.courseId],
        references: [courses.id],
    }),
    tag: one(tags, {
        fields: [courseTags.tagId],
        references: [tags.id],
    }),
}));

// =====================
// REVIEWS TABLE
// =====================
export const reviews = mysqlTable('reviews', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    rating: int('rating').notNull(),
    comment: text('comment'),
    displayName: varchar('display_name', { length: 255 }),
    isVerified: boolean('is_verified').default(false),
    isHidden: boolean('is_hidden').default(false),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
    user: one(users, {
        fields: [reviews.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [reviews.courseId],
        references: [courses.id],
    }),
}));

// =====================
// BLOG POSTS TABLE
// =====================
export const blogPosts = mysqlTable('blog_posts', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    excerpt: text('excerpt'),
    content: text('content'),
    thumbnailUrl: text('thumbnail_url'),
    status: varchar('status', { length: 20, enum: ['draft', 'published'] }).default('draft').notNull(),
    authorId: varchar('author_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    publishedAt: datetime('published_at'),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export const blogPostTags = mysqlTable('blog_post_tags', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    postId: varchar('post_id', { length: 36 }).references(() => blogPosts.id, { onDelete: 'cascade' }).notNull(),
    tagId: varchar('tag_id', { length: 36 }).references(() => tags.id, { onDelete: 'cascade' }).notNull(),
});

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
    author: one(users, {
        fields: [blogPosts.authorId],
        references: [users.id],
    }),
    blogPostTags: many(blogPostTags),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({ one }) => ({
    post: one(blogPosts, {
        fields: [blogPostTags.postId],
        references: [blogPosts.id],
    }),
    tag: one(tags, {
        fields: [blogPostTags.tagId],
        references: [tags.id],
    }),
}));

// =====================
// COUPONS TABLE
// =====================
export const coupons = mysqlTable('coupons', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    code: varchar('code', { length: 50 }).notNull().unique(),
    description: text('description'),
    discountType: varchar('discount_type', { length: 20, enum: ['percentage', 'fixed'] }).notNull(),
    discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
    minPurchase: decimal('min_purchase', { precision: 10, scale: 2 }).default('0'),
    maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
    usageLimit: int('usage_limit'),
    usageCount: int('usage_count').default(0),
    perUserLimit: int('per_user_limit').default(1),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true),
    startsAt: datetime('starts_at'),
    expiresAt: datetime('expires_at'),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
});

export const couponUsages = mysqlTable('coupon_usages', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    couponId: varchar('coupon_id', { length: 36 }).references(() => coupons.id, { onDelete: 'cascade' }).notNull(),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'set null' }),
    discountAmount: decimal('discount_amount', { precision: 10, scale: 2 }).notNull(),
    usedAt: datetime('used_at').$defaultFn(() => new Date()),
}, (table) => [
    uniqueIndex('uq_coupon_user_course').on(table.couponId, table.userId, table.courseId),
]);

export const couponsRelations = relations(coupons, ({ one, many }) => ({
    course: one(courses, {
        fields: [coupons.courseId],
        references: [courses.id],
    }),
    usages: many(couponUsages),
}));

export const couponUsagesRelations = relations(couponUsages, ({ one }) => ({
    coupon: one(coupons, {
        fields: [couponUsages.couponId],
        references: [coupons.id],
    }),
    user: one(users, {
        fields: [couponUsages.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [couponUsages.courseId],
        references: [courses.id],
    }),
}));

// =====================
// BUNDLES TABLE
// =====================
export const bundles = mysqlTable('bundles', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    status: varchar('status', { length: 20, enum: ['draft', 'published', 'archived'] }).default('draft').notNull(),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export const bundleCourses = mysqlTable('bundle_courses', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    bundleId: varchar('bundle_id', { length: 36 }).references(() => bundles.id, { onDelete: 'cascade' }).notNull(),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    orderIndex: int('order_index').default(0),
});

export const bundlesRelations = relations(bundles, ({ many }) => ({
    bundleCourses: many(bundleCourses),
    analyticsEvents: many(analyticsEvents),
}));

export const bundleCoursesRelations = relations(bundleCourses, ({ one }) => ({
    bundle: one(bundles, {
        fields: [bundleCourses.bundleId],
        references: [bundles.id],
    }),
    course: one(courses, {
        fields: [bundleCourses.courseId],
        references: [courses.id],
    }),
}));

// =====================
// CERTIFICATES TABLE
// =====================
export const certificates = mysqlTable('certificates', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    certificateCode: varchar('certificate_code', { length: 20 }).notNull().unique(),
    recipientName: varchar('recipient_name', { length: 255 }).notNull(),
    courseTitle: varchar('course_title', { length: 255 }).notNull(),
    completedAt: datetime('completed_at').notNull(),
    issuedAt: datetime('issued_at').$defaultFn(() => new Date()),
    certificateTheme: varchar('certificate_theme', { length: 20 }),
    certificateHeaderImage: text('certificate_header_image'),
    revokedAt: datetime('revoked_at'),
    revokedReason: text('revoked_reason'),
});

export const certificatesRelations = relations(certificates, ({ one }) => ({
    user: one(users, {
        fields: [certificates.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [certificates.courseId],
        references: [courses.id],
    }),
}));

// =====================
// ANALYTICS EVENTS TABLE
// =====================
export const analyticsEvents = mysqlTable('analytics_events', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
    courseId: varchar('course_id', { length: 36 }).references(() => courses.id, { onDelete: 'set null' }),
    bundleId: varchar('bundle_id', { length: 36 }).references(() => bundles.id, { onDelete: 'set null' }),
    paymentId: varchar('payment_id', { length: 36 }).references(() => payments.id, { onDelete: 'set null' }),
    source: varchar('source', { length: 20, enum: ['client', 'server'] }).default('server').notNull(),
    metadata: text('metadata'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
}, (table) => [
    index('idx_analytics_event_name').on(table.eventName),
    index('idx_analytics_created_at').on(table.createdAt),
    index('idx_analytics_course_id').on(table.courseId),
    index('idx_analytics_bundle_id').on(table.bundleId),
    index('idx_analytics_payment_id').on(table.paymentId),
    uniqueIndex('uq_analytics_event_payment').on(table.eventName, table.paymentId),
]);

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
    user: one(users, {
        fields: [analyticsEvents.userId],
        references: [users.id],
    }),
    course: one(courses, {
        fields: [analyticsEvents.courseId],
        references: [courses.id],
    }),
    bundle: one(bundles, {
        fields: [analyticsEvents.bundleId],
        references: [bundles.id],
    }),
    payment: one(payments, {
        fields: [analyticsEvents.paymentId],
        references: [payments.id],
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
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponUsage = typeof couponUsages.$inferSelect;
export type NewCouponUsage = typeof couponUsages.$inferInsert;
export type Bundle = typeof bundles.$inferSelect;
export type NewBundle = typeof bundles.$inferInsert;
export type BundleCourse = typeof bundleCourses.$inferSelect;
export type NewBundleCourse = typeof bundleCourses.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// =====================
// AFFILIATE BANNERS TABLE
// =====================
export const affiliateBanners = mysqlTable('affiliate_banners', {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => createId()),
    title: varchar('title', { length: 255 }).notNull(),
    imageUrl: text('image_url').notNull(),
    linkUrl: text('link_url').notNull(),
    orderIndex: int('order_index').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: datetime('created_at').$defaultFn(() => new Date()),
    updatedAt: datetime('updated_at').$defaultFn(() => new Date()),
});

export type AffiliateBanner = typeof affiliateBanners.$inferSelect;
export type NewAffiliateBanner = typeof affiliateBanners.$inferInsert;
