import { configService } from "../services/config.service";
import { buildIndex } from "./bm25";
import { knowledgeDocs } from "./knowledge";
import { liveDocs } from "./live";
import type { RagDoc, RagSource } from "./types";

export type Retrieval = { docs: RagDoc[]; sources: RagSource[] };

const MAX_DOCS = 7;
const MAX_SOURCES = 4;

/** Ranks website knowledge + live database documents against the query and returns the best matches. */
export async function retrieve(query: string): Promise<Retrieval> {
  const cfg = await configService.get();
  // Live data is best-effort: if the database is down the assistant still answers from website knowledge.
  const live = await liveDocs().catch((e) => {
    console.error("[rag] live data unavailable", e);
    return [] as RagDoc[];
  });
  const corpus = [...knowledgeDocs(cfg), ...live];
  const index = buildIndex(
    corpus,
    (d) => d.text,
    (d) => `${d.label} ${d.keywords ?? ""}`,
  );
  const hits = index.search(query, MAX_DOCS);
  const docs = hits.map((h) => h.doc);
  // Show the user the few strongest sources, not every document the model read.
  const sources = hits
    .filter((h, i) => i < MAX_SOURCES && h.score >= hits[0].score * 0.45)
    .map((h) => ({ kind: h.doc.kind, label: h.doc.label, href: h.doc.href }));
  return { docs, sources };
}

export function formatContext(docs: RagDoc[]): string {
  if (!docs.length) return "(no matching documents found)";
  return docs.map((d, i) => `[${i + 1}] ${d.label}\n${d.text}`).join("\n\n");
}
