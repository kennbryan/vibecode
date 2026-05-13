"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";

export function HeaderShell() {
  const pathname = usePathname();

  if (pathname === "/embed") {
    return null;
  }

  return <Header />;
}
