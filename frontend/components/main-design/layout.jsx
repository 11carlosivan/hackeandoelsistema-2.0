import Header from './header';
import SideNavBar from './side-nav-bar';
import Footer from './footer';

export default function Layout({ children, categories = [] }) {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col">
      {/* Fixed top header */}
      <Header categories={categories} />
      
      {/* Main container with sidebar and content */}
      <div className="flex flex-1 w-full max-w-full mx-auto pt-[150px] md:pt-[170px] relative">
        {/* Left widget bar */}
        <SideNavBar />
        
        {/* Dynamic page content */}
        <main className="flex-1 w-full min-w-0 px-4 md:px-margin-page py-6 overflow-hidden">
          {children}
        </main>
      </div>
      
      {/* Site footer */}
      <Footer />
    </div>
  );
}
