import type { Metadata } from "next";
import { AuthProvider } from "@/src/components/auth-provider";
import { Providers } from "@/src/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ILC Center Exams",
  description: "İngiliz Kültür Koleji sınav merkezi",
  applicationName: "ILC Center Exams",
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
