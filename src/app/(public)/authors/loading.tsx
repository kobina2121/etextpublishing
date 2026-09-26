import { ListingSkeleton } from "@/components/public/listing-skeleton";

export default function AuthorsLoading() {
  return <ListingSkeleton variant="cards" count={6} />;
}
