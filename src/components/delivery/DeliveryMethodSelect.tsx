"use client";

import { useEffect, useState } from "react";
import {
  loadActiveDeliveryMethods,
  type DeliveryMethod,
} from "@/lib/delivery-methods-store";

type Props = {
  value: string;
  onChange: (deliveryMethodId: string) => void;
  className?: string;
  emptyLabel?: string;
};

export function DeliveryMethodSelect({
  value,
  onChange,
  className,
  emptyLabel = "Default",
}: Props) {
  const [methods, setMethods] = useState<DeliveryMethod[]>([]);

  useEffect(() => {
    const refresh = () => setMethods(loadActiveDeliveryMethods());
    refresh();
    window.addEventListener("youraiseller-delivery-methods-updated", refresh);
    return () =>
      window.removeEventListener("youraiseller-delivery-methods-updated", refresh);
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">{emptyLabel}</option>
      {methods.length === 0 ? (
        <option value="" disabled>
          Add delivery methods first
        </option>
      ) : (
        methods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.preferred ? " ★" : ""}
          </option>
        ))
      )}
    </select>
  );
}
