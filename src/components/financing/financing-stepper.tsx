import { Check } from "lucide-react";

export interface StepItem {
  id: number;
  key: string;
  title: string;
  subtitle: string;
}

export const FINANCING_STEPS: StepItem[] = [
  { id: 1, key: "business", title: "Business Info", subtitle: "Legal & operations" },
  { id: 2, key: "financials", title: "Funding & Revenue", subtitle: "Request & sales" },
  { id: 3, key: "owners", title: "Owners & Officers", subtitle: "Ownership structure" },
  { id: 4, key: "financing", title: "Existing Financing", subtitle: "Current facilities" },
  { id: 5, key: "operations", title: "Property & Trade", subtitle: "Lease & suppliers" },
  { id: 6, key: "review", title: "Review & Sign", subtitle: "Verification & submit" },
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
  const progressPct = Math.round(((currentStep - 1) / (FINANCING_STEPS.length - 1)) * 100);

  return (
    <div className="w-full space-y-4">
      {/* Mobile summary bar */}
      <div className="lg:hidden flex items-center justify-between text-xs font-medium text-muted-foreground px-1">
        <span>
          Step {currentStep} of {FINANCING_STEPS.length}:{" "}
          <strong className="text-foreground">{FINANCING_STEPS[currentStep - 1]?.title}</strong>
        </span>
        <span className="font-semibold text-primary">{progressPct}% Complete</span>
      </div>

      {/* Progress track */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-300 rounded-full"
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
                  className={`w-full group text-left p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isCurrent
                      ? "border-primary/40 bg-primary/5 shadow-xs"
                      : isCompleted
                      ? "border-border/60 bg-card hover:bg-muted/40"
                      : "border-transparent bg-transparent hover:bg-muted/30 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                          : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/20"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
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
