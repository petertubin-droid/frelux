import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SupportChatWidget from '@/components/layout/SupportChatWidget';
import WhatsAppFab from '@/components/layout/WhatsAppFab';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only sr-only-focusable absolute left-4 top-4 z-[100] rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white">Skip to main content</a>
      <Navbar />
      <main id="main-content" className="flex-1" role="main">
        <Outlet />
      </main>
      <Footer />
      <SupportChatWidget />
      <WhatsAppFab />
    </div>
  );
}
