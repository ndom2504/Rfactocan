"use client";

import { Suspense } from "react";
import { NewServiceForm } from "@/components/new-service-form";

export default function NewServicePage() {
  return (
    <Suspense>
      <NewServiceForm />
    </Suspense>
  );
}
