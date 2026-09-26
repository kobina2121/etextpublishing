"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success("Publication saved")}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => toast.error("Upload failed")}>
        Error toast
      </Button>
    </div>
  );
}
