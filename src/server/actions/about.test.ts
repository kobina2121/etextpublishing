import { beforeEach, describe, expect, it, vi } from "vitest";

import { ABOUT_DEFAULTS } from "@/lib/about-defaults";

/** updateAboutPage against a stand-in database: what is saved, refreshed and cleaned up. */

vi.mock("server-only", () => ({}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock("@/server/actions/shared", () => ({
  withAdmin: async <T>(fn: () => Promise<T>) => fn(),
  toFieldErrors: (error: { issues: { path: PropertyKey[]; message: string }[] }) => {
    const out: Record<string, string[]> = {};
    for (const issue of error.issues) (out[issue.path.join(".")] ??= []).push(issue.message);
    return out;
  },
}));
const deleteImageByUrl = vi.fn();
vi.mock("@/lib/storage/images", () => ({
  deleteImageByUrl: (url: string) => deleteImageByUrl(url),
}));

const findOne = vi.fn();
const findOneAndUpdate = vi.fn();
vi.mock("@/models", () => ({
  AboutPage: {
    findOne: (...a: unknown[]) => ({ lean: () => findOne(...a) }),
    findOneAndUpdate: (...a: unknown[]) => findOneAndUpdate(...a),
  },
}));

const { updateAboutPage } = await import("@/server/actions/about");

const oldImage = `/api/images/${"a".repeat(24)}`;
const newImage = `/api/images/${"b".repeat(24)}`;

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockResolvedValue(null);
  findOneAndUpdate.mockResolvedValue({});
});

describe("updateAboutPage", () => {
  it("saves the page and refreshes it", async () => {
    expect(await updateAboutPage(ABOUT_DEFAULTS)).toEqual({
      ok: true,
      message: "About page saved.",
    });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { key: "about" },
      { $set: expect.objectContaining({ heroTitle: ABOUT_DEFAULTS.heroTitle, key: "about" }) },
      expect.objectContaining({ upsert: true }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/about");
  });

  it("refuses invalid content and saves nothing", async () => {
    const result = await updateAboutPage({ ...ABOUT_DEFAULTS, heroTitle: "" });
    expect(result).toMatchObject({ ok: false, fieldErrors: { heroTitle: expect.any(Array) } });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("removes a banner photo once it has been replaced", async () => {
    findOne.mockResolvedValue({ heroImage: oldImage });
    await updateAboutPage({ ...ABOUT_DEFAULTS, heroImage: newImage });
    expect(deleteImageByUrl).toHaveBeenCalledWith(oldImage);
  });

  it("keeps the banner photo when it is unchanged", async () => {
    findOne.mockResolvedValue({ heroImage: oldImage });
    await updateAboutPage({ ...ABOUT_DEFAULTS, heroImage: oldImage });
    expect(deleteImageByUrl).not.toHaveBeenCalled();
  });
});
