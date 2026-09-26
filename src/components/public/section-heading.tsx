import { Ornament } from "@/components/public/ornament";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
};

export function SectionHeading({
  title,
  subtitle,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <Ornament />
      <h2 className="text-3xl leading-tight sm:text-4xl md:text-[2.75rem]">{title}</h2>
      {subtitle ? <p className="text-muted-foreground text-lg">{subtitle}</p> : null}
    </div>
  );
}
