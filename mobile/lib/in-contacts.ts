import * as Contacts from "expo-contacts";

export type PhoneContact = {
  id: string;
  name: string;
  phone: string;
};

export type InMatch = {
  userId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  threadId?: string | null;
  online?: boolean;
};

export type InContactRow = PhoneContact & { match?: InMatch };

function digits(value: string) {
  return value.replace(/\D/g, "");
}

/** Keep in sync with lib/phone-auth.ts phoneIndexKeys (Gabon 07/077 aliases). */
function phoneIndexKeys(raw: string): string[] {
  const d = digits(raw);
  if (!d) return [];
  const keys = new Set<string>();
  const add = (value: string) => {
    if (!value) return;
    keys.add(value);
    if (value.length >= 7) keys.add(value.slice(-7));
    if (value.length >= 8) keys.add(value.slice(-8));
    if (value.length >= 9) keys.add(value.slice(-9));
    if (value.length >= 10) keys.add(value.slice(-10));
  };
  add(d);
  const expand = (e164Digits: string) => {
    add(e164Digits);
    if (/^241([2-9])\1\d{6}$/.test(e164Digits)) {
      const nsn = e164Digits.slice(3);
      add(`2410${nsn[0]}${nsn.slice(2)}`);
    }
    if (/^2410[2-9]\d{6}$/.test(e164Digits)) {
      const rest = e164Digits.slice(4);
      add(`241${rest[0]}${rest}`);
    }
  };
  if (raw.trim().startsWith("+") || d.length >= 10) expand(d);
  if (/^241([2-9])\1\d{6}$/.test(d) || /^2410[2-9]\d{6}$/.test(d)) expand(d);
  if (/^2410[2-9]\d{7}$/.test(d) && d.length === 12) expand(`241${d.slice(4)}`);
  if (/^0([2-9])\1\d{6}$/.test(d) && d.length === 9) expand(`241${d.slice(1)}`);
  if (/^0[2-9]\d{6}$/.test(d) && d.length === 8) expand(`241${d[1]}${d.slice(1)}`);
  return [...keys];
}

export async function loadDeviceContacts(): Promise<
  { ok: true; contacts: PhoneContact[] } | { ok: false; denied: boolean }
> {
  const current = await Contacts.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const asked = await Contacts.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== "granted") {
    return { ok: false, denied: true };
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    pageSize: 800,
  });

  const seen = new Set<string>();
  const contacts: PhoneContact[] = [];
  for (const person of data) {
    const name =
      person.name?.trim() ||
      [person.firstName, person.lastName].filter(Boolean).join(" ").trim() ||
      "Contact";
    for (const entry of person.phoneNumbers ?? []) {
      const phone = (entry.number || "").trim();
      if (phone.length < 6) continue;
      const key = digits(phone) || phone;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      contacts.push({
        id: `${person.id ?? key}-${key}`,
        name,
        phone,
      });
      if (contacts.length >= 400) break;
    }
  }
  contacts.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return { ok: true, contacts };
}

export function phonesForMatch(contacts: PhoneContact[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const contact of contacts) {
    const compact = contact.phone.replace(/[^\d+]/g, "").slice(0, 32);
    const raw = contact.phone.replace(/\s+/g, " ").trim().slice(0, 32);
    const value = compact.length >= 3 ? compact : raw;
    if (value.length < 3 || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
    if (out.length >= 400) break;
  }
  return out;
}

export function mergeContactsWithMatches(
  contacts: PhoneContact[],
  matches: InMatch[],
  query = ""
): InContactRow[] {
  const byDigits = new Map<string, InMatch>();
  for (const item of matches) {
    for (const key of phoneIndexKeys(item.phone || "")) {
      byDigits.set(key, item);
    }
  }

  const q = query.trim().toLowerCase();
  return contacts
    .map((contact) => {
      let match: InMatch | undefined;
      for (const key of phoneIndexKeys(contact.phone)) {
        match = byDigits.get(key);
        if (match) break;
      }
      return { ...contact, match };
    })
    .filter((row) => {
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        (row.match?.displayName || "").toLowerCase().includes(q)
      );
    });
}
