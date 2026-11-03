import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/src/components/auth-provider";
import { Providers } from "@/src/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ILC Center Exams",
  description: "İngiliz Kültür Koleji sınav merkezi",
  applicationName: "ILC Center Exams",
  // F3-01: manifest.json + ikonlar public/'ta, Next bunu <link rel="manifest"> olarak yazar.
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1d3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
