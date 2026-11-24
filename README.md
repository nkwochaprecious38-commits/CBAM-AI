# CBAM AI

Next.js 14, TypeScript, Tailwind, Supabase (Auth, Postgres, Storage), Recharts, Lucide.

## Setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql` (tables, row level security, audit triggers, storage bucket, signup trigger).
3. Authentication settings in Supabase:
   - Site URL: your app URL (for example `http://localhost:3000`)
   - Redirect URLs: add `<app url>/auth/callback`
   - Email confirmation: on (recommended). Sign up shows a "check your email" screen and login explains unverified accounts.
   - For production, configure your own SMTP sender (Supabase's built in sender is rate limited).
4. `cp .env.example .env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Optional: `ANTHROPIC_API_KEY` (server only) adds an AI generated summary to assistant answers.
5. `npm install && npm run dev`

## How it fits together

- Sign up stores profile fields as user metadata. A database trigger (`handle_new_user`) creates the organization, the admin membership and seeded regulatory sources, so a workspace exists even before the email is verified.
- Invitations: team invites and supplier invites are links (`/signup?invite=...`, `/signup?supplier_invite=...`). Email delivery is not configured, so the link is shown for copying.
- Every business table has `org_id` and row level security (`is_member`, `can_write`, `is_admin`). Audit logs are written by triggers and cannot be edited by users. Approved declarations are immutable and need a different approver than the submitter.
- Suppliers never write tables directly. The portal calls `submit_supplier_data`, a security definer function.
- No emissions factors, prices, CN code scope lists or legal thresholds are hardcoded. Users maintain factors, methodologies and classification lists with sources.

## Not implemented (shown as setup states in the app)

- Submission to the official CBAM Registry
- Automatic reminder emails and email invitations (needs an email sender and a scheduled job)
- Live EU ETS price feed, ERP connectors
- Logo: a temporary mark lives in `src/components/Logo.tsx`
- Terms and privacy pages are placeholders for your counsel's text
- Pricing details are editable placeholders in `src/app/pricing/page.tsx`; the three Selar URLs are unchanged
