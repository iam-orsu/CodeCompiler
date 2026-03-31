import { LANGUAGES } from '../lib/languages';
import { LanguageConfig } from '../types';

export function useLanguages() {
  // Static local data - no async loading needed
  return { languages: LANGUAGES as LanguageConfig[], loading: false, error: null };
}
