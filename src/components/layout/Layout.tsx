import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import SupportChatWidget from '@/components/layout/SupportChatWidget';
import WhatsAppFab from '@/components/layout/WhatsAppFab';
import FloatingActions from '@/components/ui/FloatingActions';
import MobileBottomNav from '@/components/ui/MobileBottomNav';
import { supabase } from '@/lib/supabase';

export default function Layout() {
  const [maintenance, setMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    async function check() {
      const { data } = await supabase.from('site_settings').select('maintenance_mode').limit(1).maybeSingle();
      if (data?.maintenance_mode) {
        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.session.user.id).maybeSingle();
          setIsAdmin(profile?.role === 'admin');
        }
        setMaintenance(true);
      } else {
        setMaintenance(false);
      }
    }
    check();
  }, [location.pathname]);

  if (maintenance && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center dark:bg-brand-navy">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-purple/10 text-brand-purple">
          <Wrench className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-brand-navy dark:text-white">Under Maintenance</h1>
        <p className="mt-2 max-w-md text-neutral-500 dark:text-neutral-400">
          We're making some improvements. Please check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <a href="#main-content" className="sr-only sr-only-focusable absolute left-4 top-4 z-[100] rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white">Skip to main content</a>
      <Navbar />
      <main id="main-content" className="w-full flex-1 pb-16 md:pb-0" role="main">
        <Outlet />
      </main>
      <Footer />
      <SupportChatWidget />
      <WhatsAppFab />
      <FloatingActions />
      <MobileBottomNav />
    </div>
  );
}
