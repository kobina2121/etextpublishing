"use client";

import slugify from "slugify";
import { WandSparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Slug input with a "generate from title" affordance. */
export function SlugField({
  id,
  value,
  onChange,
  sourceValue,
  prefix,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  sourceValue: string;
  prefix: string;
}) {
  return (
    <>
      <div className="flex gap-2">
        <Input
          id={id}
          className="font-mono"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (sourceValue)
              onChange(slugify(sourceValue, { lower: true, strict: true, trim: true }));
          }}
        >
          <WandSparklesIcon aria-hidden />
          <span className="sr-only sm:not-sr-only">Generate</span>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Public URL:{" "}
        <span className="font-mono">
          {prefix}/{value || "…"}
        </span>
        . Changing it breaks existing links.
      </p>
    </>
  );
}
