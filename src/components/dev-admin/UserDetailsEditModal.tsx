"use client";

import { useEffect, useState } from "react";
import {
  type CompanyAddress,
  type DevUser,
  type UserContact,
  getCustomerDisplayId,
  findUserByCustomerId,
  CUSTOMER_ID_PREFIX,
} from "@/lib/dev-users";
import { getPlanFeatures } from "@/lib/plan-presets";
import {
  fetchPlanConfigFromServer,
  loadPlanConfigLocal,
  PLAN_CONFIG_UPDATED,
} from "@/lib/plan-config-client";
import type { PlanConfig } from "@/lib/plan-config-types";
import { PlanSelectorCards } from "@/components/dev-admin/PlanSelectorCards";
import { X, Plus, Trash2, MapPin, Users, StickyNote } from "lucide-react";

function emptyAddress(): CompanyAddress {
  return {
    street: "",
    area: "",
    city: "",
    district: "",
    postalCode: "",
    country: "Bangladesh",
  };
}

function newContact(): UserContact {
  return {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    role: "",
    phone: "",
    email: "",
    whatsapp: "",
    note: "",
  };
}

type Props = {
  user: DevUser | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    patch: Pick<
      DevUser,
      | "name"
      | "email"
      | "phone"
      | "customerId"
      | "company"
      | "companyAddress"
      | "contacts"
      | "adminNotes"
      | "plan"
    > & { features?: DevUser["features"] }
  ) => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500";
const labelClass = "mb-1 block text-xs font-semibold uppercase text-slate-500";

export function UserDetailsEditModal({ user, open, onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idError, setIdError] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState<CompanyAddress>(emptyAddress());
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [adminNotes, setAdminNotes] = useState("");
  const [plan, setPlan] = useState<DevUser["plan"]>("basic");
  const [planConfig, setPlanConfig] = useState<PlanConfig | null>(null);
  const [applyPlanFeatures, setApplyPlanFeatures] = useState(false);

  useEffect(() => {
    fetchPlanConfigFromServer().then(setPlanConfig);
    const onPlans = () => setPlanConfig(loadPlanConfigLocal());
    window.addEventListener(PLAN_CONFIG_UPDATED, onPlans);
    return () => window.removeEventListener(PLAN_CONFIG_UPDATED, onPlans);
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setCustomerId(user.customerId ?? "");
    setIdError("");
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setCompany(user.company);
    setAddress({ ...emptyAddress(), ...user.companyAddress });
    setContacts(
      user.contacts?.length ? user.contacts.map((c) => ({ ...c })) : []
    );
    setAdminNotes(user.adminNotes ?? "");
    setPlan(user.plan);
    setApplyPlanFeatures(false);
  }, [user]);

  if (!open || !user) return null;

  const updateContact = (id: string, patch: Partial<UserContact>) => {
    setContacts((list) =>
      list.map((c) => (c.id === id ? { ...c, ...patch } : c))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cid = customerId.trim();
    if (cid && findUserByCustomerId(cid, user.id)) {
      setIdError("This customer ID is already used by another account.");
      return;
    }
    setIdError("");
    onSave({
      name: name.trim(),
      customerId: cid,
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      company: company.trim(),
      companyAddress: {
        street: address.street?.trim(),
        area: address.area?.trim(),
        city: address.city?.trim(),
        district: address.district?.trim(),
        postalCode: address.postalCode?.trim(),
        country: address.country?.trim(),
      },
      contacts: contacts
        .map((c) => ({
          ...c,
          name: c.name.trim(),
          role: c.role?.trim(),
          phone: c.phone?.trim(),
          email: c.email?.trim(),
          whatsapp: c.whatsapp?.trim(),
          note: c.note?.trim(),
        }))
        .filter((c) => c.name || c.phone || c.email || c.whatsapp),
      adminNotes: adminNotes.trim(),
      plan,
      ...(applyPlanFeatures ? { features: getPlanFeatures(plan) } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Edit customer details</h2>
            <p className="text-xs text-slate-400">
              Customer ID: {getCustomerDisplayId(user)} · System ref: {user.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="mb-3 text-sm font-bold text-orange-300">Account</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Customer ID</label>
                <input
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setIdError("");
                  }}
                  className={inputClass}
                  placeholder={`${CUSTOMER_ID_PREFIX}001 (auto-generated)`}
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Auto format {CUSTOMER_ID_PREFIX}001 — shown in profile &amp; admin.
                  Display:{" "}
                  <span className="font-mono text-orange-300/90">
                    {customerId.trim() || getCustomerDisplayId(user)}
                  </span>
                </p>
                {idError ? (
                  <p className="mt-1 text-xs text-rose-400">{idError}</p>
                ) : null}
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Company / Store name</label>
                <input
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-orange-300">Subscription plan</h3>
            {planConfig ? (
              <>
                <PlanSelectorCards
                  plans={planConfig.plans}
                  selected={plan}
                  onSelect={(next) => {
                    setPlan(next);
                    if (next !== user.plan) setApplyPlanFeatures(true);
                  }}
                />
                {plan !== user.plan ? (
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={applyPlanFeatures}
                      onChange={(e) => setApplyPlanFeatures(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    Also reset features to this plan&apos;s package defaults
                  </label>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-slate-500">Loading plans…</p>
            )}
          </section>

          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-orange-300">
              <MapPin className="h-4 w-4" /> Company address
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>Street / Building</label>
                <input
                  value={address.street ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, street: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="House, road, building"
                />
              </div>
              <div>
                <label className={labelClass}>Area / Thana</label>
                <input
                  value={address.area ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, area: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  value={address.city ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, city: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>District</label>
                <input
                  value={address.district ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, district: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Postal code</label>
                <input
                  value={address.postalCode ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, postalCode: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input
                  value={address.country ?? ""}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, country: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-orange-300">
                <Users className="h-4 w-4" /> Contact list
              </h3>
              <button
                type="button"
                onClick={() => setContacts((c) => [...c, newContact()])}
                className="flex items-center gap-1 rounded-lg border border-orange-500/50 px-2.5 py-1 text-xs font-semibold text-orange-300 hover:bg-orange-500/10"
              >
                <Plus className="h-3.5 w-3.5" /> Add contact
              </button>
            </div>
            {contacts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-600 px-4 py-6 text-center text-xs text-slate-500">
                No contacts yet. Add owner, support, or WhatsApp numbers.
              </p>
            ) : (
              <div className="space-y-3">
                {contacts.map((c, i) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-slate-700 bg-slate-800/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">
                        Contact {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setContacts((list) => list.filter((x) => x.id !== c.id))
                        }
                        className="rounded p-1 text-rose-400 hover:bg-rose-500/10"
                        aria-label="Remove contact"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        placeholder="Name *"
                        value={c.name}
                        onChange={(e) =>
                          updateContact(c.id, { name: e.target.value })
                        }
                        className={inputClass}
                      />
                      <input
                        placeholder="Role (Owner, Support…)"
                        value={c.role ?? ""}
                        onChange={(e) =>
                          updateContact(c.id, { role: e.target.value })
                        }
                        className={inputClass}
                      />
                      <input
                        placeholder="Phone"
                        value={c.phone ?? ""}
                        onChange={(e) =>
                          updateContact(c.id, { phone: e.target.value })
                        }
                        className={inputClass}
                      />
                      <input
                        placeholder="WhatsApp"
                        value={c.whatsapp ?? ""}
                        onChange={(e) =>
                          updateContact(c.id, { whatsapp: e.target.value })
                        }
                        className={inputClass}
                      />
                      <input
                        placeholder="Email"
                        type="email"
                        value={c.email ?? ""}
                        onChange={(e) =>
                          updateContact(c.id, { email: e.target.value })
                        }
                        className={inputClass}
                      />
                      <input
                        placeholder="Note"
                        value={c.note ?? ""}
                        onChange={(e) =>
                          updateContact(c.id, { note: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-orange-300">
              <StickyNote className="h-4 w-4" /> Internal notes
            </h3>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Payment terms, meeting notes, special requests…"
            />
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-bold text-white hover:bg-orange-500"
          >
            Save details
          </button>
        </div>
      </form>
    </div>
  );
}
