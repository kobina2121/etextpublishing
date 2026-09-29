"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { FULFILMENT_STATUSES, type FulfilmentStatusValue } from "@/models/types";
import { setOrderFulfilment } from "@/server/actions/orders";

const LABELS: Record<string, string> = {
  not_required: "Not required",
  pending: "Awaiting dispatch",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
};

export function FulfilmentForm({
  id,
  fulfilment,
  adminNotes,
  canFulfil,
}: {
  id: string;
  fulfilment: string;
  adminNotes: string;
  canFulfil: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(fulfilment);
  const [notes, setNotes] = useState(adminNotes);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const result = await setOrderFulfilment(id, value as FulfilmentStatusValue, notes);
    setSaving(false);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fulfilment</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldSet>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ord-fulfilment">Status</FieldLabel>
              <Select value={value} onValueChange={setValue} disabled={!canFulfil}>
                <SelectTrigger id="ord-fulfilment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FULFILMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LABELS[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {canFulfil
                  ? "Only fulfilment can be changed here. Payment is settled against Paystack."
                  : "This order is not paid, so it cannot be moved through fulfilment."}
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="ord-notes">Internal notes</FieldLabel>
              <Textarea
                id="ord-notes"
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <FieldDescription>Never shown to the customer.</FieldDescription>
            </Field>

            <div>
              <Button onClick={save} disabled={saving || !canFulfil}>
                {saving ? <Spinner /> : null}
                Save
              </Button>
            </div>
          </FieldGroup>
        </FieldSet>
      </CardContent>
    </Card>
  );
}
