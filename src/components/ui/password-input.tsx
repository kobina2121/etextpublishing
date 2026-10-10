"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { cn } from "cn";

import { Input } from "@/components/ui/input";

/**
 * A password field with a show/hide toggle.
 *
 * Drop-in for `<Input type="password">`: every prop, including the `ref` that
 * react-hook-form's `register` passes, goes straight to the input.
 *
 * The toggle is a real button, so it is reachable by keyboard and announced by
 * screen readers, and it reports its state with `aria-pressed`. It never
 * submits the form. Hiding again on submit is not needed: the page navigates
 * or resets the form either way.
 */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      >
        {visible ? (
          <EyeOffIcon className="size-4" aria-hidden />
        ) : (
          <EyeIcon className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
