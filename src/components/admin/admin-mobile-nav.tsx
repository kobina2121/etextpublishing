"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";

import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <MenuIcon aria-hidden />
          <span className="sr-only">Open admin menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(17rem,85vw)] p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-left">Admin</SheetTitle>
        </SheetHeader>
        <div className="p-3">
          {/* Closing on navigate: without it the sheet stays open over the new page. */}
          <AdminSidebarNav onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
