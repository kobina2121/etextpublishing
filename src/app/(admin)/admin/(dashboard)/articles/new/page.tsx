import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";

import { JournalForm } from "../journal-form";
import { journalStorage } from "../storage";

export const metadata: Metadata = { title: "New article" };

export default function NewJournalPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <AdminPageHeader title="New article" description="Free for anyone to read once published." />
      <JournalForm {...journalStorage()} />
    </div>
  );
}
