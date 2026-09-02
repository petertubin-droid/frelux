import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '@/lib/analytics';
import { track } from '@/lib/analytics';

// Floating WhatsApp action. Positioned above the chat launcher on mobile and
// offset left of the chat panel on desktop so the two never overlap.
export default function WhatsAppFab() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 240);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <a
      href={whatsappUrl('Hello FRELUX, I would like to chat about a paint project.')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track('whatsapp_clicked', { source: 'fab' })}
      className={`fixed left-4 z-30 inline-flex items-center gap-2 rounded-full bg-accent-green px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 sm:bottom-4 sm:left-auto sm:right-20 ${
        show
          ? 'bottom-20 translate-y-0 opacity-100 sm:bottom-4'
          : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      aria-label="Chat on WhatsApp"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
