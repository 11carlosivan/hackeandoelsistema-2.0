import Script from 'next/script';
import './globals.css';
import { SiteStructuredData } from '@/components/main-design/structured-data';
import { buildMetadata, siteConfig } from '@/lib/main-design/seo';

export const metadata = buildMetadata();

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <meta name="application-name" content={siteConfig.name} />
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/isotipo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/isotipo.png" />
        <SiteStructuredData />
      </head>
      <body className="bg-background text-on-surface font-body-md selection:bg-system-red selection:text-white overflow-x-hidden">
        <Script
          id="theme-script"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('theme');
                let effectiveTheme = storedTheme;
                if (!effectiveTheme) {
                  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  effectiveTheme = prefersDark ? 'dark' : 'light';
                }
                if (effectiveTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (_) {}
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
