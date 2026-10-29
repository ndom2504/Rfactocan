import * as SecureStore from "expo-secure-store";

export type SavedAccount = {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  token: string;
};

const KEY = "rfacto_saved_accounts";
const ADDING_KEY = "rfacto_adding_account";
const MAX = 2;

export async function listSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAccount[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a) => a?.id && a?.token).slice(0, MAX);
  } catch {
    return [];
  }
}

export async function rememberSavedAccount(account: SavedAccount) {
  const current = await listSavedAccounts();
  const next = [account, ...current.filter((a) => a.id !== account.id)].slice(
    0,
    MAX
  );
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
}

export async function removeSavedAccount(id: string) {
  const next = (await listSavedAccounts()).filter((a) => a.id !== id);
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
}

export async function setAddingAccount(value: boolean) {
  if (value) await SecureStore.setItemAsync(ADDING_KEY, "1");
  else await SecureStore.deleteItemAsync(ADDING_KEY);
}

export async function isAddingAccount() {
  try {
    return (await SecureStore.getItemAsync(ADDING_KEY)) === "1";
  } catch {
    return false;
  }
}
