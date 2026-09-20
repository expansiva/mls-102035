/// <mls fileReference="_102035_/l2/newRelease/helpers/i18n.ts" enhancement="_blank" />

export type NewReleaseMessages = Record<string, string>;
export type NewReleaseTranslate = (key: string, values?: Record<string, string | number>) => string;

export type NewReleaseI18nFile = {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
};

export type LoadNewReleaseMessagesOptions = {
  fetcher?: typeof fetch;
  readStor?: (file: NewReleaseI18nFile) => Promise<NewReleaseMessages | null>;
};

const MASTER_PROJECT = 102035;
const I18N_URL = /^\/_(\d+)_\/l2\/newRelease\/i18n\/([^/]+)\.json$/;

type ReadableI18nFile = {
  status?: string;
  getValueInfo?: () => Promise<{ content?: unknown }>;
  getContent?: () => Promise<unknown>;
};

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

export function newReleaseI18nFileFromUrl(url: string): NewReleaseI18nFile | null {
  const match = I18N_URL.exec(url);
  if (!match) return null;
  return {
    project: Number(match[1]),
    level: 2,
    folder: 'newRelease/i18n',
    shortName: match[2],
    extension: '.json',
  };
}

function asMessages(value: unknown): NewReleaseMessages | null {
  if (typeof value === 'string') {
    try {
      return asMessages(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as NewReleaseMessages;
  return null;
}

export async function readNewReleaseI18nFromStor(file: NewReleaseI18nFile): Promise<NewReleaseMessages | null> {
  const stor = (globalThis as unknown as {
    mls?: { stor?: { files?: Record<string, ReadableI18nFile>; getKeyToFile?: (info: NewReleaseI18nFile) => string } };
  }).mls?.stor;
  if (!stor?.files || typeof stor.getKeyToFile !== 'function') return null;
  const record = stor.files[stor.getKeyToFile(file)];
  if (!record || record.status === 'deleted') return null;
  if (record.getValueInfo) {
    try {
      const messages = asMessages((await record.getValueInfo())?.content);
      if (messages) return messages;
    } catch {
      // Studio often keeps getValueInfo().content = null; fall through to getContent.
    }
  }
  if (!record.getContent) return null;
  try {
    return asMessages(await record.getContent());
  } catch {
    return null;
  }
}

async function readNewReleaseI18nFromUrl(url: string, fetcher: typeof fetch): Promise<NewReleaseMessages | null> {
  try {
    const response = await fetcher(url);
    if (!response.ok) return null;
    return asMessages(await response.json());
  } catch {
    return null;
  }
}

export async function loadNewReleaseMessages(
  project: number,
  language = currentNewReleaseLanguage(),
  options: LoadNewReleaseMessagesOptions = {},
): Promise<NewReleaseMessages[]> {
  const fetcher = options.fetcher ?? fetch;
  const readStor = options.readStor ?? readNewReleaseI18nFromStor;
  const bundles: NewReleaseMessages[] = [];
  for (const url of newReleaseI18nCandidates(project, language)) {
    const file = newReleaseI18nFileFromUrl(url);
    if (file) {
      try {
        const fromStor = await readStor(file);
        if (fromStor) bundles.push(fromStor);
      } catch {
        // A missing or invalid current catalog continues to the static URL of the same candidate.
      }
    }
    const fromHttp = await readNewReleaseI18nFromUrl(url, fetcher);
    if (fromHttp) bundles.push(fromHttp);
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
