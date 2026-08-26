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
    const d = digits(item.phone || "");
    if (!d) continue;
    byDigits.set(d, item);
    if (d.length >= 8) byDigits.set(d.slice(-8), item);
    if (d.length >= 10) byDigits.set(d.slice(-10), item);
  }

  const q = query.trim().toLowerCase();
  return contacts
    .map((contact) => {
      const d = digits(contact.phone);
      const match =
        byDigits.get(d) ||
        (d.length >= 10 ? byDigits.get(d.slice(-10)) : undefined) ||
        (d.length >= 8 ? byDigits.get(d.slice(-8)) : undefined);
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
