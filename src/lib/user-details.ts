import type { CompanyAddress, DevUser, UserContact } from "./dev-users";
import { getCustomerDisplayId } from "./dev-users";

export function formatCompanyAddress(addr?: CompanyAddress): string {
  if (!addr) return "";
  const parts = [
    addr.street,
    addr.area,
    addr.city,
    addr.district,
    addr.postalCode,
    addr.country,
  ].filter(Boolean);
  return parts.join(", ");
}

export function formatCompanyAddressShort(addr?: CompanyAddress): string {
  const full = formatCompanyAddress(addr);
  if (!full) return "";
  return full.length > 48 ? `${full.slice(0, 45)}…` : full;
}

export function contactSummary(contacts?: UserContact[]): string {
  const n = contacts?.length ?? 0;
  if (n === 0) return "";
  const first = contacts![0];
  const label = first.name || first.phone || "Contact";
  return n === 1 ? label : `${label} +${n - 1} more`;
}

function userSearchHaystack(u: DevUser): string {
  const addr = formatCompanyAddress(u.companyAddress);
  const contacts = (u.contacts ?? [])
    .map((c) =>
      [c.name, c.role, c.phone, c.email, c.whatsapp, c.note].filter(Boolean).join(" ")
    )
    .join(" ");
  return [
    u.id,
    u.customerId,
    getCustomerDisplayId(u),
    u.name,
    u.email,
    u.phone,
    u.company,
    addr,
    u.adminNotes,
    contacts,
    u.status,
    u.plan,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesUserSearch(u: DevUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return userSearchHaystack(u).includes(q);
}
