import { NextResponse } from "next/server";
import { getSellerSessionUser } from "@/lib/seller-auth-server";
import {
  pullIncompleteCaptureQueue,
  pullPushedOrderQueue,
} from "@/lib/incomplete-capture-server";

export const dynamic = "force-dynamic";

/** The seller dashboard polls this, pulls captured checkouts + instant-pushed
 *  orders, and clears both queues. */
export async function GET() {
  const user = await getSellerSessionUser();
  if (!user) return NextResponse.json({ items: [], orders: [] });
  const id = String(user.id);
  return NextResponse.json({
    items: pullIncompleteCaptureQueue(id),
    orders: pullPushedOrderQueue(id),
  });
}
