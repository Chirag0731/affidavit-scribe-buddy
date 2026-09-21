import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: number;
  stepNumber: number;
  key: string;
  title: string;
  subtitle: string;
}

export const FINANCING_STEPS: StepItem[] = [
  { id: 0, stepNumber: 1, key: "business", title: "Business Info", subtitle: "Legal & operations" },
  { id: 1, stepNumber: 2, key: "financials", title: "Funding & Revenue", subtitle: "Request & sales" },
  { id: 2, stepNumber: 3, key: "owners", title: "Owners & Officers", subtitle: "Ownership structure" },
  { id: 3, stepNumber: 4, key: "financing", title: "Existing Financing", subtitle: "Current facilities" },
  { id: 4, stepNumber: 5, key: "operations", title: "Property & Trade", subtitle: "Lease & suppliers" },
  { id: 5, stepNumber: 6, key: "review", title: "Review & Sign", subtitle: "Verification & submit" },
];

interface FinancingStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps?: number[];
}

export function FinancingStepper({
  currentStep,
  onStepClick,
  completedSteps = [],
}: FinancingStepperProps) {
  const currentIdx = Math.max(0, Math.min(currentStep, FINANCING_STEPS.length - 1));
  const progressPct = Math.round(((currentIdx + 1) / FINANCING_STEPS.length) * 100);

  return (
    <div className="w-full space-y-4">
      {/* Mobile summary bar */}
      <div className="lg:hidden flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
        <span>
          Step {currentIdx + 1} of {FINANCING_STEPS.length}:{" "}
          <strong className="text-foreground">{FINANCING_STEPS[currentIdx]?.title}</strong>
        </span>
        <span className="font-semibold text-cyan-400">{progressPct}% Complete</span>
      </div>

      {/* Progress track */}
      <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-emerald-500 transition-all duration-300 rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Desktop step indicators */}
      <nav aria-label="Progress" className="hidden lg:block">
        <ol className="flex items-center justify-between gap-2">
          {FINANCING_STEPS.map((step) => {
            const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <li key={step.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => onStepClick(step.id)}
                  className={cn(
                    "w-full group text-left p-2.5 rounded-xl border transition-all duration-200 cursor-pointer",
                    isCurrent
                      ? "border-cyan-500/70 bg-cyan-950/40 shadow-sm ring-1 ring-cyan-500/30"
                      : isCompleted
                      ? "border-border/80 bg-card hover:bg-muted/30"
                      : "border-transparent bg-transparent hover:bg-muted/20 opacity-70"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                        isCurrent
                          ? "bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-400/30"
                          : isCompleted
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      ) : (
                        step.stepNumber
                      )}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-xs font-semibold truncate",
                          isCurrent
                            ? "text-cyan-300"
                            : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
