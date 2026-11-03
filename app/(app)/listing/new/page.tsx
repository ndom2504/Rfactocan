"use client";

import { Suspense } from "react";
import { MarketplaceListingForm } from "@/components/marketplace-listing-form";

export default function NewListingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">…</p>}>
      <MarketplaceListingForm />
    </Suspense>
  );
}
