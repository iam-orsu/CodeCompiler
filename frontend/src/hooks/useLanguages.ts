import { useState, useEffect } from 'react';
import { LANGUAGES } from '../lib/languages';
import { LanguageConfig } from '../types';

export function useLanguages() {
  const [languages, setLanguages] = useState<LanguageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simply returns local static definitions for instant load
    setLanguages(LANGUAGES);
    setLoading(false);
  }, []);

  return { languages, loading, error };
}
