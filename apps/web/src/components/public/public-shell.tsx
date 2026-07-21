'use client';

import { PublicHeader } from './public-header';
import { SiteFooter } from './site-footer';

/** Header + footer wrapper for public pages so the chrome is consistent site-wide. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
