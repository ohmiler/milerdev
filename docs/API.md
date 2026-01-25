# API Documentation

## Overview

Base URL: `/api`

All API responses follow this format:

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Authentication

Most endpoints require authentication via NextAuth.js session. Protected routes return `401 Unauthorized` if not authenticated.

---

## Auth Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "name": "string (min 2 chars)",
  "email": "string (valid email)",
  "password": "string (min 8 chars, 1 uppercase, 1 lowercase, 1 number)"
}
```

**Response:** `201 Created`
```json
{
  "message": "สมัครสมาชิกสำเร็จ"
}
```

**Rate Limit:** 5 requests per minute per IP

---

## Course Endpoints

### GET /api/courses

Get all published courses with pagination.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 12)

**Response:** `200 OK`
```json
{
  "courses": [
    {
      "id": "string",
      "title": "string",
      "slug": "string",
      "description": "string",
      "price": "string",
      "thumbnailUrl": "string",
      "status": "published",
      "instructor": {
        "id": "string",
        "name": "string",
        "avatarUrl": "string"
      },
      "lessonCount": number
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

### POST /api/courses

Create a new course (Admin/Instructor only).

**Request Body:**
```json
{
  "title": "string",
  "description": "string (optional)",
  "price": "number (optional, default: 0)",
  "thumbnailUrl": "string (optional)"
}
```

**Response:** `201 Created`

---

## Enrollment Endpoints

### POST /api/enroll

Enroll in a course.

**Request Body:**
```json
{
  "courseId": "string",
  "paymentId": "string (required for paid courses)"
}
```

**Response:** `200 OK`
```json
{
  "message": "ลงทะเบียนสำเร็จ",
  "enrollment": { ... }
}
```

### GET /api/enroll?courseId=xxx

Check enrollment status for a course.

**Response:** `200 OK`
```json
{
  "enrolled": boolean,
  "enrollment": { ... } | null
}
```

---

## Progress Endpoints

### POST /api/progress

Update lesson progress.

**Request Body:**
```json
{
  "lessonId": "string",
  "courseId": "string",
  "watchTimeSeconds": number,
  "completed": boolean
}
```

**Response:** `200 OK`

### GET /api/progress?courseId=xxx

Get all lesson progress for a course.

**Response:** `200 OK`
```json
{
  "progress": [
    {
      "lessonId": "string",
      "watchTimeSeconds": number,
      "completed": boolean,
      "lastWatchedAt": "datetime"
    }
  ]
}
```

---

## Payment Endpoints

### POST /api/slip/verify

Verify PromptPay slip payment.

**Request Body:** (multipart/form-data)
- `slip`: File (image)
- `courseId`: string
- `amount`: number

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "ชำระเงินสำเร็จ",
  "paymentId": "string"
}
```

**Rate Limit:** 10 requests per minute per user

---

## Profile Endpoints

### GET /api/profile

Get current user's profile.

**Response:** `200 OK`
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "avatarUrl": "string",
    "role": "student | instructor | admin",
    "createdAt": "datetime"
  }
}
```

### PUT /api/profile

Update current user's profile.

**Request Body:**
```json
{
  "name": "string (min 2 chars, optional)"
}
```

**Response:** `200 OK`

---

## Admin Endpoints

### GET /api/admin/courses

Get all courses (Admin only).

### POST /api/admin/courses

Create a new course (Admin only).

### GET /api/admin/courses/[id]

Get a specific course (Admin only).

### PUT /api/admin/courses/[id]

Update a course (Admin only).

### DELETE /api/admin/courses/[id]

Delete a course (Admin only).

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `BAD_REQUEST` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Some endpoints have rate limiting:

| Endpoint | Limit |
|----------|-------|
| `/api/auth/register` | 5 req/min per IP |
| `/api/slip/verify` | 10 req/min per user |

When rate limited, response includes `Retry-After` header.
