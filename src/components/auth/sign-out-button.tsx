"use client";

import { signOut } from "next-auth/react";
import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SignOutButton({ redirectTo = "/" }: { redirectTo?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void signOut({ callbackUrl: redirectTo })}
      className="font-semibold tracking-[0.08em] uppercase"
    >
      <LogOutIcon aria-hidden />
      Sign out
    </Button>
  );
}
