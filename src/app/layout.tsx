import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { BRAND_LOGO, BRAND_NAME } from "@/lib/brand";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Seller Dashboard`,
  description: "Ecommerce seller dashboard for orders, inventory, web orders and more",
  icons: {
    icon: BRAND_LOGO,
    apple: BRAND_LOGO,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var h=location.hostname;var m=h==="youraiseller.com"||h==="www.youraiseller.com";document.documentElement.setAttribute("data-marketing-home",m?"1":"0");})();`,
          }}
        />
        {/* Prevent flash of wrong theme (FOUT) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("yai-theme-v2")==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
        <link
          rel="preload"
          href={BRAND_LOGO}
          as="image"
          type="image/png"
          fetchPriority="high"
        />
      </head>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
