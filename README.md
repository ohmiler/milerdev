# Course Platform

Online course platform built with Next.js, Drizzle ORM, and MySQL.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MySQL (Railway)
- **ORM**: Drizzle ORM
- **Auth**: NextAuth v5
- **Payment**: Stripe + SlipOK
- **Video**: Bunny.net Stream
- **Email**: Resend

## Environment Variables

Create a `.env.local` file:

```env
# Database (Railway MySQL)
DATABASE_URL="mysql://user:password@host:port/database"

# NextAuth
AUTH_SECRET="your-auth-secret"

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Bunny.net
BUNNY_API_KEY="..."
BUNNY_LIBRARY_ID="..."

# Resend
RESEND_API_KEY="re_..."
```

## Getting Started

First, install dependencies and push database schema:

```bash
npm install
npm run db:push
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Railway

1. Create a new project on [Railway](https://railway.app)
2. Add a **MySQL** database service
3. Add a **Next.js** service from your GitHub repo
4. Set environment variables in Railway dashboard
5. Select **Singapore (asia-southeast1)** region for best performance in Thailand
6. Deploy!

Railway will automatically build and deploy your app.
