"use client";

import { signOut } from "next-auth/react";
import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
      <LogOutIcon aria-hidden />
      Sign out
    </Button>
  );
}
