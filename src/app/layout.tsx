import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "4everOPS",
  description: "Trip operations for camp staff",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "4everOPS",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b14" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Without this, a fixed-position element (the bottom-sheet Modal, the
  // BottomNav) is positioned against the full layout viewport, which the
  // on-screen keyboard doesn't shrink — so the keyboard just covers
  // whatever happens to be near the bottom instead of the page making
  // room for it. This tells the browser to actually resize the layout
  // viewport when the keyboard opens, same as a native app.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before paint so a stored theme choice doesn't flash the wrong
            colors on load. Absent a stored value, CSS just follows the OS
            setting as before — this only ever narrows, never overrides. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
