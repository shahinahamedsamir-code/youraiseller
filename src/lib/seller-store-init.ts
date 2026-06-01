/** Initialize empty per-seller localStorage (no shared "default" bucket). */

export function ensureSellerStoresForUser(userId: string, isDemo: boolean): void {
  if (typeof window === "undefined" || isDemo) return;

  const ordersKey = `youraiseller-orders-${userId}`;
  if (!localStorage.getItem(ordersKey)) {
    localStorage.setItem(ordersKey, JSON.stringify({ orders: [] }));
  }

  const inventoryKey = `youraiseller-inventory-${userId}`;
  if (!localStorage.getItem(inventoryKey)) {
    localStorage.setItem(
      inventoryKey,
      JSON.stringify({
        products: [],
        categories: [],
        brands: [],
        movements: [],
      })
    );
  }

  const customersKey = `youraiseller-customers-${userId}`;
  if (!localStorage.getItem(customersKey)) {
    localStorage.setItem(customersKey, JSON.stringify([]));
  }
}
