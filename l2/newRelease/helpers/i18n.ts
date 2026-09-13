/// <mls fileReference="_102035_/l2/newRelease/helpers/i18n.ts" enhancement="_blank" />

export type NewReleaseMessages = Record<string, string>;
export type NewReleaseTranslate = (key: string, values?: Record<string, string | number>) => string;

const MASTER_PROJECT = 102035;

export function currentNewReleaseLanguage(): string {
  return document.documentElement.lang || 'en-US';
}

export function newReleaseI18nCandidates(project: number, language: string): string[] {
  const lang = language.trim() || 'en-US';
  const base = lang.includes('-') ? lang.split('-')[0] : '';
  const candidates = [
    `/_${project}_/l2/newRelease/i18n/${lang}.json`,
    `/_${MASTER_PROJECT}_/l2/newRelease/i18n/${lang}.json`,
    ...(base ? [
      `/_${project}_/l2/newRelease/i18n/${base}.json`,
      `/_${MASTER_PROJECT}_/l2/newRelease/i18n/${base}.json`,
    ] : []),
    `/_${MASTER_PROJECT}_/l2/newRelease/i18n/en-US.json`,
  ];
  return [...new Set(candidates)];
}

export async function loadNewReleaseMessages(
  project: number,
  language = currentNewReleaseLanguage(),
  fetcher: typeof fetch = fetch,
): Promise<NewReleaseMessages[]> {
  const bundles: NewReleaseMessages[] = [];
  for (const url of newReleaseI18nCandidates(project, language)) {
    try {
      const response = await fetcher(url);
      if (!response.ok) continue;
      const value = await response.json();
      if (value && typeof value === 'object' && !Array.isArray(value)) bundles.push(value as NewReleaseMessages);
    } catch {
      // A missing client override is expected; continue through the fallback chain.
    }
  }
  return bundles;
}

export function createNewReleaseTranslator(bundles: NewReleaseMessages[]): NewReleaseTranslate {
  return (key, values = {}) => {
    let message = key;
    for (const bundle of bundles) {
      if (typeof bundle[key] === 'string') {
        message = bundle[key];
        break;
      }
    }
    return message.replace(/\{\{([^}]+)\}\}/g, (_match, name: string) => String(values[name] ?? `{{${name}}}`));
  };
}

export function observeNewReleaseLanguage(onChange: () => void): MutationObserver {
  const observer = new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'lang')) onChange();
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  return observer;
}
