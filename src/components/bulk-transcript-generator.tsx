import { useState, useMemo, useRef } from "react";
import {
  GraduationCap,
  Download,
  Shuffle,
  FileArchive,
  Search,
  CheckSquare,
  Square,
  Eye,
  Sparkles,
  Upload,
  Trash2,
  Settings2,
  Check,
  AlertCircle,
  Clock,
  Building2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DESIGNS,
  DEFAULT_GRADE_OPTIONS,
  DEFAULT_DATE_OPTIONS,
  type DesignKey,
} from "@/types/credentials";
import {
  parseRosterText,
  generateSampleRoster,
  generateBulkTranscripts,
  exportTranscriptsAsZip,
  triggerBlobDownload,
  TRANSCRIPT_DESIGNS,
  type StudentRosterItem,
  type BulkTranscriptOptions,
  type GeneratedTranscriptResult,
  type UniversitySelectionStrategy,
} from "@/lib/bulk-transcript-engine";
import { PdfBlobPreview } from "@/components/pdf-blob-preview";

export function BulkTranscriptGenerator() {
  // Input state
  const [rosterText, setRosterText] = useState<string>(() => generateSampleRoster(10));
  const [strategy, setStrategy] = useState<UniversitySelectionStrategy>("random_all");
  const [selectedDesigns, setSelectedDesigns] = useState<DesignKey[]>(TRANSCRIPT_DESIGNS);
  const [singleDesign, setSingleDesign] = useState<DesignKey>("york");
  const [customInstitution, setCustomInstitution] = useState<string>("");

  // Advanced options
  const [randomizeGrades, setRandomizeGrades] = useState(true);
  const [randomizeDates, setRandomizeDates] = useState(true);
  const [minGrade, setMinGrade] = useState(68);
  const [maxGrade, setMaxGrade] = useState(94);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [executionTime, setExecutionTime] = useState<string | null>(null);
  const [results, setResults] = useState<GeneratedTranscriptResult[]>([]);

  // Selection & filtering state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [previewItem, setPreviewItem] = useState<GeneratedTranscriptResult | null>(null);
  const [zipping, setZipping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse roster in real-time
  const parsedStudents = useMemo(() => parseRosterText(rosterText), [rosterText]);

  // University designs metadata lookup
  const transcriptMetaList = useMemo(
    () => DESIGNS.filter((d) => TRANSCRIPT_DESIGNS.includes(d.key)),
    []
  );

  const handleToggleDesign = (key: DesignKey) => {
    setSelectedDesigns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) {
          toast.error("At least one university must remain selected.");
          return prev;
        }
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRosterText(content);
        toast.success(`Loaded file with ${content.split("\n").filter(Boolean).length} rows`);
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = "";
  };

  const handleGenerate = async () => {
    if (parsedStudents.length === 0) {
      toast.error("Please enter at least one student name before generating.");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setCompletedCount(0);
    setExecutionTime(null);

    const startTime = performance.now();

    const options: BulkTranscriptOptions = {
      strategy,
      selectedDesigns,
      singleDesign,
      customInstitution: customInstitution.trim() || undefined,
      gradeOptions: {
        ...DEFAULT_GRADE_OPTIONS,
        min: minGrade,
        max: maxGrade,
      },
      dateOptions: DEFAULT_DATE_OPTIONS,
      randomizeGrades,
      randomizeDates,
    };

    try {
      const generated = await generateBulkTranscripts(
        parsedStudents,
        options,
        (completed, total) => {
          setCompletedCount(completed);
          setProgress(Math.round((completed / total) * 100));
        }
      );

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setExecutionTime(elapsed);
      setResults(generated);
      setSelectedIds(new Set(generated.map((g) => g.id)));

      toast.success(`Generated ${generated.length} transcripts in ${elapsed}s!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate bulk transcripts. Please check your roster format.");
    } finally {
      setGenerating(false);
    }
  };

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return results;
    const q = searchQuery.toLowerCase();
    return results.filter(
      (r) =>
        r.student.fullName.toLowerCase().includes(q) ||
        r.institution.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        (r.student.dob && r.student.dob.includes(q))
    );
  }, [results, searchQuery]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((r) => r.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadZip = async (selectedOnly = false) => {
    const targetItems = selectedOnly
      ? results.filter((r) => selectedIds.has(r.id))
      : results;

    if (targetItems.length === 0) {
      toast.error("No transcripts selected for ZIP download.");
      return;
    }

    setZipping(true);
    try {
      const dateTag = new Date().toISOString().split("T")[0];
      const zipBlob = await exportTranscriptsAsZip(
        targetItems,
        `Neptora_Transcripts_Batch_${dateTag}.zip`
      );
      triggerBlobDownload(zipBlob, `Neptora_Transcripts_Batch_${dateTag}.zip`);
      toast.success(`Exported ${targetItems.length} transcripts into ZIP!`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create ZIP package.");
    } finally {
      setZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Presets */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" /> High-Speed Batch Engine
              </span>
              <span className="text-xs text-muted-foreground">
                Up to 100+ transcripts in &lt;1 second
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Institutional Bulk Transcript Generator
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Paste student details (Name, DOB, Gender), choose university distribution, and generate
              hundreds of official multi-page transcripts instantly. Download individually or as a single organized ZIP package with manifest.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.txt"
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV/TXT
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterText(generateSampleRoster(1))}
              className="text-xs"
            >
              Chirag Tilwani Sample
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterText(generateSampleRoster(10))}
              className="text-xs"
            >
              +10 Sample Students
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterText(generateSampleRoster(50))}
              className="text-xs"
            >
              +50 Sample
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRosterText(generateSampleRoster(100))}
              className="text-xs font-semibold text-primary border-primary/30"
            >
              ⚡ 100 Sample Students (Benchmark)
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Roster & Options */}
        <div className="lg:col-span-5 space-y-5">
          {/* Roster Input Card */}
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="roster" className="text-sm font-semibold text-foreground">
                  Student Roster
                </Label>
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {parsedStudents.length} {parsedStudents.length === 1 ? "Student" : "Students"} Detected
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRosterText("")}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            </div>

            <div className="space-y-1.5">
              <Textarea
                id="roster"
                value={rosterText}
                onChange={(e) => setRosterText(e.target.value)}
                placeholder={`Example format:\nChirag Tilwani, DOB: 2007-08-31, Gender: M\nSarah Jenkins, DOB: 2004-11-15, Gender: F\nDavid Miller, 2005-03-22, M\nElena Rostova`}
                rows={11}
                className="font-mono text-xs leading-relaxed resize-y"
              />
              <p className="text-[11px] text-muted-foreground leading-normal">
                Supported formats: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">Name, DOB: YYYY-MM-DD, Gender: M/F</code> or CSV comma/tab separated. Missing DOB/gender will be realistically generated.
              </p>
            </div>

            {/* University Selection Strategy */}
            <div className="pt-2 border-t space-y-3">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" /> University Distribution Strategy
              </Label>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStrategy("random_all")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    strategy === "random_all"
                      ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Shuffle className="w-4 h-4 mb-1" />
                  <div className="font-medium text-xs text-foreground">All Universities</div>
                  <div className="text-[10px] text-muted-foreground">Randomize 9 schools</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy("random_selected")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    strategy === "random_selected"
                      ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <CheckSquare className="w-4 h-4 mb-1" />
                  <div className="font-medium text-xs text-foreground">Selected Pool</div>
                  <div className="text-[10px] text-muted-foreground">Pick specific schools</div>
                </button>

                <button
                  type="button"
                  onClick={() => setStrategy("single")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    strategy === "single"
                      ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                      : "bg-muted/40 border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Building2 className="w-4 h-4 mb-1" />
                  <div className="font-medium text-xs text-foreground">Single School</div>
                  <div className="text-[10px] text-muted-foreground">All get same university</div>
                </button>
              </div>

              {/* Single design dropdown */}
              {strategy === "single" && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] text-muted-foreground">Target University</Label>
                  <Select
                    value={singleDesign}
                    onValueChange={(val) => setSingleDesign(val as DesignKey)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Select University" />
                    </SelectTrigger>
                    <SelectContent>
                      {transcriptMetaList.map((m) => (
                        <SelectItem key={m.key} value={m.key} className="text-xs">
                          {m.institution} ({m.label.split("—")[1]?.trim() || "Transcript"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected designs checkboxes */}
              {strategy === "random_selected" && (
                <div className="space-y-2 pt-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Included Universities ({selectedDesigns.length} active)
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1 border rounded-lg bg-muted/20">
                    {transcriptMetaList.map((m) => {
                      const isChecked = selectedDesigns.includes(m.key);
                      return (
                        <label
                          key={m.key}
                          className={`flex items-center gap-2 p-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
                            isChecked ? "bg-card border shadow-2xs" : "opacity-60 hover:opacity-100"
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleDesign(m.key)}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: m.accent }}
                          />
                          <span className="truncate text-[11px] font-medium">{m.institution}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* School / Institution Name Override */}
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-primary" /> School / Institution Name Override
                  </Label>
                  {customInstitution && (
                    <button
                      type="button"
                      onClick={() => setCustomInstitution("")}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
                <Input
                  value={customInstitution}
                  onChange={(e) => setCustomInstitution(e.target.value)}
                  placeholder={
                    strategy === "single" && singleDesign === "ossd"
                      ? "e.g. Courtice Secondary School (or any high school name)"
                      : "Leave blank to use default institution name"
                  }
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Overrides the school name across generated documents (you can also set per student in the roster using <code className="bg-muted px-1 rounded">School: Name</code>).
                </p>
              </div>
            </div>

            {/* Advanced Academic Settings */}
            <div className="pt-2 border-t space-y-3">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" /> Academic & Grade Randomization Options
                </span>
                <span>{showAdvanced ? "▲ Hide" : "▼ Show"}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-3 pt-2 bg-muted/30 p-3 rounded-xl border text-xs">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={randomizeGrades}
                        onCheckedChange={(c) => setRandomizeGrades(!!c)}
                      />
                      <span>Randomize course marks per student</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <Checkbox
                        checked={randomizeDates}
                        onCheckedChange={(c) => setRandomizeDates(!!c)}
                      />
                      <span>Randomize enrollment & graduation dates</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Min Grade (%)</Label>
                      <Input
                        type="number"
                        value={minGrade}
                        onChange={(e) => setMinGrade(Number(e.target.value))}
                        className="h-7 text-xs"
                        min={50}
                        max={90}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Max Grade (%)</Label>
                      <Input
                        type="number"
                        value={maxGrade}
                        onChange={(e) => setMaxGrade(Number(e.target.value))}
                        className="h-7 text-xs"
                        min={75}
                        max={100}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Big Action Button */}
            <Button
              onClick={handleGenerate}
              disabled={generating || parsedStudents.length === 0}
              className="w-full h-11 text-sm font-bold shadow-md bg-gradient-to-r from-primary to-primary/80 hover:opacity-95"
            >
              {generating ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Generating {completedCount}/{parsedStudents.length}...
                </>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Generate {parsedStudents.length} Transcripts in Bulk
                </>
              )}
            </Button>

            {/* Progress bar */}
            {generating && (
              <div className="space-y-1.5">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Processing batch...</span>
                  <span>{progress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Output Vault & Results Table */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
            {/* Header / Metric Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Generated Transcript Vault</span>
                  {results.length > 0 && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                      {results.length} Ready
                    </Badge>
                  )}
                </h3>
                {executionTime && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    Completed in <strong className="text-foreground">{executionTime} seconds</strong> (avg {(Number(executionTime) / results.length * 1000).toFixed(1)}ms/doc)
                  </p>
                )}
              </div>

              {/* ZIP Download Actions */}
              {results.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadZip(true)}
                    disabled={zipping || selectedIds.size === 0}
                    className="text-xs h-8"
                  >
                    <FileArchive className="w-3.5 h-3.5 mr-1 text-primary" />
                    ZIP Selected ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownloadZip(false)}
                    disabled={zipping}
                    className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download All ZIP ({results.length})
                  </Button>
                </div>
              )}
            </div>

            {/* Filter and Select All Bar */}
            {results.length > 0 && (
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search student, university, or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-8 text-xs text-muted-foreground"
                  >
                    {selectedIds.size === filteredResults.length ? (
                      <>
                        <Square className="w-3.5 h-3.5 mr-1" /> Deselect All
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 mr-1" /> Select All ({filteredResults.length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Results Table / Empty State */}
            {results.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed rounded-xl bg-muted/10 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-foreground">No Transcripts Generated Yet</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Enter names in the roster on the left and click "Generate Transcripts in Bulk" to produce institutional grade PDFs in under 1 second.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRosterText(generateSampleRoster(10));
                  }}
                  className="text-xs"
                >
                  Load 10 Students & Try Now
                </Button>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden bg-card">
                <div className="max-h-[520px] overflow-y-auto divide-y">
                  {filteredResults.map((item, idx) => {
                    const isSelected = selectedIds.has(item.id);
                    const meta = DESIGNS.find((d) => d.key === item.design);

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 text-xs transition-colors ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(item.id)}
                          />
                          <span className="font-mono text-muted-foreground w-6 text-right shrink-0">
                            {idx + 1}.
                          </span>

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground truncate text-sm">
                                {item.student.fullName}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-normal uppercase"
                              >
                                {item.student.gender === "female" ? "F" : "M"}
                              </Badge>
                              {item.student.dob && (
                                <span className="text-[10px] text-muted-foreground">
                                  DOB: {item.student.dob}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: meta?.accent || "#000" }}
                                />
                                {item.institution}
                              </span>
                              <span>•</span>
                              <span>ID: <code className="font-mono">{item.studentId}</code></span>
                              <span>•</span>
                              <span className="text-emerald-600 font-semibold">
                                Mark/GPA: {item.gpaOrAverage}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewItem(item)}
                            className="h-8 px-2.5 text-xs"
                            title="Quick Preview"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => triggerBlobDownload(item.blob, item.filename)}
                            className="h-8 px-2.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> PDF
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instant Preview Dialog Modal */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div className="space-y-0.5">
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  {previewItem.student.fullName} — {previewItem.institution}
                </DialogTitle>
                <p className="text-xs text-muted-foreground font-mono">
                  Student ID: {previewItem.studentId} • Mark/GPA: {previewItem.gpaOrAverage} • {previewItem.filename}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => triggerBlobDownload(previewItem.blob, previewItem.filename)}
                className="h-8 text-xs font-semibold mr-6"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
              </Button>
            </DialogHeader>

            <div className="p-2 bg-muted/20 rounded-xl overflow-hidden flex justify-center">
              <div className="w-full max-w-2xl bg-white shadow-lg rounded border overflow-hidden">
                <PdfBlobPreview blob={previewItem.blob} aspect={612 / 792} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
