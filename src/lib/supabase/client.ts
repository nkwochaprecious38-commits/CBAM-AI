import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../config";

let client: ReturnType<typeof createBrowserClient> | null = null;
export function supabaseBrowser() {
  if (!client) client = createBrowserClient(SUPABASE_URL || "http://localhost:54321", SUPABASE_ANON_KEY || "not-configured", { db: { schema: "cbam" } });
  return client;
}
