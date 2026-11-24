import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Log in: CBAM AI" };
export default function Page() {
  return (
    <AuthShell title="Log in to CBAM AI" subtitle="Welcome back. Enter your details to open your workspace.">
      <Suspense><LoginForm /></Suspense>
    </AuthShell>
  );
}
