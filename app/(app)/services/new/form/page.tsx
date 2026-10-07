"use client";

import { Suspense } from "react";
import { NewServiceForm } from "@/components/new-service-form";

export default function NewServiceFormPage() {
  return (
    <Suspense>
      <NewServiceForm />
    </Suspense>
  );
}
