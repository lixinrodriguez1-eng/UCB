import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import RegistrarServiceWorker from "@/components/RegistrarServiceWorker";
import "./globals.css";

// Redondeada y muy legible en letra grande. Next la sirve desde el propio
// sitio, así que también funciona sin internet.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caserita",
  description: "Registra tus ventas y compras por voz y entérate si estás perdiendo plata.",
  applicationName: "Caserita",
  appleWebApp: {
    capable: true,
    title: "Caserita",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8590c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
