/**
 * Seeds the database.
 *
 * Idempotent: every write is an upsert keyed on a natural unique field, so
 * running it twice changes nothing and re-running after editing a fixture
 * updates the existing document rather than duplicating it.
 *
 *   npm run seed            # upsert content, leave existing admin alone
 *   npm run seed -- --reset # drop the content collections first
 *
 * The admin password is only ever read from SEED_ADMIN_PASSWORD and is stored
 * as a bcrypt hash. It is never logged.
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { articles, authors, categories, publications, services } from "@/lib/fixtures";
import { siteConfig } from "@/lib/site-config";
import { Article, Author, Category, Publication, Service, SiteSettings, User } from "@/models";

const reset = process.argv.includes("--reset");

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}. Copy .env.example to .env.local and fill it in.`);
  return value;
}

async function seedAdmin() {
  const email = requireEnv("SEED_ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("SEED_ADMIN_PASSWORD");
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Site Administrator";

  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`  admin           already exists (${email}) — password left unchanged`);
    return;
  }

  await User.create({
    email,
    name,
    role: "admin",
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.log(`  admin           created (${email})`);
}

async function seedContent() {
  // Categories first: publications and articles reference them by slug.
  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const category of categories) {
    const doc = await Category.findOneAndUpdate(
      { slug: category.slug },
      { $set: { name: category.name, description: category.description } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    categoryIds.set(category.id, doc._id);
  }
  console.log(`  categories      ${categories.length}`);

  const authorIds = new Map<string, mongoose.Types.ObjectId>();
  for (const author of authors) {
    const doc = await Author.findOneAndUpdate(
      { slug: author.slug },
      {
        $set: {
          name: author.name,
          role: author.role,
          bio: author.bio,
          featured: author.featured,
          socials: author.socials ?? [],
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    authorIds.set(author.id, doc._id);
  }
  console.log(`  authors         ${authors.length}`);

  for (const publication of publications) {
    const author = authorIds.get(publication.authorId);
    const category = categoryIds.get(publication.categoryId);
    if (!author || !category) {
      throw new Error(`Publication "${publication.slug}" references a missing author or category.`);
    }
    await Publication.findOneAndUpdate(
      { slug: publication.slug },
      {
        $set: {
          title: publication.title,
          author,
          category,
          isbn: publication.isbn,
          description: publication.description,
          excerpt: publication.excerpt,
          publicationDate: publication.publicationDate,
          format: publication.format,
          pages: publication.pages,
          featured: publication.featured,
          status: publication.status,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }
  console.log(
    `  publications    ${publications.length} (${publications.filter((p) => p.status === "published").length} published)`,
  );

  for (const article of articles) {
    const category = categoryIds.get(article.categoryId);
    if (!category) throw new Error(`Article "${article.slug}" references a missing category.`);
    await Article.findOneAndUpdate(
      { slug: article.slug },
      {
        $set: {
          title: article.title,
          excerpt: article.excerpt,
          body: article.body,
          authorName: article.authorName,
          category,
          tags: article.tags,
          publishedAt: article.publishedAt,
          status: article.status,
          featured: article.featured,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }
  console.log(
    `  articles        ${articles.length} (${articles.filter((a) => a.status === "published").length} published)`,
  );

  for (const service of services) {
    await Service.findOneAndUpdate(
      { slug: service.slug },
      {
        $set: {
          title: service.title,
          summary: service.summary,
          body: service.body,
          icon: service.icon,
          order: service.order,
          status: service.status,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }
  console.log(`  services        ${services.length}`);
}

async function seedSettings() {
  // Seeded from the placeholder site config so an admin has something to edit
  // rather than an empty form. None of it is supplied company information.
  const existing = await SiteSettings.findOne({ key: "site" });
  if (existing) {
    console.log("  site settings   already exist — left unchanged");
    return;
  }

  await SiteSettings.create({
    key: "site",
    name: siteConfig.name,
    tagline: siteConfig.tagline,
    description: siteConfig.description,
    contact: {
      email: siteConfig.contact.email,
      phone: siteConfig.contact.phone,
      address: { ...siteConfig.contact.address },
    },
    socials: Object.entries(siteConfig.socials)
      .filter(([, href]) => href)
      .map(([label, href]) => ({ label, href })),
    seo: {
      defaultTitle: `${siteConfig.name} — ${siteConfig.tagline}`,
      defaultDescription: siteConfig.description,
    },
  });
  console.log("  site settings   created from placeholder config");
}

async function main() {
  await connectToDatabase();
  console.log(`Connected to ${mongoose.connection.name}`);

  if (reset) {
    // Users are deliberately excluded: --reset clears content, not accounts.
    // Typed loosely because the models have different document generics and
    // TypeScript cannot unify them into one array.
    const contentModels: { deleteMany: (filter: object) => unknown }[] = [
      Category,
      Author,
      Publication,
      Article,
      Service,
      SiteSettings,
    ];
    for (const model of contentModels) {
      await model.deleteMany({});
    }
    console.log("Reset content collections (users left intact)\n");
  }

  await seedAdmin();
  await seedContent();
  await seedSettings();

  // Builds the indexes declared on the schemas, so the first real query is not
  // the thing that triggers an index build.
  const allModels: { syncIndexes: () => Promise<unknown> }[] = [
    User,
    Category,
    Author,
    Publication,
    Article,
    Service,
    SiteSettings,
  ];
  await Promise.all(allModels.map((m) => m.syncIndexes()));
  console.log("\nIndexes synced. Seed complete.");
}

main()
  .catch((error: unknown) => {
    console.error("\nSeed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectFromDatabase();
  });
