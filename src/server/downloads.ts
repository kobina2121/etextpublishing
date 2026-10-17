import "server-only";

import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db";
import { downloadFileUrl } from "@/lib/downloads";
import { Order, Publication } from "@/models";

export type DownloadItem = {
  publicationId: string;
  title: string;
  slug: string;
  /** Null when the title's file is missing — shown as "being prepared". */
  url: string | null;
  fileName: string;
  size: number;
};

/**
 * The softcopies a paid order can download.
 *
 * Callers must already have verified the link's signature. This adds the
 * rest: the order exists, is paid, and each title's current file is looked up
 * — so a corrected file reaches earlier buyers too.
 */
export async function getOrderDownloads(reference: string): Promise<DownloadItem[] | null> {
  await connectToDatabase();
  const order = await Order.findOne({ reference, status: "paid" }).select("items").lean<{
    items: { publication: Types.ObjectId; edition: string; title: string; slug: string }[];
  } | null>();
  if (!order) return null;

  const softcopies = order.items.filter((item) => item.edition === "softcopy");
  if (softcopies.length === 0) return [];

  const files = await Publication.find({ _id: { $in: softcopies.map((item) => item.publication) } })
    .select("digitalFileKey digitalFileName digitalFileSize")
    .lean<
      {
        _id: Types.ObjectId;
        digitalFileKey?: string;
        digitalFileName?: string;
        digitalFileSize?: number;
      }[]
    >();
  const byId = new Map(files.map((file) => [file._id.toString(), file]));

  return softcopies.map((item) => {
    const id = item.publication.toString();
    const file = byId.get(id);
    return {
      publicationId: id,
      title: item.title,
      slug: item.slug,
      url: file?.digitalFileKey ? downloadFileUrl(reference, id) : null,
      fileName: file?.digitalFileName ?? "",
      size: file?.digitalFileSize ?? 0,
    };
  });
}

/** The file for one title in one paid order, or null if the order cannot have it. */
export async function getDownloadFile(
  reference: string,
  publicationId: string,
): Promise<{ key: string; fileName: string } | null> {
  if (!Types.ObjectId.isValid(publicationId)) return null;
  await connectToDatabase();
  const owns = await Order.exists({
    reference,
    status: "paid",
    items: { $elemMatch: { publication: new Types.ObjectId(publicationId), edition: "softcopy" } },
  });
  if (!owns) return null;

  const publication = await Publication.findById(publicationId)
    .select("digitalFileKey digitalFileName slug")
    .lean<{ digitalFileKey?: string; digitalFileName?: string; slug: string } | null>();
  if (!publication?.digitalFileKey) return null;
  return {
    key: publication.digitalFileKey,
    fileName: publication.digitalFileName || publication.slug,
  };
}
