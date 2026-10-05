import { de, type Dict } from './de';
import { en } from './en';

export type Lang = 'de' | 'en';
export type { Dict };

const dicts: Record<Lang, Dict> = { de, en };

export function t(lang: Lang): Dict {
  return dicts[lang];
}

/** Prefix a site-relative path with the configured base (e.g. '/fightflow/'). */
export function url(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\//, '');
  return `${base}/${clean}`;
}

/** Route map so DE and EN pages can link to their counterpart. */
export const routes = {
  home: { de: '', en: 'en/' },
  imprint: { de: 'impressum/', en: 'en/imprint/' },
  privacy: { de: 'datenschutz/', en: 'en/privacy/' },
} as const;

export type RouteKey = keyof typeof routes;

export function route(key: RouteKey, lang: Lang): string {
  return url(routes[key][lang]);
}
