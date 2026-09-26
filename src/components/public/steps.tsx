import { Stagger, StaggerItem } from "@/components/motion/stagger";

export type Step = {
  title: string;
  description: string;
};

/**
 * Numbered process steps. The marker is a square rotated 45 degrees, with the
 * number counter-rotated so it stays upright.
 */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <Stagger className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
      {steps.map((step, index) => (
        <StaggerItem key={step.title} className="flex flex-col items-center text-center">
          <div
            className="bg-primary flex size-20 rotate-45 items-center justify-center"
            aria-hidden
          >
            <span className="font-heading text-primary-foreground -rotate-45 text-2xl font-medium">
              {String(index + 1).padStart(2, "0")}.
            </span>
          </div>
          <h3 className="mt-8 text-xl">{step.title}</h3>
          <p className="text-muted-foreground mt-3 text-[0.95rem] leading-relaxed">
            {step.description}
          </p>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
