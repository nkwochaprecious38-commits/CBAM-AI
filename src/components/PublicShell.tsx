import { SiteNav } from "./SiteNav";
import { Footer } from "./Footer";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (<><SiteNav /><main>{children}</main><Footer /></>);
}
