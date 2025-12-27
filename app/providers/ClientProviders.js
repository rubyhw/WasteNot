'use client';

import { AuthProvider } from '../contexts';

export default function ClientProviders({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

