# Ecomdrive Backend → YourAI Seller (ধাপে ধাপে)

Reference: [my.ecomdrivebd.com](https://my.ecomdrivebd.com/) (v1.9.30), [ecomdrivebd.com](https://www.ecomdrivebd.com/)

---

## Ecomdrive backend মূলত কী করে

| # | Service | কাজ |
|---|---------|-----|
| 1 | **Auth & Tenant** | Store/account, login, employee roles, subscription active/inactive |
| 2 | **Order Hub** | সব channel থেকে order (Web, WooCommerce, Shopify, Manual, WhatsApp) এক জায়গায় |
| 3 | **Order Workflow** | Status: Pending → Confirmed → Processing → Courier → Delivered / Cancel / RTO |
| 4 | **Courier API** | Pathao, Steadfast, RedX, Paperfly, Ecourier — consignment, tracking, order note sync |
| 5 | **Fraud / Block** | Duplicate phone, fake order, block list — order create block |
| 6 | **Product & Stock** | Product list, variant, stock, sync from WooCommerce |
| 7 | **Channel Sync** | WooCommerce webhook, additional sites, product sync |
| 8 | **SMS** | Template, bulk send, order status SMS |
| 9 | **Auto Call** | IVR / auto dial on new order |
| 10 | **Meta Ads** | Campaign link, conversion tracking |
| 11 | **Accounting** | COD, expense, profit, courier charge |
| 12 | **HRM & Tasks** | Employee, attendance, task assign |
| 13 | **Automation** | Rule: order received → verify stock → courier → SMS |
| 14 | **Reports** | Web order report, employee report, export CSV |
| 15 | **REST API + Webhooks** | External integration (Laravel shop, custom source) |

---

## YourAI Seller — এখন কোথায়

| Area | Status |
|------|--------|
| UI (sidebar, pages) | ✅ প্রায় সব module page আছে |
| Signup / Approve / Activate | ✅ localStorage demo |
| Feature ON/OFF per user | ✅ |
| Real database / API | ❌ নেই |
| Order CRUD / courier send | ❌ mock table only |
| WooCommerce / SMS / Reports | ❌ UI shell |

---

## Apply করার ধাপ (recommended)

### Phase 1 — Order Engine (প্রথমে এটা)
- [ ] PostgreSQL + Prisma schema (`Store`, `User`, `Order`, `OrderItem`, `OrderNote`)
- [ ] Next.js API: `POST/GET/PATCH /api/orders`
- [ ] Web Order List → real data, status change, search/filter
- [ ] Approved Orders → same DB, filtered status

### Phase 2 — Courier
- [ ] Courier settings (API keys per store)
- [ ] Steadfast / Pathao adapter (create parcel, tracking id)
- [ ] Delivery Methods page → connect keys
- [ ] Order note → courier portal (Ecomdrive recent fix area)

### Phase 3 — Channel Sync
- [ ] WooCommerce REST + webhook (`order.created`)
- [ ] Sync Products page → pull/push products
- [ ] Additional Sites → multi-store config

### Phase 4 — Customer & Fraud
- [ ] Customer DB from orders
- [ ] Order Block List → block phone before order
- [ ] Duplicate order detection

### Phase 5 — SMS + Auto Call
- [ ] SMS gateway (e.g. BulkSMS BD provider)
- [ ] Templates on status change
- [ ] Auto Call Center queue (provider API)

### Phase 6 — Inventory & Accounting
- [ ] Product CRUD, stock decrement on confirm
- [ ] Accounting entries from orders + courier cost

### Phase 7 — Reports & Automation
- [ ] Report aggregates (date range, export)
- [ ] Automation rules engine (trigger → action)

### Phase 8 — Production Auth
- [ ] Replace localStorage users → DB + bcrypt + JWT/session
- [ ] Team roles (admin, manager, call center)
- [ ] Server-side feature flag check

---

## Tech stack (Ecomdrive-style long term)

```
Next.js API Routes  →  Prisma  →  PostgreSQL
                    ↘  Redis (queue: courier, SMS, webhooks)
                    ↘  REST + Webhooks for shops
```

Courier: separate `lib/couriers/steadfast.ts`, `pathao.ts`  
Channels: `lib/integrations/woocommerce.ts`

---

## পরবর্তী কাজ (এক লাইন)

**Phase 1 শুরু করলে:** Web Order List থেকে mock সরিয়ে real order API + database বসবে — বাকি module একই pattern follow করবে।
