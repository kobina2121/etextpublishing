import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubmission } from "@/server/admin/queries";

import { SubmissionWorkflow } from "./submission-workflow";

export const metadata: Metadata = { title: "Submission" };

export default async function SubmissionDetailPage({
  params,
}: PageProps<"/admin/manuscripts/[id]">) {
  const { id } = await params;
  const submission = await getSubmission(id);
  if (!submission) notFound();

  const details = [
    { label: "Author", value: submission.authorName },
    { label: "Email", value: submission.email },
    { label: "Phone", value: submission.phone || "—" },
    { label: "Genre", value: submission.genre },
    { label: "Preferred format", value: submission.preferredFormat || "—" },
    { label: "Word count", value: submission.wordCount.toLocaleString() },
    { label: "Received", value: format(submission.submittedAt, "d MMMM yyyy") },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/manuscripts">
          <ArrowLeftIcon aria-hidden />
          All submissions
        </Link>
      </Button>

      <AdminPageHeader
        title={submission.title}
        description={`Submitted by ${submission.authorName}`}
        actions={<StatusBadge status={submission.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Synopsis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">
              {submission.synopsis}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {details.map((detail) => (
                  <div key={detail.label}>
                    <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                      {detail.label}
                    </dt>
                    <dd className="mt-1 text-sm break-words">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Alert>
            <AlertTitle>Manuscript file</AlertTitle>
            <AlertDescription>
              {submission.fileName
                ? `${submission.fileName} (${(submission.fileSize / 1024 / 1024).toFixed(1)} MB). Secure download arrives with file storage in the next phase.`
                : "No file is attached. Uploads are wired up with secure storage in the next phase."}
            </AlertDescription>
          </Alert>
        </div>

        <SubmissionWorkflow
          id={submission.id}
          title={submission.title}
          status={submission.status}
          adminNotes={submission.adminNotes}
        />
      </div>
    </div>
  );
}
