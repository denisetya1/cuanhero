import type { Metadata } from "next";
import { Orbitron, Inter } from "next/font/google";
import AppToastContainer from "@/components/AppToastContainer";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// 3. KONFIGURASI FONT ORBITRON (Untuk angka/judul futuristik)
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"], // Pilih weight yang dibutuhkan
  variable: "--font-orbitron", // Didaftarkan sebagai CSS Variable
});

export const metadata: Metadata = {
  title: "CUANHERO",
  description:
    "CuanHero - Robot Trading Otomatis untuk Forex dan Gold. Dilengkapi Auto Trading 24/7, Risk Management, Real-Time Monitoring, dan algoritma canggih. Tanpa titip dana, tanpa sharing profit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ch-bg">
        {children}
        <AppToastContainer />
      </body>
    </html>
  );
}
