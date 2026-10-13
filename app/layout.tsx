import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { I18nProvider } from "../lib/i18n";
import { AuthProvider } from "../context/AuthContext";
import { Header } from "../components/Header";
import { BottomNav } from "../components/BottomNav";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "KisanDrishti — Crop Doctor & Farm Assistant",
  description: "Mobile-first AI crop diagnosis and farm safety guidance for small farmers in India.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KisanDrishti",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#047857",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-900 font-sans">
        <I18nProvider>
          <AuthProvider>
            {/* Google Firebase CDN Scripts: 0 MB on laptop, loaded on-demand by client */}
            <Script
              src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
              strategy="afterInteractive"
            />
            <Script
              src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"
              strategy="afterInteractive"
            />
            <Script
              src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"
              strategy="afterInteractive"
            />

            {/* Mobile frame constrained to max-w-md (360px+ phone view) */}
            <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white shadow-xl relative border-x border-slate-200">
              <Header />
              <main className="flex-1 w-full pb-20 overflow-y-auto">
                {children}
              </main>
              <div className="pb-16">
                <Footer />
              </div>
              <BottomNav />
            </div>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
