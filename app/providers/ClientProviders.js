'use client';

import { AuthProvider } from '../contexts';
import { LanguageProvider } from '../contexts/LanguageContexts';

export default function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </AuthProvider>
  );
}

