export type Lang = "ja" | "en";

const LS_KEY = "izk-lite.lang";
let current: Lang = (localStorage.getItem(LS_KEY) as Lang) ||
  ((typeof navigator !== "undefined" && (navigator.language || "").startsWith("ja")) ? "ja" : "en");

let dict: Record<string, string> = {};

async function loadLang(lang: Lang) {
  const mod = await import(`./${lang}.json`);
  dict = mod.default;
  current = lang;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LS_KEY, lang);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("i18n:loaded"));
  }
}

export function t(key: string, fallback?: string) {
  return dict[key] ?? fallback ?? key;
}

export function getLang() {
  return current;
}

export async function setLang(lang: Lang) {
  await loadLang(lang);
}

await loadLang(current);
