import React from 'react';
import { AuthWrapper } from '../components/AuthWrapper';
// Preserve the guard entry point; route and admin decisions share one policy.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <AuthWrapper>{children}</AuthWrapper>;
}
