import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ supabase: isSupabaseConfigured, ai: Boolean(process.env.ANTHROPIC_API_KEY), email: Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY) });
}
