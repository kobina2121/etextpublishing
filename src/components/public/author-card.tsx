import Link from "next/link";
import Image from "next/image";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Author } from "@/types/content";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AuthorCard({ author }: { author: Author }) {
  return (
    <article className="group border-border hover:border-primary border p-6 text-center transition-colors">
      <Link href={`/authors/${author.slug}`} className="block">
        <div className="mx-auto size-24 overflow-hidden">
          {author.photo ? (
            <Image
              src={author.photo}
              alt={author.name}
              width={96}
              height={96}
              className="size-24 object-cover"
            />
          ) : (
            <Avatar className="size-24 rounded-none">
              <AvatarFallback className="font-heading rounded-none text-2xl">
                {initials(author.name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
        <h3 className="group-hover:text-primary mt-5 text-xl transition-colors">{author.name}</h3>
        {author.role ? (
          <p className="text-primary font-semibold mt-1 text-xs tracking-[0.14em] uppercase">
            {author.role}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
          {author.bio}
        </p>
      </Link>
    </article>
  );
}
