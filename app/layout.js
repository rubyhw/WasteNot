import "./globals.css";
import Header from "./components/Header";
import ClientProviders from "./providers/ClientProviders";

export const metadata = {
  title: "WasteNot | Recycle Smarter",
  description: "WasteNot helps you recycle better with tips, pickups, and drop-off locations.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  viewport: "width=device-width, initial-scale=1.0, maximum-scale=5.0",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientProviders>
          <Header />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

