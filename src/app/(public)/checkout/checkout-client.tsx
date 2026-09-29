"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/money";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/checkout";
import { startCheckout } from "@/server/actions/checkout";
import type { PricedCart } from "@/server/cart";

/**
 * Checkout.
 *
 * The form collects an address only when the basket contains something that
 * has to be posted, and that decision is made from the server-priced basket,
 * not from anything the browser decided. The server re-derives it again before
 * charging.
 */
export function CheckoutClient() {
  const cart = useCart();
  const [priced, setPriced] = useState<PricedCart | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [redirecting, setRedirecting] = useState(false);

  const loading = priced === null;

  useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;

    void fetch("/api/cart/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cart),
    })
      .then((r) => r.json() as Promise<PricedCart>)
      .then((data) => {
        if (!cancelled) setPriced(data);
      })
      .catch(() => {
        if (!cancelled) {
          setPriced({
            lines: [],
            total: 0,
            currency: "GHS",
            requiresShipping: false,
            problems: [],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cart]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      email: "",
      phone: "",
      requiresShipping: false,
      address: { line1: "", line2: "", city: "", region: "", postalCode: "", country: "Ghana" },
      website: "",
    },
  });

  if (cart.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Your basket is empty.{" "}
          <Link href="/publications" className="underline underline-offset-4">
            Browse publications
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) return <Skeleton className="h-96 w-full" />;

  if (priced.lines.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Nothing in your basket is available to buy.</AlertDescription>
      </Alert>
    );
  }

  const requiresShipping = priced.requiresShipping;

  const onSubmit = async (values: CheckoutInput) => {
    setFormError(null);
    setProblems([]);

    const result = await startCheckout({
      cart,
      // Taken from the server-priced basket, not from the form, so the two
      // cannot disagree about whether an address was needed.
      details: { ...values, requiresShipping },
    });

    if (result.ok) {
      setRedirecting(true);
      // assign() rather than setting location.href: the React compiler lint
      // treats the assignment as mutating a value from outside the component.
      window.location.assign(result.authorizationUrl);
      return;
    }

    setFormError(result.error);
    if (result.problems) setProblems(result.problems);
    for (const [name, messages] of Object.entries(result.fieldErrors ?? {})) {
      if (messages[0]) setError(name as keyof CheckoutInput, { message: messages[0] });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="grid gap-10 lg:grid-cols-[1fr_20rem]"
    >
      <div className="space-y-6">
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {formError}
              {problems.length > 0 ? (
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <FieldSet>
          <FieldGroup>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="sr-only"
              {...register("website")}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={!!errors.customerName}>
                <FieldLabel htmlFor="co-name">Full name</FieldLabel>
                <Input id="co-name" autoComplete="name" {...register("customerName")} />
                <FieldError errors={[errors.customerName]} />
              </Field>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="co-email">Email</FieldLabel>
                <Input id="co-email" type="email" autoComplete="email" {...register("email")} />
                <FieldError errors={[errors.email]} />
              </Field>
            </div>

            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="co-phone">
                Phone {requiresShipping ? "" : "(optional)"}
              </FieldLabel>
              <Input id="co-phone" type="tel" autoComplete="tel" {...register("phone")} />
              <FieldError errors={[errors.phone]} />
            </Field>

            {requiresShipping ? (
              <>
                <Field data-invalid={!!errors.address?.line1}>
                  <FieldLabel htmlFor="co-line1">Address</FieldLabel>
                  <Input
                    id="co-line1"
                    autoComplete="address-line1"
                    {...register("address.line1")}
                  />
                  <FieldError errors={[errors.address?.line1]} />
                </Field>

                <Field>
                  <FieldLabel htmlFor="co-line2">Address line 2 (optional)</FieldLabel>
                  <Input
                    id="co-line2"
                    autoComplete="address-line2"
                    {...register("address.line2")}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field data-invalid={!!errors.address?.city}>
                    <FieldLabel htmlFor="co-city">City</FieldLabel>
                    <Input
                      id="co-city"
                      autoComplete="address-level2"
                      {...register("address.city")}
                    />
                    <FieldError errors={[errors.address?.city]} />
                  </Field>

                  <Field data-invalid={!!errors.address?.region}>
                    <FieldLabel htmlFor="co-region">Region</FieldLabel>
                    <Input
                      id="co-region"
                      autoComplete="address-level1"
                      {...register("address.region")}
                    />
                    <FieldError errors={[errors.address?.region]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="co-postal">Postal code (optional)</FieldLabel>
                    <Input
                      id="co-postal"
                      autoComplete="postal-code"
                      {...register("address.postalCode")}
                    />
                  </Field>

                  <Field data-invalid={!!errors.address?.country}>
                    <FieldLabel htmlFor="co-country">Country</FieldLabel>
                    <Input
                      id="co-country"
                      autoComplete="country-name"
                      {...register("address.country")}
                    />
                    <FieldError errors={[errors.address?.country]} />
                  </Field>
                </div>
              </>
            ) : null}
          </FieldGroup>
        </FieldSet>
      </div>

      <aside className="h-fit border border-border p-6">
        <h2 className="font-semibold tracking-[0.14em] uppercase">Order</h2>
        <ul className="mt-5 space-y-3 text-sm">
          {priced.lines.map((line) => (
            <li key={line.publicationId} className="flex justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate">{line.title}</span>
                <span className="text-xs text-muted-foreground">
                  {line.quantity} × {formatMoney(line.unitPrice, priced.currency)}
                </span>
              </span>
              <span className="shrink-0">{formatMoney(line.lineTotal, priced.currency)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-between border-t border-border pt-4 text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(priced.total, priced.currency)}</span>
        </div>

        <Button
          type="submit"
          size="xl"
          disabled={isSubmitting || redirecting}
          className="mt-6 w-full font-semibold tracking-[0.1em] uppercase"
        >
          {isSubmitting || redirecting ? <Spinner /> : <LockIcon aria-hidden />}
          {redirecting ? "Redirecting…" : "Pay with Paystack"}
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          You will be taken to Paystack to pay. Card details are never handled by this site.
        </p>
      </aside>
    </form>
  );
}
