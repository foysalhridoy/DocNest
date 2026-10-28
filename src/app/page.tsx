"use client";

import { Suspense, useEffect, useState, useTransition, useCallback } from "react";
import { FileRecord, FileListResponse, FolderRecord } from "@/types";
import { FileCard, FileCardSkeleton } from "@/components/FileCard";
import { FolderCard } from "@/components/FolderCard";
import { DEFAULT_CATEGORIES } from "@/lib/config";
import {
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Presentation,
  Library,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Inbox,
  AlertCircle,
  Folder,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

// Authentic 12-lobed smooth scalloped starburst path (inspired by ourdiu.com hero artwork)
const SCALLOPED_STARBURST_PATH =
  "M 80,4 C 83,4 86.3,9.6 88.9,12.6 C 91.5,15.6 92.7,21.3 95.5,22 C 98.4,22.8 102.3,18.5 106,17.2 C 109.8,15.9 115.4,12.7 118,14.2 C 120.6,15.7 120.7,22.2 121.4,26.1 C 122.1,30 120.3,35.5 122.4,37.6 C 124.5,39.7 130,37.9 133.9,38.6 C 137.8,39.3 144.3,39.4 145.8,42 C 147.3,44.6 144.1,50.2 142.8,54 C 141.5,57.7 137.2,61.6 138,64.5 C 138.7,67.3 144.4,68.5 147.4,71.1 C 150.4,73.7 156,77 156,80 C 156,83 150.4,86.3 147.4,88.9 C 144.4,91.5 138.7,92.7 138,95.5 C 137.2,98.4 141.5,102.3 142.8,106 C 144.1,109.8 147.3,115.4 145.8,118 C 144.3,120.6 137.8,120.7 133.9,121.4 C 130,122.1 124.5,120.3 122.4,122.4 C 120.3,124.5 122.1,130 121.4,133.9 C 120.7,137.8 120.6,144.3 118,145.8 C 115.4,147.3 109.8,144.1 106,142.8 C 102.3,141.5 98.4,137.2 95.5,138 C 92.7,138.7 91.5,144.4 88.9,147.4 C 86.3,150.4 83,156 80,156 C 77,156 73.7,150.4 71.1,147.4 C 68.5,144.4 67.3,138.7 64.5,138 C 61.6,137.2 57.7,141.5 54,142.8 C 50.2,144.1 44.6,147.3 42,145.8 C 39.4,144.3 39.3,137.8 38.6,133.9 C 37.9,130 39.7,124.5 37.6,122.4 C 35.5,120.3 30,122.1 26.1,121.4 C 22.2,120.7 15.7,120.6 14.2,118 C 12.7,115.4 15.9,109.8 17.2,106 C 18.5,102.3 22.8,98.4 22,95.5 C 21.3,92.7 15.6,91.5 12.6,88.9 C 9.6,86.3 4,83 4,80 C 4,77 9.6,73.7 12.6,71.1 C 15.6,68.5 21.3,67.3 22,64.5 C 22.8,61.6 18.5,57.7 17.2,54 C 15.9,50.2 12.7,44.6 14.2,42 C 15.7,39.4 22.2,39.3 26.1,38.6 C 30,37.9 35.5,39.7 37.6,37.6 C 39.7,35.5 37.9,30 38.6,26.1 C 39.3,22.2 39.4,15.7 42,14.2 C 44.6,12.7 50.2,15.9 54,17.2 C 57.7,18.5 61.6,22.8 64.5,22 C 67.3,21.3 68.5,15.6 71.1,12.6 C 73.7,9.6 77,4 80,4 Z";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const initialSearch = searchParams.get("search") || "";
  const initialType = (searchParams.get("type") as "all" | "pdf" | "pptx" | "docx" | "xlsx") || "all";
  const initialCategory = searchParams.get("category") || "All";
  const initialSort = (searchParams.get("sort") as "newest" | "oldest" | "name" | "size") || "newest";
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedType, setSelectedType] = useState<"all" | "pdf" | "pptx" | "docx" | "xlsx">(initialType);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedSort, setSelectedSort] = useState<"newest" | "oldest" | "name" | "size">(initialSort);
  const [page, setPage] = useState<number>(initialPage);

  // Synchronize state when URL query params change (e.g. from clicking Navbar links)
  useEffect(() => {
    const urlType = (searchParams.get("type") as "all" | "pdf" | "pptx" | "docx" | "xlsx") || "all";
    if (urlType !== selectedType) {
      setSelectedType(urlType);
      setPage(1);
    }
  }, [searchParams, selectedType]);

  const [data, setData] = useState<FileListResponse | null>(null);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Check admin state
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((me) => {
        if (me.authenticated) setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  // Fetch public root folders
  useEffect(() => {
    fetch("/api/folders")
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setFolders(resData.data);
        }
      })
      .catch(() => {});
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Synchronize URL with active filters
  const updateUrl = useCallback(
    (
      newSearch: string,
      newType: string,
      newCategory: string,
      newSort: string,
      newPage: number
    ) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("search", newSearch);
      if (newType !== "all") params.set("type", newType);
      if (newCategory !== "All") params.set("category", newCategory);
      if (newSort !== "newest") params.set("sort", newSort);
      if (newPage > 1) params.set("page", newPage.toString());

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `/?${query}` : "/", { scroll: false });
      });
    },
    [router]
  );

  // Fetch files
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const query = new URLSearchParams();
    if (debouncedSearch) query.set("search", debouncedSearch);
    if (selectedType !== "all") query.set("type", selectedType);
    if (selectedCategory !== "All") query.set("category", selectedCategory);
    query.set("sort", selectedSort);
    query.set("page", page.toString());
    query.set("limit", "12");

    fetch(`/api/files?${query.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load documents");
        return res.json();
      })
      .then((resData) => {
        if (active) {
          if (resData.success) {
            setData(resData.data);
          } else {
            setError(resData.error || "Failed to fetch files");
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });

    updateUrl(debouncedSearch, selectedType, selectedCategory, selectedSort, page);

    return () => {
      active = false;
    };
  }, [debouncedSearch, selectedType, selectedCategory, selectedSort, page, updateUrl]);

  // Keyboard shortcut listener for '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        const input = document.getElementById("search-input");
        if (input) input.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-12 w-full flex-1 overflow-x-hidden">
      {/* Hero Header with ourdiu.com Inspired Style */}
      <section className="mb-8 sm:mb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          {/* Left Column: Headline, Subtitle, Search Pill, Format Chips */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ede9fe] dark:bg-[#231f4a] px-3.5 py-1 text-xs sm:text-sm font-semibold text-[#4338ca] dark:text-[#a59bf7] shadow-2xs">
              <span className="flex size-4 items-center justify-center rounded-full bg-[#4338ca] dark:bg-[#a59bf7] text-white dark:text-[#0e0d15] text-[10px] font-bold">
                ✓
              </span>
              <span>DocNest · Personal Document Vault · free & secure</span>
            </div>

            <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.06] break-words">
              Find your<br />files.
            </h1>

            <p className="text-xs sm:text-base lg:text-lg text-muted-foreground text-pretty max-w-xl leading-relaxed">
              Upload, preview, and download your verified PDFs, Word documents, Excel spreadsheets, and presentations—stored securely with dual-fleet Google Drive and granular privacy controls.
            </p>

            {/* Search Bar with integrated Search Pill Button (ourdiu.com style - Mobile Perfect) */}
            <div className="relative max-w-xl pt-1 w-full">
              <div className="relative flex items-center bg-card dark:bg-[#161522] rounded-full border border-border/80 dark:border-[#262438] shadow-sm p-1 sm:p-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all w-full">
                <Search className="ml-3 sm:ml-4 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground pointer-events-none shrink-0" />
                <input
                  id="search-input"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents, spreadsheets..."
                  className="w-full min-w-0 h-10 sm:h-12 pl-2 sm:pl-3 pr-2 bg-transparent text-foreground outline-none text-xs sm:text-base placeholder:text-muted-foreground font-medium"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-xs font-semibold px-2 py-1 mr-1 rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                  >
                    ✕
                  </button>
                )}
                <button
                  onClick={() => {
                    setDebouncedSearch(search);
                    setPage(1);
                  }}
                  className="shrink-0 px-4 sm:px-7 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-bold bg-[#4338ca] hover:bg-[#3730a3] dark:bg-[#5d4fe6] dark:hover:bg-[#4f41d9] text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Mobile Format Quick-Access Buttons with Scaled Scalloped Starburst (< sm) */}
            <div className="grid grid-cols-4 gap-2 sm:hidden pt-2 pb-1 w-full">
              {/* PDF */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "pdf" ? "all" : "pdf");
                  setPage(1);
                }}
                className="flex flex-col items-center justify-center group focus:outline-none cursor-pointer py-1"
              >
                <div
                  className={`relative size-16 flex items-center justify-center transition-all duration-300 ${
                    selectedType === "pdf"
                      ? "scale-108 drop-shadow-md"
                      : "active:scale-95 group-hover:scale-105"
                  }`}
                >
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full transition-all ${
                      selectedType === "pdf" ? "filter brightness-105 ring-2 ring-rose-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#ded8fc] dark:fill-[#2e2577]"
                    />
                  </svg>
                  <div className="relative z-10 size-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-700 shadow-2xs flex items-center justify-center text-white">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                      <path d="M19.38 12.87c-.6-.67-1.48-1.12-2.52-1.31-.4-.07-.81-.11-1.22-.11-.53 0-1.05.06-1.55.17-.44-.45-.88-.95-1.32-1.49-.69-.85-1.34-1.78-1.92-2.76.29-1.07.47-2.17.5-3.26.02-.69-.08-1.38-.34-2-.31-.73-.87-1.29-1.58-1.57-.46-.18-.95-.27-1.45-.27-.72 0-1.41.2-2 .57-.8.51-1.36 1.3-1.58 2.22-.3 1.27-.05 2.58.55 3.9.43.94 1.05 1.88 1.82 2.79-.31.95-.67 1.95-1.07 2.99-.48 1.26-1.01 2.56-1.58 3.86-1.25.6-2.45 1.34-3.5 2.21-.86.71-1.53 1.57-1.94 2.53-.4.94-.5 1.96-.28 2.95.23 1.05.86 1.95 1.74 2.49.67.41 1.44.62 2.23.62 1.36 0 2.7-.63 3.79-1.73 1.23-1.24 2.27-2.89 3.06-4.83 1.34-.45 2.73-.85 4.13-1.17 1.13.88 2.3 1.63 3.49 2.21.93.45 1.87.72 2.78.78.31.02.61.03.91.03.96 0 1.89-.31 2.65-.9.9-.7 1.45-1.75 1.51-2.88.06-1.17-.38-2.31-1.15-3.13zM9.5 3.65c.29 0 .54.1.72.29.17.18.25.43.23.7-.04.91-.22 1.85-.5 2.77-.94-.85-1.46-1.78-1.54-2.73-.04-.41.05-.72.23-.92.17-.18.47-.28.86-.28zm-4.73 18.22c-.44-.27-.7-.7-.76-1.24-.07-.63.09-1.24.45-1.76.62-.89 1.57-1.63 2.73-2.22-.57 2.1-1.44 3.75-2.42 4.67-.32.3-.65.49-.96.55h-.04zm12.35-4.49c-.8-.41-1.61-.92-2.4-1.51.81-.19 1.62-.35 2.42-.48.42.54.76 1.12.98 1.71-.31.18-.65.28-1 .28zm2.29-1.74c-.13.3-.34.54-.62.7-.22-.64-.59-1.26-1.08-1.85.59-.09 1.15-.13 1.69-.13.14 0 .28 0 .42.02.04.42-.09.87-.41 1.26z" />
                    </svg>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold mt-1 transition-colors ${
                    selectedType === "pdf"
                      ? "text-rose-600 dark:text-rose-400 font-black"
                      : "text-foreground/80"
                  }`}
                >
                  PDF
                </span>
              </button>

              {/* Word */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "docx" ? "all" : "docx");
                  setPage(1);
                }}
                className="flex flex-col items-center justify-center group focus:outline-none cursor-pointer py-1"
              >
                <div
                  className={`relative size-16 flex items-center justify-center transition-all duration-300 ${
                    selectedType === "docx"
                      ? "scale-108 drop-shadow-md"
                      : "active:scale-95 group-hover:scale-105"
                  }`}
                >
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full transition-all ${
                      selectedType === "docx" ? "filter brightness-105 ring-2 ring-indigo-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#f9d8d6] dark:fill-[#4a182b]"
                    />
                  </svg>
                  <div className="relative z-10 size-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-700 shadow-2xs flex items-center justify-center text-white">
                    <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none">
                      <path
                        d="M8.5 10.5 L11.5 21 L15 11 L18.5 21 L21.5 10.5"
                        stroke="white"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold mt-1 transition-colors ${
                    selectedType === "docx"
                      ? "text-indigo-600 dark:text-indigo-400 font-black"
                      : "text-foreground/80"
                  }`}
                >
                  Word
                </span>
              </button>

              {/* Excel */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "xlsx" ? "all" : "xlsx");
                  setPage(1);
                }}
                className="flex flex-col items-center justify-center group focus:outline-none cursor-pointer py-1"
              >
                <div
                  className={`relative size-16 flex items-center justify-center transition-all duration-300 ${
                    selectedType === "xlsx"
                      ? "scale-108 drop-shadow-md"
                      : "active:scale-95 group-hover:scale-105"
                  }`}
                >
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full transition-all ${
                      selectedType === "xlsx" ? "filter brightness-105 ring-2 ring-emerald-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#fde68a] dark:fill-[#5c430e]"
                    />
                  </svg>
                  <div className="relative z-10 size-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 shadow-2xs flex items-center justify-center text-white">
                    <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none">
                      <path
                        d="M9.5 10.5 L19.5 21.5 M19.5 10.5 L9.5 21.5"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold mt-1 transition-colors ${
                    selectedType === "xlsx"
                      ? "text-emerald-600 dark:text-emerald-400 font-black"
                      : "text-foreground/80"
                  }`}
                >
                  Excel
                </span>
              </button>

              {/* PPTX */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "pptx" ? "all" : "pptx");
                  setPage(1);
                }}
                className="flex flex-col items-center justify-center group focus:outline-none cursor-pointer py-1"
              >
                <div
                  className={`relative size-16 flex items-center justify-center transition-all duration-300 ${
                    selectedType === "pptx"
                      ? "scale-108 drop-shadow-md"
                      : "active:scale-95 group-hover:scale-105"
                  }`}
                >
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full transition-all ${
                      selectedType === "pptx" ? "filter brightness-105 ring-2 ring-amber-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#cbf3e4] dark:fill-[#124235]"
                    />
                  </svg>
                  <div className="relative z-10 size-7 rounded-lg bg-gradient-to-br from-orange-500 to-rose-600 shadow-2xs flex items-center justify-center text-white">
                    <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none">
                      <path
                        d="M10 21.5 V10.5 H15.5 C17.8 10.5 19.5 12 19.5 14 C19.5 16 17.8 17.5 15.5 17.5 H10"
                        stroke="white"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold mt-1 transition-colors ${
                    selectedType === "pptx"
                      ? "text-amber-600 dark:text-amber-400 font-black"
                      : "text-foreground/80"
                  }`}
                >
                  PPTX
                </span>
              </button>
            </div>

            {/* Desktop / Tablet Format Chips with Counts */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pt-1 sm:pt-2">
              <button
                onClick={() => {
                  setSelectedType("all");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  selectedType === "all"
                    ? "bg-[#ede9fe] dark:bg-[#252147] text-[#4338ca] dark:text-[#c4bbfd] border border-[#ddd6fe] dark:border-[#37306b]"
                    : "bg-[#f1f0f9] dark:bg-[#191827] text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <span>All Files</span>
                <span className="opacity-70 text-[11px] font-semibold">
                  {data?.total ?? "•"}
                </span>
              </button>

              <button
                onClick={() => {
                  setSelectedType("pdf");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  selectedType === "pdf"
                    ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                    : "bg-[#f1f0f9] dark:bg-[#191827] text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <span>PDF</span>
              </button>

              <button
                onClick={() => {
                  setSelectedType("docx");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  selectedType === "docx"
                    ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"
                    : "bg-[#f1f0f9] dark:bg-[#191827] text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <span>DOCX</span>
              </button>

              <button
                onClick={() => {
                  setSelectedType("xlsx");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  selectedType === "xlsx"
                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    : "bg-[#f1f0f9] dark:bg-[#191827] text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <span>XLSX</span>
              </button>

              <button
                onClick={() => {
                  setSelectedType("pptx");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  selectedType === "pptx"
                    ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    : "bg-[#f1f0f9] dark:bg-[#191827] text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                <span>PPTX</span>
              </button>
            </div>
          </div>

          {/* Right Column: Whimsical Organic Floating Scalloped Starburst Badges with Authentic Logos (ourdiu.com hero artwork) */}
          <div className="lg:col-span-5 hidden sm:flex items-center justify-center p-4">
            <div className="relative w-full max-w-[360px] h-[320px]">
              {/* Scalloped Starburst with Adobe Acrobat PDF Logo */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "pdf" ? "all" : "pdf");
                  setPage(1);
                }}
                title="Filter by PDF documents"
                className={`absolute top-2 left-2 group transition-all duration-300 cursor-pointer focus:outline-none ${
                  selectedType === "pdf" ? "scale-110 drop-shadow-lg" : "hover:scale-108 hover:-rotate-3 active:scale-95"
                }`}
              >
                <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
                  {/* Organic Scalloped Starburst Background */}
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:drop-shadow-md ${
                      selectedType === "pdf" ? "filter brightness-105 ring-2 ring-rose-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#ded8fc] dark:fill-[#2e2577]"
                    />
                  </svg>

                  {/* Centered Adobe PDF Logo Badge */}
                  <div className="relative z-10 flex flex-col items-center gap-1 select-none">
                    <div className="size-11 sm:size-12 rounded-xl bg-gradient-to-br from-red-500 via-rose-600 to-red-700 shadow-md shadow-red-500/35 flex items-center justify-center border border-white/25 group-hover:scale-105 transition-transform">
                      {/* Authentic Adobe Acrobat Ribbon Logo */}
                      <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                        <path d="M19.38 12.87c-.6-.67-1.48-1.12-2.52-1.31-.4-.07-.81-.11-1.22-.11-.53 0-1.05.06-1.55.17-.44-.45-.88-.95-1.32-1.49-.69-.85-1.34-1.78-1.92-2.76.29-1.07.47-2.17.5-3.26.02-.69-.08-1.38-.34-2-.31-.73-.87-1.29-1.58-1.57-.46-.18-.95-.27-1.45-.27-.72 0-1.41.2-2 .57-.8.51-1.36 1.3-1.58 2.22-.3 1.27-.05 2.58.55 3.9.43.94 1.05 1.88 1.82 2.79-.31.95-.67 1.95-1.07 2.99-.48 1.26-1.01 2.56-1.58 3.86-1.25.6-2.45 1.34-3.5 2.21-.86.71-1.53 1.57-1.94 2.53-.4.94-.5 1.96-.28 2.95.23 1.05.86 1.95 1.74 2.49.67.41 1.44.62 2.23.62 1.36 0 2.7-.63 3.79-1.73 1.23-1.24 2.27-2.89 3.06-4.83 1.34-.45 2.73-.85 4.13-1.17 1.13.88 2.3 1.63 3.49 2.21.93.45 1.87.72 2.78.78.31.02.61.03.91.03.96 0 1.89-.31 2.65-.9.9-.7 1.45-1.75 1.51-2.88.06-1.17-.38-2.31-1.15-3.13zM9.5 3.65c.29 0 .54.1.72.29.17.18.25.43.23.7-.04.91-.22 1.85-.5 2.77-.94-.85-1.46-1.78-1.54-2.73-.04-.41.05-.72.23-.92.17-.18.47-.28.86-.28zm-4.73 18.22c-.44-.27-.7-.7-.76-1.24-.07-.63.09-1.24.45-1.76.62-.89 1.57-1.63 2.73-2.22-.57 2.1-1.44 3.75-2.42 4.67-.32.3-.65.49-.96.55h-.04zm12.35-4.49c-.8-.41-1.61-.92-2.4-1.51.81-.19 1.62-.35 2.42-.48.42.54.76 1.12.98 1.71-.31.18-.65.28-1 .28zm2.29-1.74c-.13.3-.34.54-.62.7-.22-.64-.59-1.26-1.08-1.85.59-.09 1.15-.13 1.69-.13.14 0 .28 0 .42.02.04.42-.09.87-.41 1.26z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-[#241a7d] dark:text-white uppercase drop-shadow-2xs">
                      PDF
                    </span>
                  </div>
                </div>
              </button>

              {/* Scalloped Starburst with Microsoft Word Logo */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "docx" ? "all" : "docx");
                  setPage(1);
                }}
                title="Filter by Word documents"
                className={`absolute top-0 right-3 group transition-all duration-300 cursor-pointer focus:outline-none ${
                  selectedType === "docx" ? "scale-110 drop-shadow-lg" : "hover:scale-108 hover:rotate-4 active:scale-95"
                }`}
              >
                <div className="relative w-30 h-30 sm:w-34 sm:h-34 flex items-center justify-center">
                  {/* Organic Scalloped Starburst Background */}
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:drop-shadow-md ${
                      selectedType === "docx" ? "filter brightness-105 ring-2 ring-indigo-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#f9d8d6] dark:fill-[#4a182b]"
                    />
                  </svg>

                  {/* Centered Microsoft Word Logo Badge */}
                  <div className="relative z-10 flex flex-col items-center gap-1 select-none">
                    <div className="size-10 sm:size-11 rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-md shadow-blue-500/35 flex items-center justify-center border border-white/25 group-hover:scale-105 transition-transform">
                      {/* Authentic Microsoft Word "W" Document Logo */}
                      <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                        <rect x="2" y="3" width="22" height="26" rx="3" fill="#0d47a1" opacity="0.35" />
                        <rect x="4" y="5" width="22" height="22" rx="3" fill="#185abd" />
                        <path
                          d="M8.5 10.5 L11.5 21 L15 11 L18.5 21 L21.5 10.5"
                          stroke="white"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-[#6e1b34] dark:text-[#fbcfe8] uppercase drop-shadow-2xs">
                      WORD
                    </span>
                  </div>
                </div>
              </button>

              {/* Scalloped Starburst with Microsoft Excel Logo */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "xlsx" ? "all" : "xlsx");
                  setPage(1);
                }}
                title="Filter by Excel spreadsheets"
                className={`absolute bottom-1 left-5 group transition-all duration-300 cursor-pointer focus:outline-none ${
                  selectedType === "xlsx" ? "scale-110 drop-shadow-lg" : "hover:scale-108 hover:rotate-3 active:scale-95"
                }`}
              >
                <div className="relative w-28 h-28 sm:w-31 sm:h-31 flex items-center justify-center">
                  {/* Organic Scalloped Starburst Background */}
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:drop-shadow-md ${
                      selectedType === "xlsx" ? "filter brightness-105 ring-2 ring-emerald-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#fde68a] dark:fill-[#5c430e]"
                    />
                  </svg>

                  {/* Centered Microsoft Excel Logo Badge */}
                  <div className="relative z-10 flex flex-col items-center gap-1 select-none">
                    <div className="size-10 sm:size-11 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 shadow-md shadow-emerald-500/35 flex items-center justify-center border border-white/25 group-hover:scale-105 transition-transform">
                      {/* Authentic Microsoft Excel "X" Spreadsheet Logo */}
                      <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                        <rect x="2" y="3" width="22" height="26" rx="3" fill="#064e3b" opacity="0.35" />
                        <rect x="4" y="5" width="22" height="22" rx="3" fill="#107c41" />
                        <path
                          d="M9.5 10.5 L19.5 21.5 M19.5 10.5 L9.5 21.5"
                          stroke="white"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-[#78350f] dark:text-[#fef3c7] uppercase drop-shadow-2xs">
                      EXCEL
                    </span>
                  </div>
                </div>
              </button>

              {/* Scalloped Starburst with Microsoft PowerPoint Logo */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType(selectedType === "pptx" ? "all" : "pptx");
                  setPage(1);
                }}
                title="Filter by PowerPoint slides"
                className={`absolute bottom-1 right-5 group transition-all duration-300 cursor-pointer focus:outline-none ${
                  selectedType === "pptx" ? "scale-110 drop-shadow-lg" : "hover:scale-108 hover:-rotate-4 active:scale-95"
                }`}
              >
                <div className="relative w-29 h-29 sm:w-32 sm:h-32 flex items-center justify-center">
                  {/* Organic Scalloped Starburst Background */}
                  <svg
                    viewBox="0 0 160 160"
                    className={`absolute inset-0 w-full h-full drop-shadow-sm transition-transform duration-300 group-hover:drop-shadow-md ${
                      selectedType === "pptx" ? "filter brightness-105 ring-2 ring-amber-500/60 rounded-full" : ""
                    }`}
                  >
                    <path
                      d={SCALLOPED_STARBURST_PATH}
                      className="fill-[#cbf3e4] dark:fill-[#124235]"
                    />
                  </svg>

                  {/* Centered Microsoft PowerPoint Logo Badge */}
                  <div className="relative z-10 flex flex-col items-center gap-1 select-none">
                    <div className="size-10 sm:size-11 rounded-xl bg-gradient-to-br from-orange-500 via-amber-600 to-rose-600 shadow-md shadow-orange-500/35 flex items-center justify-center border border-white/25 group-hover:scale-105 transition-transform">
                      {/* Authentic Microsoft PowerPoint "P" Slide Logo */}
                      <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                        <rect x="2" y="3" width="22" height="26" rx="3" fill="#7c2d12" opacity="0.35" />
                        <rect x="4" y="5" width="22" height="22" rx="3" fill="#d83b01" />
                        <path
                          d="M10 21.5 V10.5 H15.5 C17.8 10.5 19.5 12 19.5 14 C19.5 16 17.8 17.5 15.5 17.5 H10"
                          stroke="white"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-black tracking-widest text-[#064e3b] dark:text-[#a7f3d0] uppercase drop-shadow-2xs">
                      PPTX
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Folders Section (inspired by ourdiu.com's "Browse" section) */}
      {!debouncedSearch && folders.length > 0 && selectedCategory === "All" && selectedType === "all" && (
        <section className="mb-10 sm:mb-14 space-y-4 sm:space-y-6">
          <div className="flex items-end justify-between border-b border-border/50 pb-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Browse Folders
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {folders.length} {folders.length === 1 ? "folder" : "folders"} organized for quick access
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* Main Documents Content Section (inspired by ourdiu.com's "Most viewed today" & "Recently added") */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {debouncedSearch ? `Search results for "${debouncedSearch}"` : "Documents"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {data ? `${data.total} total documents available` : "Browsing documents"}
            </p>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value as "newest" | "oldest" | "name" | "size");
                setPage(1);
              }}
              className="bg-card dark:bg-[#161522] text-foreground border border-border/80 dark:border-[#262438] rounded-full px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Title (A-Z)</option>
              <option value="size">File Size (Largest)</option>
            </select>
          </div>
        </div>

        {/* Category Pills Bar with Smooth Edge Bleed on Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none text-xs -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          <span className="text-muted-foreground font-semibold shrink-0 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-primary" /> Filter:
          </span>
          {DEFAULT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setPage(1);
              }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full font-semibold transition-all active:scale-95 cursor-pointer ${
                selectedCategory === cat
                  ? "bg-[#4338ca] dark:bg-[#5d4fe6] text-white shadow-2xs"
                  : "bg-card dark:bg-[#161522] text-muted-foreground hover:text-foreground hover:border-primary/40 border border-border/70 dark:border-[#262438]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {error && (
          <div className="p-4 mb-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-800 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Count */}
        {!loading && data && (
          <div className="flex items-center justify-between mb-6 text-xs sm:text-sm text-muted-foreground">
            <span>
              Showing <strong className="text-foreground">{data.files.length}</strong> of{" "}
              <strong className="text-foreground">{data.total}</strong> documents
            </span>
            {selectedCategory !== "All" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Filtered by {selectedCategory}
              </span>
            )}
          </div>
        )}

        {/* Skeleton Loaders */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <FileCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {data.files.map((file) => (
              <FileCard key={file.id} file={file} isAdmin={isAdmin} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-border bg-card/50 max-w-xl mx-auto my-8">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No documents found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search
                ? `No files matching "${search}". Try searching another keyword or clearing filters.`
                : "No files available in this category yet."}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setSelectedType("all");
                setSelectedCategory("All");
                setPage(1);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-all shadow-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && data && data.totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-full border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: data.totalPages }).map((_, i) => {
                const pageNum = i + 1;
                // Show first, last, and current +- 1
                if (
                  pageNum === 1 ||
                  pageNum === data.totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`size-9 rounded-full text-xs font-semibold transition-colors ${
                        page === pageNum
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span key={pageNum} className="text-muted-foreground px-1 text-xs">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="p-2 rounded-full border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1">
          <div className="h-12 w-2/3 bg-muted rounded-2xl mb-8 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <FileCardSkeleton key={i} />
            ))}
          </div>
        </main>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
