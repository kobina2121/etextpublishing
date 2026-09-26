import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSettingsForEdit } from "@/server/admin/queries";

import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSettingsForEdit();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <AdminPageHeader
        title="Site settings"
        description="Company details used across the public website."
      />

      {settings ? null : (
        <Alert className="mb-6">
          <AlertTitle>Not configured yet</AlertTitle>
          <AlertDescription>
            No settings record exists. Saving this form creates one.
          </AlertDescription>
        </Alert>
      )}

      <SettingsForm initial={settings} />
    </div>
  );
}
