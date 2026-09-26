"use client";

import { useFieldArray, type Control, type FieldValues, type Path } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Repeatable label/URL rows, used for author socials and site settings.
 *
 * `useFieldArray` gives each row a stable key, so removing the middle row does
 * not make React reuse the wrong input state.
 */
export function LinkListField<T extends FieldValues>({
  control,
  name,
  addLabel = "Add link",
}: {
  control: Control<T>;
  name: Path<T>;
  addLabel?: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: name as never });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Input
            placeholder="Label"
            className="sm:w-40"
            {...control.register(`${name}.${index}.label` as Path<T>)}
          />
          <Input
            placeholder="https://…"
            className="flex-1"
            {...control.register(`${name}.${index}.href` as Path<T>)}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => remove(index)}>
            <Trash2Icon aria-hidden />
            <span className="sr-only">Remove link</span>
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ label: "", href: "" } as never)}
      >
        <PlusIcon aria-hidden />
        {addLabel}
      </Button>
    </div>
  );
}
