import { ListingSkeleton } from "@/components/public/listing-skeleton";

export default function NewsLoading() {
  return <ListingSkeleton variant="articles" count={4} />;
}
