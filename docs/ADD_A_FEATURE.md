# Add a feature in 5 minutes

Example feature: `Note` (id, title, ownerId). Replace names as needed.

## Checklist

- [ ] 1. Prisma model + `npm run db:push`
- [ ] 2. Zod schema in `lib/schemas/note.ts`
- [ ] 3. Repository in `server/repositories/note.repository.ts`
- [ ] 4. Service in `server/services/note.service.ts`
- [ ] 5. Route handler in `app/api/v1/notes/route.ts`
- [ ] 6. OpenAPI registration in `lib/openapi/note.ts` + import in `lib/openapi/index.ts`
- [ ] 7. TanStack Query hook in `lib/api/hooks.ts`
- [ ] 8. Page under `app/dashboard/notes/page.tsx` (+ nav item in `components/layout/app-shell.tsx`)
- [ ] 9. Service test in `tests/note.service.test.ts`

## Templates

### 1. Prisma
```prisma
model Note {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  ownerId   String   @db.Uuid
  createdAt DateTime @default(now())
  @@index([ownerId])
}
```

### 2. Zod schema (shared by server and client)
```ts
import { z } from "zod";
export const NoteSchema = z.object({ id: z.uuid(), title: z.string(), createdAt: z.string() }).meta({ id: "Note" });
export const CreateNoteSchema = z.object({ title: z.string().min(1).max(120) }).meta({ id: "CreateNote" });
export type NoteDTO = z.infer<typeof NoteSchema>;
export type CreateNote = z.infer<typeof CreateNoteSchema>;
```

### 3. Repository (only place that touches Prisma)
```ts
import { prisma } from "../lib/prisma";
export const noteRepository = {
  listByOwner: (ownerId: string) => prisma.note.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } }),
  create: (data: { title: string; ownerId: string }) => prisma.note.create({ data }),
};
```

### 4. Service (business rules; throw AppError)
```ts
import { noteRepository } from "../repositories/note.repository";
export const noteService = {
  list: async (ownerId: string) => (await noteRepository.listByOwner(ownerId)).map(toDTO),
  create: async (ownerId: string, input: { title: string }) => toDTO(await noteRepository.create({ ...input, ownerId })),
};
const toDTO = (n: { id: string; title: string; createdAt: Date }) => ({ id: n.id, title: n.title, createdAt: n.createdAt.toISOString() });
```

### 5. Route handler (thin)
```ts
import { CreateNoteSchema } from "@/lib/schemas/note";
import { ok, route } from "@/server/lib/route";
import { noteService } from "@/server/services/note.service";

export const GET = route({ auth: true }, async ({ user }) => ok(await noteService.list(user!.id)));
export const POST = route({ auth: true, body: CreateNoteSchema }, async ({ user, body }) =>
  ok(await noteService.create(user!.id, body), 201));
// Admin only: route({ auth: ["ADMIN"] }, ...)   Rate limit: route({ rateLimit: { name: "notes", limit: 30, windowMs: 60_000 } }, ...)
```

### 6. OpenAPI registration (every endpoint registers itself)
```ts
// lib/openapi/note.ts
import { z } from "zod";
import { CreateNoteSchema, NoteSchema } from "@/lib/schemas/note";
import { errorResponses, okResponse, registry } from "./registry";

registry.registerPath({ method: "get", path: "/api/v1/notes", tags: ["Notes"], security: [{ supabaseSession: [] }],
  responses: { 200: okResponse("My notes", z.array(NoteSchema)), 401: errorResponses[401] } });
registry.registerPath({ method: "post", path: "/api/v1/notes", tags: ["Notes"], security: [{ supabaseSession: [] }],
  request: { body: { content: { "application/json": { schema: CreateNoteSchema } } } },
  responses: { 201: okResponse("Created", NoteSchema), 400: errorResponses[400], 401: errorResponses[401] } });
```
Then add `import "./note";` to `lib/openapi/index.ts`. Check `/api/docs`.

### 7. Query hooks
```ts
export const useNotes = () => useQuery({ queryKey: ["notes"], queryFn: () => api<NoteDTO[]>("/api/v1/notes") });
export const useCreateNote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateNote) => api<NoteDTO>("/api/v1/notes", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
};
```

### 8. Page
```tsx
"use client";
export default function NotesPage() {
  const { data, isPending, error, refetch } = useNotes();
  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data.length) return <EmptyState title="No notes yet" />;
  return <ul>{data.map((n) => <li key={n.id}>{n.title}</li>)}</ul>;
}
```
Pages under `app/dashboard/` are already behind the auth proxy and shell. Server components that read the session must sit inside `<Suspense>`.

### 9. Test (mock the repository, test the service)
```ts
vi.mock("@/server/repositories/note.repository", () => ({ noteRepository: { listByOwner: vi.fn(), create: vi.fn() } }));
it("maps rows to DTOs", async () => { /* arrange mock, call noteService.list, assert */ });
```
Copy `tests/profile.service.test.ts` as a starting point. Run `npm run check` before pushing.
