import { notFound } from "next/navigation";
import { BookOpenIcon, InboxIcon, PlusIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { ModeToggle } from "@/components/layout/mode-toggle";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { FadeIn } from "@/components/motion/fade-in";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { ToastDemo } from "./toast-demo";

export const metadata = { title: "Kitchen sink", robots: { index: false, follow: false } };

const TOKENS = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "muted",
  "accent",
  "destructive",
  "border",
] as const;

const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </h2>
      <Separator />
      {children}
    </section>
  );
}

/**
 * Design-system reference page. Renders every primitive so both themes can be
 * checked at a glance. Hidden in production rather than deleted, so it stays
 * available for future component work without shipping to visitors.
 */
export default function KitchenSinkPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <Container className="py-12">
      <Section size="sm">
        <PageHeader
          eyebrow="Phase 2 · Design system"
          title="Kitchen sink"
          description="Every shared primitive, rendered once. Toggle the theme to verify both ramps."
          actions={<ModeToggle />}
        />
      </Section>

      <div className="space-y-14 pb-24">
        <Block title="Typography">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold">Heading one, serif display</h1>
            <h2 className="text-3xl font-semibold">Heading two</h2>
            <h3 className="text-2xl font-semibold">Heading three</h3>
            <h4 className="text-xl font-semibold">Heading four</h4>
            <p className="max-w-2xl">
              Body copy is set in the sans face for legibility at small sizes, while headings use
              the serif to carry the editorial tone expected of a publishing house.
            </p>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Muted text, used for secondary detail such as publication dates and counts.
            </p>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <h3>Prose sample</h3>
            <p>
              Article bodies render inside <code>.prose</code>, which inherits the theme tokens so
              long-form content stays readable in both themes. <a href="#top">Links</a> pick up the
              primary colour.
            </p>
            <blockquote>A pull quote, as it would appear inside an article body.</blockquote>
          </div>
        </Block>

        <Block title="Colour tokens">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOKENS.map((token) => (
              <div key={token} className="space-y-2">
                <div
                  className="h-16 w-full rounded-lg border border-border"
                  style={{ background: `var(--${token})` }}
                />
                <p className="font-mono text-xs text-muted-foreground">--{token}</p>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra large (public CTA)</Button>
            <Button size="icon-xl" variant="outline" aria-label="Add">
              <PlusIcon aria-hidden />
            </Button>
            <Button disabled>
              <Spinner />
              Loading
            </Button>
          </div>
        </Block>

        <Block title="Badges and avatars">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Published</Badge>
            <Badge variant="secondary">Draft</Badge>
            <Badge variant="outline">Archived</Badge>
            <Badge variant="destructive">Rejected</Badge>
            <Avatar>
              <AvatarFallback>EP</AvatarFallback>
            </Avatar>
          </div>
        </Block>

        <Block title="Form fields">
          <FieldSet className="max-w-md">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="ks-title">Title</FieldLabel>
                <Input id="ks-title" placeholder="The Cartographer's Daughter" />
                <FieldDescription>
                  Appears on the publication card and detail page.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="ks-format">Format</FieldLabel>
                <Select>
                  <SelectTrigger id="ks-format">
                    <SelectValue placeholder="Select a format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paperback">Paperback</SelectItem>
                    <SelectItem value="hardcover">Hardcover</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="ks-synopsis">Synopsis</FieldLabel>
                <Textarea id="ks-synopsis" rows={3} placeholder="A short description…" />
                <FieldError errors={[{ message: "Synopsis must be at least 50 characters." }]} />
              </Field>
              <Field orientation="horizontal">
                <Checkbox id="ks-featured" />
                <FieldLabel htmlFor="ks-featured">Feature on the homepage</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Switch id="ks-published" />
                <FieldLabel htmlFor="ks-published">Published</FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>
        </Block>

        <Block title="Cards and alerts">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Publication</CardTitle>
                <CardDescription>Card surface against the page background.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Cards carry their own surface token so they stay distinct in both themes.
              </CardContent>
            </Card>
            <div className="space-y-3">
              <Alert>
                <BookOpenIcon aria-hidden />
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>
                  Placeholder content is in use until real copy lands.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Upload rejected</AlertTitle>
                <AlertDescription>
                  Manuscripts must be PDF, DOC or DOCX under 10 MB.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </Block>

        <Block title="Overlays">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit publication</DialogTitle>
                  <DialogDescription>Used for admin forms in Phase 6.</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Mobile navigation</SheetTitle>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Alert dialog</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this publication?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Dropdown</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Unpublish</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>Shown on hover and focus</TooltipContent>
            </Tooltip>
          </div>
          <ToastDemo />
        </Block>

        <Block title="Navigation">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/publications">Publications</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Detail</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#" isActive>
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#">2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="fiction">Fiction</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="pt-3 text-sm text-muted-foreground">
              Tab panel content.
            </TabsContent>
            <TabsContent value="fiction" className="pt-3 text-sm text-muted-foreground">
              Fiction panel.
            </TabsContent>
          </Tabs>
        </Block>

        <Block title="Table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pages</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Placeholder Title One</TableCell>
                <TableCell>
                  <Badge>Published</Badge>
                </TableCell>
                <TableCell className="text-right">312</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Placeholder Title Two</TableCell>
                <TableCell>
                  <Badge variant="secondary">Draft</Badge>
                </TableCell>
                <TableCell className="text-right">198</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Block>

        <Block title="Loading and empty states">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Empty className="rounded-lg border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No submissions yet</EmptyTitle>
                <EmptyDescription>
                  New manuscripts will appear here as they arrive.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" size="sm">
                  Refresh
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        </Block>

        <Block title="Motion">
          <FadeIn whenInView className="text-sm text-muted-foreground">
            This paragraph fades in once when scrolled into view.
          </FadeIn>
          <Stagger className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <StaggerItem key={n}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Staggered card {n}</CardTitle>
                  </CardHeader>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
          <p className="text-xs text-muted-foreground">
            With <code className="font-mono">prefers-reduced-motion</code> enabled, all of the above
            renders in its final state with no animation.
          </p>
        </Block>
      </div>
    </Container>
  );
}
