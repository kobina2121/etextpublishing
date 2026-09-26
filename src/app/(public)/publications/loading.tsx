import { ListingSkeleton } from "@/components/public/listing-skeleton";

export default function PublicationsLoading() {
  return <ListingSkeleton variant="grid" count={6} />;
}
