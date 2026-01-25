# WordPress Migration Scripts

## Setup

1. Copy environment variables:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with WordPress database info:
```env
# New MySQL database (Railway)
DATABASE_URL="mysql://user:password@host:port/database"

# WordPress database (for migration)
WP_DB_HOST="localhost"
WP_DB_USER="wp_user"
WP_DB_PASSWORD="wp_password"
WP_DB_NAME="wordpress_db"
```

## Run Migration

```bash
npx ts-node scripts/migrate-wordpress.ts
```

## What gets migrated?

- ✅ Users (wp_users + wp_usermeta)
- ✅ Courses (wp_posts type='sfwd-courses')
- ✅ Lessons (wp_posts type='sfwd-lessons')
- ✅ Enrollments (wp_learndash_user_activity type='course')
- ✅ Lesson Progress (wp_learndash_user_activity type='lesson')

## What's NOT migrated?

- ❌ WooCommerce orders (payment history)
- ❌ MailPoet subscribers
- ❌ Comments
- ❌ Media files (need separate migration)

## Notes

- Script converts WordPress IDs to new CUID2 IDs
- Foreign keys are mapped correctly
- Dates are preserved
- Roles are mapped: administrator → admin, others → student
