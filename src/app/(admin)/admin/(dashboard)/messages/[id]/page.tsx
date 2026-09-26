import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon, MailIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { MessageActions } from "@/app/(admin)/admin/(dashboard)/messages/message-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMessage } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Message" };

export default async function MessageDetailPage({ params }: PageProps<"/admin/messages/[id]">) {
  const { id } = await params;
  const message = await getMessage(id);
  if (!message) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/admin/messages">
          <ArrowLeftIcon aria-hidden />
          All messages
        </Link>
      </Button>

      <AdminPageHeader
        title={message.subject}
        description={`From ${message.name} · ${format(message.createdAt, "d MMMM yyyy, HH:mm")}`}
        actions={
          <MessageActions
            id={message.id}
            subject={message.subject}
            read={message.read}
            archived={message.archived}
            onDeletedHref="/admin/messages"
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message}</p>

          <dl className="grid gap-x-8 gap-y-4 border-t border-border pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Email
              </dt>
              <dd className="mt-1 text-sm break-words">
                <a
                  href={`mailto:${message.email}`}
                  className="underline underline-offset-4 hover:text-primary"
                >
                  {message.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Phone
              </dt>
              <dd className="mt-1 text-sm">{message.phone || "—"}</dd>
            </div>
          </dl>

          <Button asChild variant="outline">
            <a
              href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
            >
              <MailIcon aria-hidden />
              Reply by email
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
