import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/repositories/profile.repository", () => ({
  profileRepository: { findById: vi.fn(), create: vi.fn() },
}));

import { profileRepository } from "@/server/repositories/profile.repository";
import { profileService } from "@/server/services/profile.service";

const repo = vi.mocked(profileRepository);
const row = { id: "u1", email: "a@b.c", name: null, role: "USER" as const, createdAt: new Date("2025-01-01") };

describe("profileService.ensureProfile", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns the existing profile without creating", async () => {
    repo.findById.mockResolvedValue(row);
    expect(await profileService.ensureProfile({ id: "u1", email: "a@b.c" })).toBe(row);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("creates a USER profile on first login", async () => {
    repo.findById.mockResolvedValue(null);
    repo.create.mockResolvedValue(row);
    await profileService.ensureProfile({ id: "u1", email: "a@b.c", name: "Ann" });
    expect(repo.create).toHaveBeenCalledWith({ id: "u1", email: "a@b.c", name: "Ann", role: "USER" });
  });

  it("recovers when a concurrent request created the row first", async () => {
    repo.findById.mockResolvedValueOnce(null).mockResolvedValueOnce(row);
    repo.create.mockRejectedValue(new Error("unique violation"));
    expect(await profileService.ensureProfile({ id: "u1", email: "a@b.c" })).toBe(row);
  });

  it("serialises createdAt to ISO", () => {
    expect(profileService.toDTO(row).createdAt).toBe("2025-01-01T00:00:00.000Z");
  });
});
