"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import {
  FolderGit2,
  Shield,
  FileText,
  Presentation,
  Library,
  FileSpreadsheet,
  Menu,
  X,
  LayoutGrid,
  Plus,
} from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if a specific file type filter is currently active
  const isTypeActive = (type: string) => {
    if (pathname !== "/") return false;
    const current = searchParams.get("type");
    if (type === "all") return !current || current === "all";
    return current === type;
  };

  useEffect(() => {
    // Check if user has an active admin session
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAdmin(true);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, searchParams]);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand with ourdiu.com style */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-muted-foreground/60 hidden sm:flex items-center">
            <LayoutGrid className="w-4 h-4" />
          </div>

          <Link
            href="/"
            className="flex items-center gap-2.5 group transition-transform active:scale-98"
          >
            <span className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-2xl bg-[#4338ca] dark:bg-[#5d4fe6] text-white shadow-sm group-hover:scale-105 transition-transform">
              <FolderGit2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                DocNest
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links with Active Pill Highlighting (ourdiu style) */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                isTypeActive("all")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              All Files
            </Link>

            <Link
              href="/?type=pdf"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                isTypeActive("pdf")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <FileText
                className={`w-3.5 h-3.5 ${
                  isTypeActive("pdf") ? "text-[#4338ca] dark:text-[#c4bbfd]" : "text-rose-500"
                }`}
              />
              PDFs
            </Link>

            <Link
              href="/?type=docx"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                isTypeActive("docx")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <FileText
                className={`w-3.5 h-3.5 ${
                  isTypeActive("docx") ? "text-[#4338ca] dark:text-[#c4bbfd]" : "text-indigo-500"
                }`}
              />
              Docs
            </Link>

            <Link
              href="/?type=xlsx"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                isTypeActive("xlsx")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <FileSpreadsheet
                className={`w-3.5 h-3.5 ${
                  isTypeActive("xlsx") ? "text-[#4338ca] dark:text-[#c4bbfd]" : "text-emerald-500"
                }`}
              />
              Excel
            </Link>

            <Link
              href="/?type=pptx"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm transition-all ${
                isTypeActive("pptx")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              <Presentation
                className={`w-3.5 h-3.5 ${
                  isTypeActive("pptx") ? "text-[#4338ca] dark:text-[#c4bbfd]" : "text-amber-500"
                }`}
              />
              Slides
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Admin link pill (ourdiu style) */}
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#5d4fe6] dark:hover:bg-[#4f41d9] text-white shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden">Admin</span>
            </Link>
          ) : (
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-95 shadow-2xs"
            >
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Admin</span>
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border/50"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-md px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm transition-colors ${
                isTypeActive("all")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <Library className="w-4 h-4" />
              All Files
            </Link>

            <Link
              href="/?type=pdf"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm transition-colors ${
                isTypeActive("pdf")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <FileText className="w-4 h-4 text-rose-500" />
              PDF Documents
            </Link>

            <Link
              href="/?type=docx"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm transition-colors ${
                isTypeActive("docx")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              Word Documents (.docx)
            </Link>

            <Link
              href="/?type=xlsx"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm transition-colors ${
                isTypeActive("xlsx")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Excel Spreadsheets (.xlsx, .csv)
            </Link>

            <Link
              href="/?type=pptx"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm transition-colors ${
                isTypeActive("pptx")
                  ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium"
              }`}
            >
              <Presentation className="w-4 h-4 text-amber-500" />
              PowerPoint Presentations
            </Link>

            <Link
              href={isAdmin ? "/admin" : "/admin/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Shield className="w-4 h-4 text-primary" />
              {isAdmin ? "Admin Dashboard" : "Admin Sign In"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
