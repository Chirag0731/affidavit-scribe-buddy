import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  GraduationCap,
  Download,
  Shuffle,
  Save,
  Trash2,
  Plus,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateCredentialPdf } from "@/lib/credential-generator";
import { PdfBlobPreview } from "@/components/pdf-blob-preview";
import {
  DESIGNS,
  DEFAULT_DATE_OPTIONS,
  DEFAULT_GRADE_OPTIONS,
  LETTER_GRADES,
  applyGenderToName,
  computeAverage,
  defaultSpec,
  designMeta,
  randomizeDates,
  randomizeGrades,
  type CredentialSpec,
  type CourseRow,
  type DesignKey,
  type Gender,
  type GradeRandomOptions,
  type DateRandomOptions,
} from "@/types/credentials";

export const Route = createFileRoute("/_authenticated/dashboard/credentials")({
  ssr: false,
  component: CredentialsStudio,
  head: () => ({
    meta: [
      { title: "Transcript & Diploma Generator | Neptora" },
      {
        name: "description",
        content:
          "Build editable college transcripts and high school diplomas from saved templates with grade, date and gender randomisation.",
      },
      { property: "og:title", content: "Transcript & Diploma Generator | Neptora" },
      {
        property: "og:description",
        content: "Template-based transcript and diploma document automation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

interface SavedTemplate {
  id: string;
  name: string;
  kind: string;
  design: string;
  spec: CredentialSpec;
}

function CredentialsStudio() {
  const [design, setDesign] = useState<DesignKey>("sheridan");
  const [spec, setSpec] = useState<CredentialSpec>(() => defaultSpec("sheridan"));
  const [gradeOpts, setGradeOpts] = useState<GradeRandomOptions>(DEFAULT_GRADE_OPTIONS);
  const [dateOpts, setDateOpts] = useState<DateRandomOptions>(DEFAULT_DATE_OPTIONS);
  const [url, setUrl] = useState<string>("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUrl = useRef<string>("");

  const meta = useMemo(() => designMeta(spec.design), [spec.design]);

  const loadTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from("credential_templates" as never)
      .select("id,name,kind,design,spec")
      .order("created_at", { ascending: false });
    if (error) return;
    setTemplates((data ?? []) as unknown as SavedTemplate[]);
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // Live preview (debounced)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const blob = await generateCredentialPdf(spec);
        setPreviewBlob(blob);
        const next = URL.createObjectURL(blob);
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = next;
        setUrl(next);
      } catch (e) {
        console.error(e);
        toast.error("Could not render preview");
      } finally {
        setBusy(false);
      }
    }, 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [spec]);

  useEffect(() => () => {
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
  }, []);

  const set = <K extends keyof CredentialSpec>(key: K, value: CredentialSpec[K]) =>
    setSpec((p) => ({ ...p, [key]: value }));

  const setCourse = (i: number, patch: Partial<CourseRow>) =>
    setSpec((p) => {
      const courses = p.courses.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
      const next = { ...p, courses };
      return { ...next, average: computeAverage(next) };
    });

  const switchDesign = (key: DesignKey) => {
    setDesign(key);
    setSpec(defaultSpec(key));
  };

  const download = async () => {
    const blob = await generateCredentialPdf(spec);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${spec.studentName || "document"} — ${meta.institution}.pdf`.replace(/[/\\]/g, "-");
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  const saveTemplate = async () => {
    const name = templateName.trim() || `${meta.institution} — ${spec.studentName || "Untitled"}`;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("credential_templates" as never).insert({
      name,
      kind: spec.kind,
      design: spec.design,
      spec: spec as unknown as Record<string, unknown>,
      user_id: userData.user?.id,
    } as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Template saved");
    setTemplateName("");
    void loadTemplates();
  };

  const removeTemplate = async (id: string) => {
    const { error } = await supabase.from("credential_templates" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Template deleted");
    void loadTemplates();
  };

  const applyTemplate = (t: SavedTemplate) => {
    const loaded = { ...defaultSpec(t.design as DesignKey), ...t.spec };
    setDesign(loaded.design);
    setSpec(loaded);
    toast.success(`Loaded “${t.name}”`);
  };

  const isPercent = spec.gradeMode === "percent";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transcript / Diploma Generator</h1>
            <p className="text-sm text-muted-foreground">
              Template-driven academic documents — edit every field, randomise grades and dates, export a clean PDF.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSpec(defaultSpec(design))}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button onClick={download}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </header>

      {/* Design picker */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        {DESIGNS.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => switchDesign(d.key)}
            className={`text-left p-3 rounded-xl border text-xs transition-smooth ${
              spec.design === d.key
                ? "border-gold bg-gold/10 text-foreground"
                : "border-border bg-card hover:bg-muted text-muted-foreground"
            }`}
          >
            <div className="font-semibold text-foreground">{d.institution}</div>
            <div className="uppercase tracking-wide text-[10px] mt-1 opacity-70">{d.kind}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* ----------------------------------------------------------- form */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Student</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full name</Label>
                <Input value={spec.studentName} onChange={(e) => set("studentName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Student ID</Label>
                <Input value={spec.studentId} onChange={(e) => set("studentId", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <div className="flex gap-2">
                  <Select
                    value={spec.gender}
                    onValueChange={(v) => set("gender", v as Gender)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    title="Swap first name to match gender"
                    onClick={() => set("studentName", applyGenderToName(spec.studentName, spec.gender))}
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Program</Label>
                <Input value={spec.program} onChange={(e) => set("program", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Plan / Semester</Label>
                <Input value={spec.plan} onChange={(e) => set("plan", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Term / Year</Label>
                <Input value={spec.term} onChange={(e) => set("term", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Student address (one line each)</Label>
                <Textarea
                  rows={2}
                  value={spec.studentAddress.join("\n")}
                  onChange={(e) => set("studentAddress", e.target.value.split("\n"))}
                />
              </div>
              <div>
                <Label className="text-xs">Credential</Label>
                <Input value={spec.credential} onChange={(e) => set("credential", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Completed hours</Label>
                <Input value={spec.totalHours} onChange={(e) => set("totalHours", e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">Dates</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSpec((p) => randomizeDates(p, dateOpts))}
              >
                <Shuffle className="w-3.5 h-3.5 mr-2" /> Randomise dates
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start date</Label>
                <Input value={spec.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End date</Label>
                <Input value={spec.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Issue date</Label>
                <Input value={spec.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Print date</Label>
                <Input value={spec.printDate} onChange={(e) => set("printDate", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <div>
                  <Label className="text-[11px]">Year from</Label>
                  <Input
                    type="number"
                    value={dateOpts.yearFrom}
                    onChange={(e) => setDateOpts({ ...dateOpts, yearFrom: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Year to</Label>
                  <Input
                    type="number"
                    value={dateOpts.yearTo}
                    onChange={(e) => setDateOpts({ ...dateOpts, yearTo: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Program months</Label>
                  <Input
                    type="number"
                    value={dateOpts.months}
                    onChange={(e) => setDateOpts({ ...dateOpts, months: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          </section>

          {spec.gradeMode !== "none" && (
            <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">Grades</h2>
                <div className="flex items-center gap-2">
                  <Select value={spec.gradeMode} onValueChange={(v) => set("gradeMode", v as CredentialSpec["gradeMode"])}>
                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="percent">Percent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => setSpec((p) => randomizeGrades(p, gradeOpts))}>
                    <Shuffle className="w-3.5 h-3.5 mr-2" /> Randomise grades
                  </Button>
                </div>
              </div>

              {isPercent ? (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px]">Min %</Label>
                    <Input type="number" value={gradeOpts.min} onChange={(e) => setGradeOpts({ ...gradeOpts, min: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Max %</Label>
                    <Input type="number" value={gradeOpts.max} onChange={(e) => setGradeOpts({ ...gradeOpts, max: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[11px]">Decimals</Label>
                    <Select
                      value={String(gradeOpts.decimals)}
                      onValueChange={(v) => setGradeOpts({ ...gradeOpts, decimals: Number(v) as 0 | 2 })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {LETTER_GRADES.map((g) => {
                    const on = gradeOpts.letterPool.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setGradeOpts({
                            ...gradeOpts,
                            letterPool: on
                              ? gradeOpts.letterPool.filter((x) => x !== g)
                              : [...gradeOpts.letterPool, g],
                          })
                        }
                        className={`px-2 py-1 rounded-md text-xs border ${
                          on ? "border-gold bg-gold/15 text-foreground" : "border-border text-muted-foreground"
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {spec.courses.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                    <Input
                      className="col-span-3 h-8 text-xs"
                      placeholder="Code / phase"
                      value={c.code}
                      onChange={(e) => setCourse(i, { code: e.target.value })}
                    />
                    <Input
                      className="col-span-4 h-8 text-xs"
                      placeholder="Course name"
                      value={c.name}
                      onChange={(e) => setCourse(i, { name: e.target.value })}
                    />
                    <Input
                      className="col-span-2 h-8 text-xs"
                      placeholder="Hours"
                      value={c.credits ?? ""}
                      onChange={(e) => setCourse(i, { credits: e.target.value })}
                    />
                    {spec.gradeMode === "letter" ? (
                      <Select value={c.grade} onValueChange={(v) => setCourse(i, { grade: v })}>
                        <SelectTrigger className="col-span-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {LETTER_GRADES.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="col-span-2 h-8 text-xs"
                        value={c.grade}
                        onChange={(e) => setCourse(i, { grade: e.target.value })}
                      />
                    )}
                    <button
                      type="button"
                      className="col-span-1 text-muted-foreground hover:text-destructive"
                      onClick={() => setSpec((p) => ({ ...p, courses: p.courses.filter((_, x) => x !== i) }))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSpec((p) => ({
                    ...p,
                    courses: [...p.courses, { code: "", name: "New course", grade: isPercent ? "80%" : "B", credits: "" }],
                  }))
                }
              >
                <Plus className="w-3.5 h-3.5 mr-2" /> Add course
              </Button>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Signatories & footer</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Official name</Label>
                <Input value={spec.officialName} onChange={(e) => set("officialName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Official title</Label>
                <Input value={spec.officialTitle} onChange={(e) => set("officialTitle", e.target.value)} />
              </div>
              {spec.kind === "diploma" && (
                <>
                  <div>
                    <Label className="text-xs">Second official name</Label>
                    <Input value={spec.secondOfficialName} onChange={(e) => set("secondOfficialName", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Second official title</Label>
                    <Input value={spec.secondOfficialTitle} onChange={(e) => set("secondOfficialTitle", e.target.value)} />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <Label className="text-xs">Institution address / header lines</Label>
                <Textarea
                  rows={3}
                  value={spec.addressLines.join("\n")}
                  onChange={(e) => set("addressLines", e.target.value.split("\n"))}
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Notes / footer lines</Label>
                <Textarea
                  rows={3}
                  value={spec.notes.join("\n")}
                  onChange={(e) => set("notes", e.target.value.split("\n"))}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-gold" /> Saved templates
            </h2>
            <div className="flex gap-2">
              <Input
                placeholder="Template name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Button onClick={saveTemplate} disabled={saving}>
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-auto">
              {templates.length === 0 && (
                <p className="text-xs text-muted-foreground">No saved templates yet.</p>
              )}
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20"
                >
                  <button type="button" className="text-left flex-1" onClick={() => applyTemplate(t)}>
                    <div className="text-xs font-semibold text-foreground">{t.name}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">{t.design} · {t.kind}</div>
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeTemplate(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* -------------------------------------------------------- preview */}
        <div className="lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Live preview — {meta.label}
              </span>
              {busy && <span className="text-[11px] text-gold">rendering…</span>}
            </div>
            <div className="bg-white rounded-xl overflow-hidden">
              <PdfBlobPreview key={meta.key} blob={previewBlob} aspect={meta.pageW / meta.pageH} />
            </div>
            <div className="flex items-center gap-2 mt-2 px-1">
              <Button size="sm" variant="outline" onClick={() => url && window.open(url, "_blank")}>
                Open full size
              </Button>
              <Button size="sm" onClick={download}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
