"use client";

import jsQR from "jsqr";
import { CameraOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseHandoverQr } from "@/lib/handover-qr";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Called once with a valid FoodBridge handover QR. */
  onScan: (r: { claimId: string; code: string }) => void;
};

/** In-app QR scanner (camera + jsQR). Works on any browser with getUserMedia over HTTPS / localhost. */
export function QrScanner({ open, onOpenChange, onScan }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (!open) return;
    done.current = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let last = 0;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) return setError("This browser cannot open the camera. Enter the code instead.");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      } catch (e) {
        const name = (e as DOMException).name;
        return setError(
          name === "NotAllowedError"
            ? "Camera access is blocked. Allow the camera for this site (lock icon in the address bar), then try again, or enter the code instead."
            : "No camera could be started. Enter the code instead.",
        );
      }
      if (stopped || !video.current) return stream.getTracks().forEach((t) => t.stop());
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      setReady(true);
      const tick = (t: number) => {
        raf = requestAnimationFrame(tick);
        const v = video.current;
        if (!v || !ctx || done.current || v.readyState < 2 || t - last < 100) return; // ~10 fps is plenty
        last = t;
        const scale = Math.min(1, 640 / v.videoWidth);
        canvas.width = Math.round(v.videoWidth * scale);
        canvas.height = Math.round(v.videoHeight * scale);
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (!hit?.data) return;
        const parsed = parseHandoverQr(hit.data);
        if (!parsed) return setHint("That QR is not a FoodBridge handover code.");
        done.current = true;
        onScan(parsed);
        onOpenChange(false);
      };
      raf = requestAnimationFrame(tick);
    }
    void start();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      setReady(false);
      setError(null);
      setHint(null);
    };
  }, [open, onScan, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan the giver&apos;s QR</DialogTitle>
          <DialogDescription>Hold the giver&apos;s screen or printed card inside the frame. The handover completes as soon as it is read.</DialogDescription>
        </DialogHeader>
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-2 rounded-2xl border border-clay/40 bg-clay/5 p-6 text-center text-sm">
            <CameraOff className="size-8 text-clay" aria-hidden />
            {error}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={video} playsInline muted className="aspect-square w-full object-cover" aria-label="Camera preview" />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center text-white/80">
                <Loader2 className="size-8 animate-spin" aria-hidden />
              </div>
            )}
            <div className="pointer-events-none absolute inset-8 rounded-3xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" aria-hidden />
          </div>
        )}
        {hint && <p role="status" className="text-center text-sm text-clay">{hint}</p>}
      </DialogContent>
    </Dialog>
  );
}
