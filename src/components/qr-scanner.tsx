"use client";

// Camera QR scanner shared by the organiser dashboard and the staff door
// scanner. Uses getUserMedia (rear camera preferred) and jsqr over a canvas
// sampled in a throttled requestAnimationFrame loop. Decoded values are
// emitted through onDecode with a cooldown so one badge does not fire many
// times while held in frame.
import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

const SCAN_INTERVAL_MS = 180;
const DUPLICATE_COOLDOWN_MS = 2500;

type CameraState = "idle" | "starting" | "active" | "denied" | "unavailable";

export function QrScanner({
  onDecode,
  paused = false,
  className,
}: {
  onDecode: (text: string) => void;
  // While true, frames are still shown but decoding is suspended (e.g. while
  // a server action is in flight).
  paused?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScanAtRef = useRef(0);
  const lastValueRef = useRef<{ text: string; at: number } | null>(null);
  const pausedRef = useRef(paused);
  const onDecodeRef = useRef(onDecode);
  const [state, setState] = useState<CameraState>("idle");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  pausedRef.current = paused;
  onDecodeRef.current = onDecode;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    setState("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      setState("active");

      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      setTorchSupported(Boolean(capabilities?.torch));
      setTorchOn(false);

      const loop = (now: number) => {
        rafRef.current = requestAnimationFrame(loop);
        if (pausedRef.current) return;
        if (now - lastScanAtRef.current < SCAN_INTERVAL_MS) return;
        lastScanAtRef.current = now;

        const v = videoRef.current;
        const canvas = canvasRef.current;
        if (!v || !canvas || v.readyState < v.HAVE_ENOUGH_DATA) return;

        // Sample a downscaled frame; jsqr does not need full resolution.
        const scale = Math.min(1, 640 / (v.videoWidth || 640));
        canvas.width = Math.floor((v.videoWidth || 640) * scale);
        canvas.height = Math.floor((v.videoHeight || 480) * scale);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx || canvas.width === 0 || canvas.height === 0) return;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });
        if (!code?.data) return;

        const text = code.data.trim();
        if (!text) return;
        const last = lastValueRef.current;
        if (last && last.text === text && now - last.at < DUPLICATE_COOLDOWN_MS)
          return;
        lastValueRef.current = { text, at: now };
        onDecodeRef.current(text);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setState(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : "unavailable"
      );
    }
  }, [stop]);

  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-[10px] border border-line bg-ink-2">
        {/* Canvas is only a decode buffer, never shown. */}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        <video
          ref={videoRef}
          className="aspect-square w-full object-cover"
          playsInline
          muted
        />
        {state === "active" ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-3/5 w-3/5 rounded-2xl border-2 border-signal/70" />
          </div>
        ) : null}
        {state !== "active" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 p-6 text-center">
            {state === "starting" || state === "idle" ? (
              <p className="text-sm text-fg-dim">Starting camera...</p>
            ) : state === "denied" ? (
              <>
                <p className="font-display text-fg">Camera access blocked</p>
                <p className="max-w-xs text-sm text-fg-dim">
                  Allow camera access for this site in your browser settings
                  (usually the padlock or camera icon in the address bar), then
                  tap retry. You can also type the code below the QR manually.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-fg">Camera unavailable</p>
                <p className="max-w-xs text-sm text-fg-dim">
                  No usable camera was found, or the page is not served over
                  HTTPS. Use manual code entry instead.
                </p>
              </>
            )}
            {state === "denied" || state === "unavailable" ? (
              <button
                type="button"
                onClick={() => void start()}
                className="rounded-lg border border-line-strong bg-raised-2 px-4 py-2 text-sm text-fg hover:border-signal/60"
              >
                Retry camera
              </button>
            ) : null}
          </div>
        ) : null}
        {state === "active" && torchSupported ? (
          <button
            type="button"
            onClick={() => void toggleTorch()}
            aria-pressed={torchOn}
            className="absolute bottom-3 right-3 rounded-full border border-line-strong bg-ink/80 px-3 py-1.5 font-data text-xs text-fg hover:border-signal/60"
          >
            {torchOn ? "Torch on" : "Torch off"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
