"use client";
// Signed direct upload: ask our API for a signature, then POST the file straight to Cloudinary.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSignUpload } from "@/lib/api/hooks";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  type ALLOWED_UPLOAD_FOLDERS,
} from "@/lib/schemas/upload";

type Props = {
  folder: (typeof ALLOWED_UPLOAD_FOLDERS)[number];
  onUploaded: (url: string) => void;
};

export function ImageUpload({ folder, onUploaded }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const sign = useSignUpload();

  async function onFile(file: File | undefined) {
    if (!file) return;
    const type = ALLOWED_IMAGE_TYPES.find((t) => t === file.type);
    if (!type) return toast.error("Use a JPEG, PNG, WebP or GIF image");
    if (file.size > MAX_UPLOAD_BYTES) return toast.error("Image must be under 5 MB");
    setBusy(true);
    try {
      const s = await sign.mutateAsync({ folder, fileType: type });
      const form = new FormData();
      form.set("file", file);
      form.set("api_key", s.apiKey);
      form.set("timestamp", String(s.timestamp));
      form.set("signature", s.signature);
      form.set("folder", s.folder);
      form.set("allowed_formats", s.allowedFormats);
      const res = await fetch(s.uploadUrl, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload rejected");
      const json = (await res.json()) as { secure_url: string };
      setPreview(json.secure_url);
      onUploaded(json.secure_url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview && <img src={preview} alt="Uploaded" className="size-16 rounded-md object-cover" />}
      <input
        ref={input}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading..." : "Upload image"}
      </Button>
    </div>
  );
}
