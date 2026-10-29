export type SavedAccount = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  token: string;
};

const KEY = "rfacto_saved_accounts";
const MAX = 2;

export function listSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAccount[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a) => a?.id && a?.token).slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberSavedAccount(account: SavedAccount) {
  if (typeof window === "undefined") return;
  const next = [
    account,
    ...listSavedAccounts().filter((a) => a.id !== account.id),
  ].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function removeSavedAccount(id: string) {
  if (typeof window === "undefined") return;
  const next = listSavedAccounts().filter((a) => a.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
