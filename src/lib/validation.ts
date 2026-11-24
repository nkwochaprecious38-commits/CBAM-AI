export const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export function passwordProblems(pw: string): string[] {
  const p: string[] = [];
  if (pw.length < 10) p.push("at least 10 characters");
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw)) p.push("upper and lower case letters");
  if (!/\d/.test(pw)) p.push("a number");
  return p;
}
export function authMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Incorrect email or password.";
  if (m.includes("not confirmed")) return "Your email address has not been verified yet. Check your inbox for the verification link.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Log in instead.";
  if (m.includes("weak") || m.includes("password should")) return "That password is too weak. Use a longer, less common password.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Network error. Check your connection and try again.";
  if (m.includes("same password") || m.includes("different from the old")) return "Choose a password you have not used before.";
  if (m.includes("session") && m.includes("missing")) return "Your reset link has expired. Request a new one.";
  return msg;
}
