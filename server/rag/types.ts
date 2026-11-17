export type RagDoc = {
  id: string;
  kind: "knowledge" | "offer" | "need" | "stats";
  /** Short label shown to the user under the answer. */
  label: string;
  /** What the model reads. */
  text: string;
  /** Extra search keywords (counted double). */
  keywords?: string;
  href?: string;
};

export type RagSource = { kind: RagDoc["kind"]; label: string; href?: string };
