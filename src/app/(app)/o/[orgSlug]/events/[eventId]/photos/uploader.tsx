"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type UploadResult =
  | { error: string }
  | { uploads: Array<{ name: string; key: string; url: string }> };

export function PhotoUploader({
  requestUrls,
  confirm,
}: {
  requestUrls: (files: Array<{ name: string; type: string }>) => Promise<UploadResult>;
  confirm: (keys: string[]) => Promise<{ error?: string; ok?: boolean }>;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setError("Only image files can be uploaded.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(`Preparing ${files.length} upload${files.length === 1 ? "" : "s"}...`);
    try {
      const result = await requestUrls(files.map((f) => ({ name: f.name, type: f.type })));
      if ("error" in result) {
        setError(result.error);
        return;
      }

      const doneKeys: string[] = [];
      for (let i = 0; i < result.uploads.length; i++) {
        const upload = result.uploads[i];
        const file = files[i];
        setProgress(`Uploading ${i + 1} of ${result.uploads.length}...`);
        const res = await fetch(upload.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (res.ok) doneKeys.push(upload.key);
      }

      if (doneKeys.length === 0) {
        setError("Uploads failed. Please try again.");
        return;
      }
      setProgress("Saving...");
      const confirmed = await confirm(doneKeys);
      if (confirmed.error) {
        setError(confirmed.error);
        return;
      }
      if (doneKeys.length < files.length) {
        setError(`${files.length - doneKeys.length} file(s) failed to upload.`);
      }
      router.refresh();
    } catch {
      setError("Something went wrong during upload. Please try again.");
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (progress ?? "Uploading...") : "Upload photos"}
      </Button>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
    </div>
  );
}
