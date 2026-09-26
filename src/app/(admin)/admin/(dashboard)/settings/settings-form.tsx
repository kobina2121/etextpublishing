"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { LinkListField } from "@/components/admin/link-list-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { siteSettingsSchema, type SiteSettingsInput } from "@/lib/validations/content";
import { updateSiteSettings } from "@/server/actions/inbox";
import type { SettingsFormValues } from "@/server/admin/queries";

const EMPTY: SettingsFormValues = {
  name: "",
  tagline: "",
  description: "",
  contact: {
    email: "",
    phone: "",
    address: { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" },
  },
  socials: [],
  footerText: "",
};

export function SettingsForm({ initial }: { initial: SettingsFormValues | null }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: initial ?? EMPTY,
  });

  const onSubmit = async (values: SiteSettingsInput) => {
    setFormError(null);
    const result = await updateSiteSettings(values);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.refresh();
    } else {
      setFormError(result.error);
      toast.error(result.error);
    }
  };

  const address = errors.contact?.address;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-3xl space-y-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <FieldGroup>
                  <Field data-invalid={!!errors.name}>
                    <FieldLabel htmlFor="set-name">Company name</FieldLabel>
                    <Input id="set-name" {...register("name")} />
                    <FieldDescription>Used in the header, footer and page titles.</FieldDescription>
                    <FieldError errors={[errors.name]} />
                  </Field>

                  <Field data-invalid={!!errors.tagline}>
                    <FieldLabel htmlFor="set-tagline">Tagline</FieldLabel>
                    <Input id="set-tagline" {...register("tagline")} />
                    <FieldError errors={[errors.tagline]} />
                  </Field>

                  <Field data-invalid={!!errors.description}>
                    <FieldLabel htmlFor="set-description">Description</FieldLabel>
                    <Textarea id="set-description" rows={4} {...register("description")} />
                    <FieldDescription>
                      The default meta description for search results.
                    </FieldDescription>
                    <FieldError errors={[errors.description]} />
                  </Field>

                  <Field data-invalid={!!errors.footerText}>
                    <FieldLabel htmlFor="set-footer">Footer note</FieldLabel>
                    <Input id="set-footer" {...register("footerText")} />
                    <FieldError errors={[errors.footerText]} />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <FieldGroup>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!errors.contact?.email}>
                      <FieldLabel htmlFor="set-email">Email</FieldLabel>
                      <Input id="set-email" type="email" {...register("contact.email")} />
                      <FieldError errors={[errors.contact?.email]} />
                    </Field>

                    <Field data-invalid={!!errors.contact?.phone}>
                      <FieldLabel htmlFor="set-phone">Phone</FieldLabel>
                      <Input id="set-phone" {...register("contact.phone")} />
                      <FieldError errors={[errors.contact?.phone]} />
                    </Field>
                  </div>

                  <Field data-invalid={!!address?.line1}>
                    <FieldLabel htmlFor="set-line1">Address line 1</FieldLabel>
                    <Input id="set-line1" {...register("contact.address.line1")} />
                    <FieldError errors={[address?.line1]} />
                  </Field>

                  <Field data-invalid={!!address?.line2}>
                    <FieldLabel htmlFor="set-line2">Address line 2</FieldLabel>
                    <Input id="set-line2" {...register("contact.address.line2")} />
                    <FieldError errors={[address?.line2]} />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!address?.city}>
                      <FieldLabel htmlFor="set-city">City</FieldLabel>
                      <Input id="set-city" {...register("contact.address.city")} />
                      <FieldError errors={[address?.city]} />
                    </Field>

                    <Field data-invalid={!!address?.region}>
                      <FieldLabel htmlFor="set-region">Region</FieldLabel>
                      <Input id="set-region" {...register("contact.address.region")} />
                      <FieldError errors={[address?.region]} />
                    </Field>

                    <Field data-invalid={!!address?.postalCode}>
                      <FieldLabel htmlFor="set-postal">Postal code</FieldLabel>
                      <Input id="set-postal" {...register("contact.address.postalCode")} />
                      <FieldError errors={[address?.postalCode]} />
                    </Field>

                    <Field data-invalid={!!address?.country}>
                      <FieldLabel htmlFor="set-country">Country</FieldLabel>
                      <Input id="set-country" {...register("contact.address.country")} />
                      <FieldError errors={[address?.country]} />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="pt-4">
          <Card>
            <CardContent className="pt-6">
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Social links</FieldLabel>
                    <LinkListField control={control} name="socials" addLabel="Add social link" />
                    <FieldDescription>Shown in the footer.</FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? <Spinner /> : null}
        Save settings
      </Button>
    </form>
  );
}
