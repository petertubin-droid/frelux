import { useEffect } from 'react';

export interface SeoMeta {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  noIndex?: boolean;
  structuredData?: object;
}

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://freluxpaintcalc.com';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setStructuredData(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function useSeo(meta: SeoMeta) {
  useEffect(() => {
    const fullTitle = meta.title.includes('FRELUX') ? meta.title : `${meta.title} — FRELUX PAINT CALC`;
    document.title = fullTitle;

    setMeta('name', 'description', meta.description);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:type', meta.ogType ?? 'website');
    setMeta('property', 'og:url', `${SITE_URL}${meta.canonicalPath ?? ''}`);
    if (meta.ogImage) setMeta('property', 'og:image', meta.ogImage);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', meta.description);

    if (meta.canonicalPath) {
      setLink('canonical', `${SITE_URL}${meta.canonicalPath}`);
    }

    if (meta.noIndex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      const existing = document.head.querySelector('meta[name="robots"]');
      if (existing) existing.remove();
    }

    if (meta.structuredData) {
      setStructuredData('page-structured-data', meta.structuredData);
    } else {
      const existing = document.getElementById('page-structured-data');
      if (existing) existing.remove();
    }

    return () => {
      const sd = document.getElementById('page-structured-data');
      if (sd) sd.remove();
    };
  }, [meta.title, meta.description, meta.canonicalPath, meta.ogType, meta.ogImage, meta.noIndex, meta.structuredData]);
}

export { SITE_URL };
