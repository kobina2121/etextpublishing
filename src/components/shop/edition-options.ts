import { EDITION_KINDS, EDITION_LABELS, editionRequiresShipping } from "@/types/content";
import type { PublicationWithRelations } from "@/types/content";

import type { EditionOption } from "@/components/shop/edition-choice";

/**
 * The editions a buyer can actually choose right now.
 *
 * One definition, used by the card and the detail page, so the two can never
 * disagree about whether something is buyable. A printed copy needs stock; a
 * download never runs out.
 */
export function editionOptions(publication: PublicationWithRelations): EditionOption[] {
  return EDITION_KINDS.flatMap((kind) => {
    const edition = publication.editions[kind];
    if (!edition.available || edition.price <= 0) return [];

    if (editionRequiresShipping(kind)) {
      if (edition.stockQuantity <= 0) return [];
      return [
        {
          kind,
          label: EDITION_LABELS[kind],
          price: edition.price,
          stockQuantity: edition.stockQuantity,
        },
      ];
    }

    return [{ kind, label: EDITION_LABELS[kind], price: edition.price }];
  });
}

/** Lowest price across the buyable editions, for a "from" line. */
export function lowestPrice(options: EditionOption[]): number | null {
  if (options.length === 0) return null;
  return Math.min(...options.map((option) => option.price));
}
