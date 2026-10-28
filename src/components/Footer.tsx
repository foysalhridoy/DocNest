"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderGit2, Heart, Shield, FileText, Presentation, Folder, HardDrive, ExternalLink } from "lucide-react";

export function Footer() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30 backdrop-blur-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-12 lg:py-14">
        {/* Responsive Grid: Hidden on mobile (< sm), shown on tablet & desktop */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12">
          {/* Brand Info (Spans 2 cols on tablet & desktop) */}
          <div className="sm:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-foreground group"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#4338ca] dark:bg-[#5d4fe6] text-white shadow-sm group-hover:scale-105 transition-transform">
                <FolderGit2 className="w-4 h-4" />
              </span>
              <span>DocNest</span>
            </Link>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
              A modern, high-speed personal cloud file vault. Safely store, organize, preview, and download your PDF documents, Word files, Excel spreadsheets, and slides powered by Google Drive dual-fleet storage.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Dual-Drive Fleet Active
              </span>

              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span>Built for</span>
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>everyday productivity</span>
              </span>
            </div>
          </div>

          {/* Column 1: Document Formats */}
          <div className="space-y-3.5">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              Formats
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-primary transition-colors inline-block py-0.5">
                  All Files
                </Link>
              </li>
              <li>
                <Link href="/?type=pdf" className="hover:text-primary transition-colors inline-block py-0.5">
                  PDF Documents
                </Link>
              </li>
              <li>
                <Link href="/?type=docx" className="hover:text-primary transition-colors inline-block py-0.5">
                  Word Documents (.docx)
                </Link>
              </li>
              <li>
                <Link href="/?type=xlsx" className="hover:text-primary transition-colors inline-block py-0.5">
                  Excel Spreadsheets (.xlsx)
                </Link>
              </li>
              <li>
                <Link href="/?type=pptx" className="hover:text-primary transition-colors inline-block py-0.5">
                  PowerPoint Slides (.pptx)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Storage Categories */}
          <div className="space-y-3.5">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-primary" />
              Categories
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/?category=Projects" className="hover:text-primary transition-colors inline-block py-0.5">
                  Projects & Blueprints
                </Link>
              </li>
              <li>
                <Link href="/?category=Spreadsheets" className="hover:text-primary transition-colors inline-block py-0.5">
                  Spreadsheets & Data
                </Link>
              </li>
              <li>
                <Link href="/?category=Documents" className="hover:text-primary transition-colors inline-block py-0.5">
                  Docs & Contracts
                </Link>
              </li>
              <li>
                <Link href="/?category=Finance" className="hover:text-primary transition-colors inline-block py-0.5">
                  Finance & Budget
                </Link>
              </li>
              <li>
                <Link href="/?category=Personal" className="hover:text-primary transition-colors inline-block py-0.5">
                  Personal Archive
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Management & Links */}
          <div className="space-y-3.5">
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-primary" />
              Administration
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li>
                <Link href="/admin" className="hover:text-primary transition-colors inline-block py-0.5">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-primary transition-colors inline-block py-0.5">
                  Admin Sign In
                </Link>
              </li>
              <li>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors inline-flex items-center gap-1 py-0.5"
                >
                  <span>Supabase Cloud</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/70" />
                </a>
              </li>
              <li>
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors inline-flex items-center gap-1 py-0.5"
                >
                  <span>Google Drive Fleet</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/70" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Responsive Alignment */}
        <div className="mt-0 pt-0 sm:mt-12 sm:pt-8 border-t-0 sm:border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-muted-foreground text-center sm:text-left">
          <p className="order-2 sm:order-1">
            © {year} <span className="font-semibold text-foreground">DocNest</span>. Personal Cloud & Document Storage Vault.
          </p>

          <div className="order-1 sm:order-2 flex flex-wrap items-center justify-center gap-4 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              Dual-Drive Failover Storage
            </span>
            <span>•</span>
            <span>Next.js 16 & Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
