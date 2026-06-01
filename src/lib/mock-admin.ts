/** Fixed demo data — no Math.random() (prevents hydration mismatch) */

export const orderCounts30Days = [
  { day: "1", created: 18, courier: 15 },
  { day: "2", created: 22, courier: 19 },
  { day: "3", created: 14, courier: 12 },
  { day: "4", created: 25, courier: 21 },
  { day: "5", created: 19, courier: 17 },
  { day: "6", created: 16, courier: 14 },
  { day: "7", created: 28, courier: 24 },
  { day: "8", created: 21, courier: 18 },
  { day: "9", created: 17, courier: 15 },
  { day: "10", created: 23, courier: 20 },
  { day: "11", created: 20, courier: 17 },
  { day: "12", created: 15, courier: 13 },
  { day: "13", created: 26, courier: 22 },
  { day: "14", created: 19, courier: 16 },
  { day: "15", created: 24, courier: 21 },
  { day: "16", created: 18, courier: 15 },
  { day: "17", created: 22, courier: 19 },
  { day: "18", created: 16, courier: 14 },
  { day: "19", created: 27, courier: 23 },
  { day: "20", created: 20, courier: 18 },
  { day: "21", created: 14, courier: 12 },
  { day: "22", created: 23, courier: 20 },
  { day: "23", created: 19, courier: 16 },
  { day: "24", created: 25, courier: 22 },
  { day: "25", created: 17, courier: 14 },
  { day: "26", created: 21, courier: 18 },
  { day: "27", created: 15, courier: 13 },
  { day: "28", created: 24, courier: 21 },
  { day: "29", created: 18, courier: 15 },
  { day: "30", created: 22, courier: 19 },
];

export const hourlyOrders = [
  { hour: "00:00", today: 2, yesterday: 1 },
  { hour: "01:00", today: 1, yesterday: 0 },
  { hour: "02:00", today: 0, yesterday: 1 },
  { hour: "03:00", today: 1, yesterday: 0 },
  { hour: "04:00", today: 0, yesterday: 0 },
  { hour: "05:00", today: 1, yesterday: 1 },
  { hour: "06:00", today: 2, yesterday: 2 },
  { hour: "07:00", today: 4, yesterday: 3 },
  { hour: "08:00", today: 6, yesterday: 5 },
  { hour: "09:00", today: 8, yesterday: 7 },
  { hour: "10:00", today: 10, yesterday: 8 },
  { hour: "11:00", today: 9, yesterday: 7 },
  { hour: "12:00", today: 7, yesterday: 6 },
  { hour: "13:00", today: 8, yesterday: 7 },
  { hour: "14:00", today: 9, yesterday: 8 },
  { hour: "15:00", today: 10, yesterday: 9 },
  { hour: "16:00", today: 11, yesterday: 9 },
  { hour: "17:00", today: 10, yesterday: 8 },
  { hour: "18:00", today: 8, yesterday: 7 },
  { hour: "19:00", today: 7, yesterday: 6 },
  { hour: "20:00", today: 6, yesterday: 5 },
  { hour: "21:00", today: 5, yesterday: 4 },
  { hour: "22:00", today: 3, yesterday: 3 },
  { hour: "23:00", today: 2, yesterday: 2 },
];

export const topProducts = [
  { name: "Premium Cotton T-Shirt", sales: 142, pct: 100 },
  { name: "Wireless Earbuds Pro", sales: 98, pct: 69 },
  { name: "Smart Watch Band", sales: 87, pct: 61 },
  { name: "Skincare Bundle Set", sales: 76, pct: 54 },
  { name: "LED Ring Light 10\"", sales: 65, pct: 46 },
  { name: "USB-C Hub 7-in-1", sales: 54, pct: 38 },
  { name: "Gaming Mouse Pad XL", sales: 48, pct: 34 },
  { name: "Phone Case iPhone 15", sales: 41, pct: 29 },
];

export const approvedOrders = [
  { id: "AO-8821", customer: "Rahim Uddin", amount: 1290, courier: "Steadfast", status: "shipped" },
  { id: "AO-8820", customer: "Sadia Akter", amount: 2490, courier: "Pathao", status: "delivered" },
  { id: "AO-8819", customer: "Karim Hassan", amount: 890, courier: "RedX", status: "processing" },
  { id: "AO-8818", customer: "Nusrat Jahan", amount: 3200, courier: "Steadfast", status: "shipped" },
];

export const inventoryItems = [
  { sku: "SKU-001", name: "Premium T-Shirt (L)", stock: 142, reserved: 12, price: 1290 },
  { sku: "SKU-002", name: "Wireless Earbuds", stock: 38, reserved: 5, price: 2490 },
  { sku: "SKU-003", name: "Smart Watch Band", stock: 0, reserved: 0, price: 890 },
  { sku: "SKU-004", name: "Skincare Bundle", stock: 67, reserved: 3, price: 3200 },
];

export const customers = [
  { id: "C-101", name: "Rahim Uddin", phone: "01712345678", orders: 12, spent: 28400 },
  { id: "C-102", name: "Sadia Akter", phone: "01898765432", orders: 8, spent: 19200 },
  { id: "C-103", name: "Karim Hassan", phone: "01611223344", orders: 3, spent: 5400 },
];

export const smsTemplates = [
  { id: 1, name: "Order Confirm", body: "আপনার অর্ডার #{id} কনফার্ম হয়েছে।" },
  { id: 2, name: "Out for Delivery", body: "আপনার পার্সেল ডেলিভারির পথে।" },
  { id: 3, name: "Payment Reminder", body: "অগ্রিম পেমেন্ট বাকি আছে।" },
];

export const deliveryMethods = [
  { name: "Steadfast", enabled: true, cod: true },
  { name: "Pathao", enabled: true, cod: true },
  { name: "RedX", enabled: true, cod: false },
  { name: "SA Paribahan", enabled: false, cod: true },
];

export const employees = [
  { id: "E-01", name: "Aminul Islam", role: "Manager", orders: 156, status: "active" },
  { id: "E-02", name: "Farhana Begum", role: "Staff", orders: 89, status: "active" },
  { id: "E-03", name: "Tanvir Ahmed", role: "Moderator", orders: 124, status: "active" },
];

export const tasks = [
  { id: "T-1", title: "Follow up WO-1040", assignee: "Farhana", due: "Today", priority: "high" },
  { id: "T-2", title: "Sync WooCommerce products", assignee: "Aminul", due: "Tomorrow", priority: "medium" },
  { id: "T-3", title: "Review blocked orders", assignee: "Tanvir", due: "20 May", priority: "low" },
];

export const founderMetrics = [
  { label: "Monthly Revenue", value: "৳4.2L", trend: 12.4 },
  { label: "Net Profit", value: "৳1.1L", trend: 8.2 },
  { label: "Active Staff", value: "12", trend: 0 },
  { label: "Conversion Rate", value: "3.8%", trend: -0.4 },
];
