import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "DocNest — Personal Cloud Drive & Document Vault",
  description:
    "Store, organize, preview, and download your PDFs, Word documents, Excel spreadsheets, and presentations with dual-fleet Google Drive storage.",
  keywords: ["DocNest", "cloud drive", "file storage", "PDF", "Word", "Excel", "PPTX", "Google Drive", "file vault"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Instant theme script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('docnest_theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="relative flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary overflow-x-hidden w-full max-w-full">
        {/* Ambient atmospheric lighting (hidden in dark mode for pure full black) */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden dark:hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-purple-500/6 to-transparent dark:from-indigo-500/16 dark:via-purple-500/8 blur-3xl opacity-90" />
          <div className="absolute top-1/3 -left-40 w-[450px] h-[450px] bg-gradient-to-tr from-cyan-500/6 to-transparent dark:from-cyan-500/10 blur-3xl opacity-70" />
          <div className="absolute bottom-10 -right-40 w-[550px] h-[450px] bg-gradient-to-tl from-purple-500/6 to-transparent dark:from-indigo-500/10 blur-3xl opacity-70" />
        </div>

        <ToastProvider>
          <Suspense fallback={<header className="h-16 w-full border-b border-border/50 bg-background/85" />}>
            <Navbar />
          </Suspense>
          <div className="flex-1 flex flex-col">{children}</div>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
