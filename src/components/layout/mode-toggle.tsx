"use client";

import { useTheme } from "next-themes";
import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Theme toggle.
 *
 * Which icon shows is decided by CSS from the `dark` class on <html>, not by
 * React state. Server and client therefore render identical markup, so there is
 * no hydration mismatch and no need to suppress the first paint.
 */
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block" aria-hidden />
      <MoonIcon className="block dark:hidden" aria-hidden />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
