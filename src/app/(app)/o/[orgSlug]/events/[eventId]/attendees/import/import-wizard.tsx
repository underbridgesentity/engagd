"use client";

import * as React from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Button, Card, Select } from "@/components/ui";
import type { ImportResult } from "./actions";

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ["Upload", "Map columns", "Review", "Done"];

type TargetField = { key: string; label: string; kind: "core" | "question" };

export function ImportWizard({
  attendeesHref,
  customQuestions,
  importAction,
}: {
  attendeesHref: string;
  customQuestions: Array<{ id: string; label: string }>;
  importAction: (rows: unknown) => Promise<ImportResult>;
}) {
  const [step, setStep] = React.useState<Step>(0);
  const [fileName, setFileName] = React.useState("");
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<Record<number, string>>({});
  const [parseError, setParseError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);
  const [dragging, setDragging] = React.useState(false);

  const targets: TargetField[] = [
    { key: "firstName", label: "First name", kind: "core" },
    { key: "lastName", label: "Last name", kind: "core" },
    { key: "email", label: "Email", kind: "core" },
    { key: "phone", label: "Phone", kind: "core" },
    ...customQuestions.map((q) => ({
      key: `q:${q.id}`,
      label: `Question: ${q.label}`,
      kind: "question" as const,
    })),
  ];

  function autoMap(hdrs: string[]) {
    const auto: Record<number, string> = {};
    const used = new Set<string>();
    hdrs.forEach((h, i) => {
      const n = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      let key = "";
      if (["firstname", "first", "name", "givenname"].includes(n)) key = "firstName";
      else if (["lastname", "last", "surname", "familyname"].includes(n)) key = "lastName";
      else if (["email", "emailaddress", "mail"].includes(n)) key = "email";
      else if (["phone", "phonenumber", "mobile", "cell", "cellphone", "tel"].includes(n)) key = "phone";
      if (key && !used.has(key)) {
        auto[i] = key;
        used.add(key);
      } else {
        auto[i] = "";
      }
    });
    return auto;
  }

  function handleFile(file: File) {
    setParseError("");
    Papa.parse<string[]>(file, {
      skipEmptyLines: "greedy",
      complete: (res) => {
        const data = res.data as string[][];
        if (!data.length || data[0].length === 0) {
          setParseError("That file looks empty. Check it has a header row and try again.");
          return;
        }
        const hdrs = data[0].map((h) => String(h ?? "").trim());
        setFileName(file.name);
        setHeaders(hdrs);
        setRows(data.slice(1).filter((r) => r.some((c) => String(c ?? "").trim() !== "")));
        setMapping(autoMap(hdrs));
        setStep(1);
      },
      error: () => setParseError("Could not read that file. Make sure it is a valid CSV."),
    });
  }

  const mappedKeys = Object.values(mapping).filter(Boolean);
  const duplicateTargets = mappedKeys.filter((k, i) => mappedKeys.indexOf(k) !== i);
  const hasIdentity = mappedKeys.includes("email") || mappedKeys.includes("firstName") || mappedKeys.includes("lastName");

  function buildRows() {
    return rows.map((r) => {
      const out: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        customAnswers: Record<string, string>;
      } = { customAnswers: {} };
      headers.forEach((_, i) => {
        const key = mapping[i];
        if (!key) return;
        const value = String(r[i] ?? "").trim();
        if (!value) return;
        if (key.startsWith("q:")) out.customAnswers[key.slice(2)] = value;
        else (out as Record<string, unknown>)[key] = value;
      });
      return out;
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await importAction(buildRows());
      setResult(res);
      if (!res.error) setStep(3);
    } catch {
      setResult({ error: "Import failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const preview = rows.slice(0, 5);

  // Honest review: work out client-side which rows the import will skip so
  // the Review step's reassurance matches what actually happens.
  const skipPreview = React.useMemo(() => {
    let unusable = 0;
    let duplicates = 0;
    const seenEmails = new Set<string>();
    for (const r of buildRows()) {
      const hasName = Boolean(r.firstName || r.lastName);
      const email = r.email?.toLowerCase();
      if (!hasName && !email) {
        unusable++;
        continue;
      }
      if (email) {
        if (seenEmails.has(email)) {
          duplicates++;
          continue;
        }
        seenEmails.add(email);
      }
    }
    return { unusable, duplicates, total: unusable + duplicates };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping, headers]);

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full font-data text-xs ${
                i < step
                  ? "bg-mint/20 text-mint"
                  : i === step
                    ? "bg-signal text-ink"
                    : "bg-raised-2 text-fg-faint"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm ${i === step ? "text-fg" : "text-fg-faint"}`}>{label}</span>
            {i < STEP_LABELS.length - 1 ? <span className="text-fg-faint">/</span> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <Card className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-fg">Upload a CSV</h3>
            <p className="mt-1 text-sm text-fg-dim">
              The first row should be column headings, for example name, email, phone. You will
              map columns in the next step, so any layout works.
            </p>
          </div>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed px-6 py-12 text-center transition-colors ${
              dragging
                ? "border-signal bg-signal/10"
                : "border-line-strong hover:border-signal/60"
            }`}
          >
            <span className="text-sm text-fg">Choose a CSV file</span>
            <span className="text-xs text-fg-faint">or drop it here</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          {parseError ? <p className="text-sm text-coral">{parseError}</p> : null}
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-fg">Map columns</h3>
            <p className="mt-1 text-sm text-fg-dim">
              {fileName}: {rows.length} row{rows.length === 1 ? "" : "s"} found. Match each CSV
              column to a field, or skip it.
            </p>
          </div>
          <div className="space-y-3">
            {headers.map((h, i) => (
              <div key={i} className="grid items-center gap-2 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{h || `Column ${i + 1}`}</p>
                  <p className="truncate font-data text-xs text-fg-faint">
                    e.g. {String(rows[0]?.[i] ?? "")}
                  </p>
                </div>
                <Select
                  value={mapping[i] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value }))}
                  aria-label={`Map column ${h || i + 1}`}
                >
                  <option value="">Skip this column</option>
                  {targets.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          {duplicateTargets.length > 0 ? (
            <p className="text-sm text-coral">Each field can only be mapped to one column.</p>
          ) : !hasIdentity ? (
            <p className="text-sm text-ember">Map at least an email or a name column to continue.</p>
          ) : null}
          <div className="flex gap-2">
            <Button
              onClick={() => setStep(2)}
              disabled={duplicateTargets.length > 0 || !hasIdentity}
            >
              Continue to review
            </Button>
            <Button variant="ghost" onClick={() => setStep(0)}>
              Back
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-fg">Review and import</h3>
            <p className="mt-1 text-sm text-fg-dim">
              {rows.length} row{rows.length === 1 ? "" : "s"} will be imported. Rows matching an
              existing attendee email are skipped, not overwritten.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-raised text-left text-xs uppercase tracking-wider text-fg-faint">
                  {headers.map((h, i) =>
                    mapping[i] ? (
                      <th key={i} className="px-3 py-2 font-medium">
                        {targets.find((t) => t.key === mapping[i])?.label ?? h}
                      </th>
                    ) : null
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, ri) => (
                  <tr key={ri} className="border-b border-line last:border-b-0">
                    {headers.map((_, ci) =>
                      mapping[ci] ? (
                        <td key={ci} className="px-3 py-2 text-fg-dim">
                          {String(r[ci] ?? "")}
                        </td>
                      ) : null
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > preview.length ? (
            <p className="text-xs text-fg-faint">
              Showing the first {preview.length} of {rows.length} rows.
            </p>
          ) : null}
          {skipPreview.total > 0 ? (
            <div className="rounded-[10px] border border-ember/40 bg-ember/10 px-4 py-3 text-sm">
              <p className="font-medium text-ember">
                {skipPreview.total} row{skipPreview.total === 1 ? "" : "s"} will
                be skipped.
              </p>
              <ul className="mt-1 space-y-0.5 text-fg-dim">
                {skipPreview.unusable > 0 ? (
                  <li>
                    {skipPreview.unusable} with no name and no usable email.
                  </li>
                ) : null}
                {skipPreview.duplicates > 0 ? (
                  <li>
                    {skipPreview.duplicates} duplicate email
                    {skipPreview.duplicates === 1 ? "" : "s"} within this file
                    (the first occurrence is kept).
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          {result?.error ? <p className="text-sm text-coral">{result.error}</p> : null}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={submitting}>
              {submitting ? "Importing..." : `Import ${rows.length} row${rows.length === 1 ? "" : "s"}`}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>
              Back
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 && result ? (
        <Card className="space-y-4">
          <div>
            <h3 className="font-display text-lg text-fg">Import complete</h3>
            <p className="mt-1 text-sm text-fg-dim">
              {result.inserted ?? 0} attendee{(result.inserted ?? 0) === 1 ? "" : "s"} added,{" "}
              {result.skipped ?? 0} skipped as duplicates or unusable rows.
            </p>
          </div>
          {result.capWarning ? (
            <div className="rounded-[10px] border border-ember/40 bg-ember/10 px-4 py-3 text-sm">
              <p className="font-medium text-ember">
                You are at {result.capWarning.current} of {result.capWarning.limit} attendees for
                this event on your plan.
              </p>
              <p className="mt-1 text-fg-dim">
                Nothing was blocked and the public RSVP link keeps working. Upgrade to raise the
                limit.
              </p>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Link
              href={attendeesHref}
              className="inline-flex items-center rounded-lg bg-signal px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-signal-strong"
            >
              View attendees
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setStep(0);
                setResult(null);
                setHeaders([]);
                setRows([]);
                setMapping({});
                setFileName("");
              }}
            >
              Import another file
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
