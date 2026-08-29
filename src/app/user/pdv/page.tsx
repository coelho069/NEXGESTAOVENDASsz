"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PosPage from "@/app/pos/page";

export default function UserPdvPage() {
  return (
    <Suspense>
      <UserPdvInner />
    </Suspense>
  );
}

function UserPdvInner() {
  const denied = useSearchParams().get("denied") === "1";
  return (
    <>
      {denied && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl bg-rose-600 px-4 py-2 text-sm text-white shadow-lg">
          Acesso negado. Essa área é de administrador.
        </div>
      )}
      <PosPage />
    </>
  );
}
