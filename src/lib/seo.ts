import { useEffect } from 'react';

export interface SeoMeta {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  noIndex?: boolean;
  structuredData?: object;
  structuredDataArray?: object[];
}

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://freluxpaintcalc.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

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

function removeStructuredData(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

export function useSeo(meta: SeoMeta) {
  useEffect(() => {
    const fullTitle = meta.title.includes('FRELUX') ? meta.title : `${meta.title} — FRELUX PAINT CALC`;
    document.title = fullTitle;

    // Primary meta
    setMeta('name', 'description', meta.description);
    setMeta('name', 'author', 'FRELUX PAINT CALC');

    // Open Graph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:type', meta.ogType ?? 'website');
    setMeta('property', 'og:url', `${SITE_URL}${meta.canonicalPath ?? ''}`);
    setMeta('property', 'og:site_name', 'FRELUX PAINT CALC');
    setMeta('property', 'og:image', meta.ogImage ?? DEFAULT_OG_IMAGE);

    // Twitter Cards
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', meta.ogImage ?? DEFAULT_OG_IMAGE);

    // Canonical URL
    if (meta.canonicalPath) {
      setLink('canonical', `${SITE_URL}${meta.canonicalPath}`);
    }

    // Robots
    if (meta.noIndex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      const existing = document.head.querySelector('meta[name="robots"]');
      if (existing) {
        existing.setAttribute('content', 'index, follow');
      } else {
        setMeta('name', 'robots', 'index, follow');
      }
    }

    // Structured data — single or array
    const sdIds: string[] = [];

    if (meta.structuredData) {
      setStructuredData('page-structured-data', meta.structuredData);
      sdIds.push('page-structured-data');
    } else {
      removeStructuredData('page-structured-data');
    }

    if (meta.structuredDataArray && meta.structuredDataArray.length > 0) {
      meta.structuredDataArray.forEach((data, index) => {
        const id = `page-structured-data-${index}`;
        setStructuredData(id, data);
        sdIds.push(id);
      });
    }

    // Clean up old array-based structured data that's no longer used
    const maxArrayId = (meta.structuredDataArray?.length ?? 0) + 1;
    for (let i = meta.structuredDataArray?.length ?? 0; i < maxArrayId + 5; i++) {
      removeStructuredData(`page-structured-data-${i}`);
    }

    return () => {
      removeStructuredData('page-structured-data');
      sdIds.forEach((id) => removeStructuredData(id));
    };
  }, [meta.title, meta.description, meta.canonicalPath, meta.ogType, meta.ogImage, meta.noIndex, meta.structuredData, meta.structuredDataArray]);
}

export { SITE_URL };
