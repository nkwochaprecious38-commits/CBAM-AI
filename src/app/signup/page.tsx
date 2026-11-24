import { Suspense } from "react";
import { SignupForm } from "./SignupForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Sign up: CBAM AI" };
export default function Page() {
  return (
    <AuthShell title="Create your CBAM AI workspace" subtitle="Your organization gets its own secure workspace. You become its administrator." wide>
      <Suspense><SignupForm /></Suspense>
    </AuthShell>
  );
}
