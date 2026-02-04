This is a [Next.js](https://nextjs.org) Valentine’s Day app with a name dropdown and admin stats, using [shadcn/ui](https://ui.shadcn.com) and [Supabase](https://supabase.com).

## Setup

1. **Supabase**  
   - In Supabase Dashboard: **Project Settings > API** copy your **Project URL** and **anon (public) key**.  
   - In the project root, copy `.env.local.example` to `.env.local` and set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `ADMIN_SECRET` (used for `/admin?key=your-secret`).

2. **Database**  
   In Supabase **SQL Editor**, run the script in `supabase/schema.sql` to create the `names` and `submissions` tables and seed initial names.

3. **Run the app**  
   `npm run dev` and open [http://localhost:3000](http://localhost:3000).  
   Admin: [http://localhost:3000/admin?key=YOUR_ADMIN_SECRET](http://localhost:3000/admin?key=YOUR_ADMIN_SECRET).

## Getting Started

First, run the development server:

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

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
