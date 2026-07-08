import './globals.css';

export const metadata = {
  title: 'Hackeando el Sistema | Digital Intelligence Unit',
  description: 'Hackeando el Sistema Network',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark">
      <head>
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
      </head>
      <body className="bg-background text-on-surface font-body-md selection:bg-system-red selection:text-white overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
