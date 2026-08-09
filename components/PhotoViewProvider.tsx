"use client";

import type { ReactNode } from "react";
import { PhotoProvider } from "react-photo-view";

// react-photo-view ships no "use client" directive anywhere in its own bundle (checked
// directly — none of its dist files have one), so app/layout.tsx (a Server Component)
// importing PhotoProvider straight from the package made Next.js try to include it in the
// server bundle, which broke build-time page-data collection with
// "(0, d.createContext) is not a function" (React's server-condition export of `react`
// doesn't expose the same surface the library expects). Re-exporting through this file, which
// does have "use client", establishes the boundary Next needs — everything react-photo-view
// imports from here on is only ever bundled/evaluated for the browser.
export default function PhotoViewProvider({ children }: { children: ReactNode }) {
  return <PhotoProvider>{children}</PhotoProvider>;
}
