import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSeo, SITE_URL } from './seo';

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

function renderSeo(props: Parameters<typeof useSeo>[0]) {
  return renderHook((p: Parameters<typeof useSeo>[0]) => useSeo(p), {
    initialProps: props,
  });
}

function getMeta(attr: 'name' | 'property', key: string): HTMLMetaElement | null {
  return document.head.querySelector(`meta[${attr}="${key}"]`);
}

function getMetaContent(attr: 'name' | 'property', key: string): string | null {
  const el = getMeta(attr, key);
  return el ? el.getAttribute('content') : null;
}

function getLink(rel: string): HTMLLinkElement | null {
  return document.head.querySelector(`link[rel="${rel}"]`);
}

function getStructuredDataScript(id: string): HTMLScriptElement | null {
  return document.getElementById(id) as HTMLScriptElement | null;
}

function headMetaCount(): number {
  return document.head.querySelectorAll('meta').length;
}

describe('useSeo', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.title = '';
  });

  describe('document.title', () => {
    it('sets document.title appending the site suffix when not already present', () => {
      renderSeo({ title: 'About Us', description: 'About the company' });
      expect(document.title).toBe('About Us: FRELUX PROJECT CALC');
    });

    it('does not double-append the suffix when title already contains FRELUX', () => {
      renderSeo({ title: 'FRELUX PROJECT CALC: Home', description: 'desc' });
      expect(document.title).toBe('FRELUX PROJECT CALC: Home');
    });

    it('updates the title when props change', () => {
      const { rerender } = renderSeo({ title: 'Page A', description: 'a' });
      expect(document.title).toBe('Page A: FRELUX PROJECT CALC');

      rerender({ title: 'Page B', description: 'b' });
      expect(document.title).toBe('Page B: FRELUX PROJECT CALC');
    });
  });

  describe('meta description', () => {
    it('creates a meta description tag with the provided description', () => {
      renderSeo({ title: 'T', description: 'A great paint calculator.' });
      expect(getMetaContent('name', 'description')).toBe('A great paint calculator.');
    });

    it('updates an existing meta description tag rather than duplicating', () => {
      renderSeo({ title: 'T', description: 'first' });
      const firstCount = document.head.querySelectorAll('meta[name="description"]').length;
      expect(firstCount).toBe(1);

      renderSeo({ title: 'T', description: 'second' });
      const secondCount = document.head.querySelectorAll('meta[name="description"]').length;
      expect(secondCount).toBe(1);
      expect(getMetaContent('name', 'description')).toBe('second');
    });

    it('sets the author meta tag', () => {
      renderSeo({ title: 'T', description: 'd' });
      expect(getMetaContent('name', 'author')).toBe('FRELUX PROJECT CALC');
    });
  });

  describe('canonical link', () => {
    it('creates a canonical link when canonicalPath is provided', () => {
      renderSeo({ title: 'T', description: 'd', canonicalPath: '/about' });
      const link = getLink('canonical');
      expect(link).not.toBeNull();
      expect(link!.getAttribute('href')).toBe(`${SITE_URL}/about`);
    });

    it('creates a canonical link pointing to SITE_URL when canonicalPath is absent', () => {
      renderSeo({ title: 'T', description: 'd' });
      expect(getLink('canonical')!.getAttribute('href')).toBe(SITE_URL);
    });

    it('updates the canonical href when canonicalPath changes', () => {
      const { rerender } = renderSeo({
        title: 'T',
        description: 'd',
        canonicalPath: '/a',
      });
      expect(getLink('canonical')!.getAttribute('href')).toBe(`${SITE_URL}/a`);

      rerender({ title: 'T', description: 'd', canonicalPath: '/b' });
      expect(getLink('canonical')!.getAttribute('href')).toBe(`${SITE_URL}/b`);
      expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    });
  });

  describe('noIndex / robots', () => {
    it('adds a robots meta with noindex, nofollow when noIndex is true', () => {
      renderSeo({ title: 'T', description: 'd', noIndex: true });
      expect(getMetaContent('name', 'robots')).toBe('noindex, nofollow');
    });

    it('sets robots to index, follow with max directives when noIndex is false', () => {
      renderSeo({ title: 'T', description: 'd', noIndex: false });
      expect(getMetaContent('name', 'robots')).toBe('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    });

    it('defaults to index, follow with max directives when noIndex is not provided', () => {
      renderSeo({ title: 'T', description: 'd' });
      expect(getMetaContent('name', 'robots')).toBe('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    });

    it('updates robots content when noIndex toggles', () => {
      const { rerender } = renderSeo({ title: 'T', description: 'd', noIndex: true });
      expect(getMetaContent('name', 'robots')).toBe('noindex, nofollow');

      rerender({ title: 'T', description: 'd', noIndex: false });
      expect(getMetaContent('name', 'robots')).toBe('index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    });
  });

  describe('Open Graph', () => {
    it('sets og:title, og:description, og:type, og:url, og:site_name, and og:image', () => {
      renderSeo({
        title: 'My Page',
        description: 'desc',
        canonicalPath: '/page',
        ogType: 'article',
        ogImage: 'https://example.com/img.png',
      });
      expect(getMetaContent('property', 'og:title')).toBe(
        'My Page: FRELUX PROJECT CALC',
      );
      expect(getMetaContent('property', 'og:description')).toBe('desc');
      expect(getMetaContent('property', 'og:type')).toBe('article');
      expect(getMetaContent('property', 'og:url')).toBe(`${SITE_URL}/page`);
      expect(getMetaContent('property', 'og:site_name')).toBe('FRELUX PROJECT CALC');
      expect(getMetaContent('property', 'og:image')).toBe(
        'https://example.com/img.png',
      );
    });

    it('defaults og:type to website and og:image to the default OG image', () => {
      renderSeo({ title: 'T', description: 'd' });
      expect(getMetaContent('property', 'og:type')).toBe('website');
      expect(getMetaContent('property', 'og:image')).toBe(DEFAULT_OG_IMAGE);
    });

    it('uses the canonicalPath for og:url and defaults to SITE_URL when absent', () => {
      renderSeo({ title: 'T', description: 'd', canonicalPath: '/x' });
      expect(getMetaContent('property', 'og:url')).toBe(`${SITE_URL}/x`);

      renderSeo({ title: 'T', description: 'd' });
      expect(getMetaContent('property', 'og:url')).toBe(SITE_URL);
    });
  });

  describe('Twitter Cards', () => {
    it('sets twitter:card, twitter:title, twitter:description, and twitter:image', () => {
      renderSeo({
        title: 'Hello',
        description: 'world',
        ogImage: 'https://example.com/tw.png',
      });
      expect(getMetaContent('name', 'twitter:card')).toBe('summary_large_image');
      expect(getMetaContent('name', 'twitter:title')).toBe(
        'Hello: FRELUX PROJECT CALC',
      );
      expect(getMetaContent('name', 'twitter:description')).toBe('world');
      expect(getMetaContent('name', 'twitter:image')).toBe(
        'https://example.com/tw.png',
      );
    });

    it('defaults twitter:image to the default OG image', () => {
      renderSeo({ title: 'T', description: 'd' });
      expect(getMetaContent('name', 'twitter:image')).toBe(DEFAULT_OG_IMAGE);
    });
  });

  describe('structured data (single object)', () => {
    it('injects structured data as a script tag with id page-structured-data', () => {
      const data = { '@type': 'WebSite', name: 'FRELUX' };
      renderSeo({ title: 'T', description: 'd', structuredData: data });
      const script = getStructuredDataScript('page-structured-data');
      expect(script).not.toBeNull();
      expect(script!.type).toBe('application/ld+json');
      expect(JSON.parse(script!.textContent!)).toEqual(data);
    });

    it('updates structured data content when the object changes', () => {
      const { rerender } = renderSeo({
        title: 'T',
        description: 'd',
        structuredData: { '@type': 'A' },
      });
      expect(JSON.parse(getStructuredDataScript('page-structured-data')!.textContent!)).toEqual(
        { '@type': 'A' },
      );

      rerender({ title: 'T', description: 'd', structuredData: { '@type': 'B' } });
      expect(JSON.parse(getStructuredDataScript('page-structured-data')!.textContent!)).toEqual(
        { '@type': 'B' },
      );
      expect(
        document.head.querySelectorAll('script#page-structured-data'),
      ).toHaveLength(1);
    });
  });

  describe('structured data (array)', () => {
    it('injects each array item as its own script tag with indexed ids', () => {
      const arr = [{ '@type': 'A' }, { '@type': 'B' }, { '@type': 'C' }];
      renderSeo({ title: 'T', description: 'd', structuredDataArray: arr });

      for (let i = 0; i < arr.length; i++) {
        const script = getStructuredDataScript(`page-structured-data-${i}`);
        expect(script).not.toBeNull();
        expect(script!.type).toBe('application/ld+json');
        expect(JSON.parse(script!.textContent!)).toEqual(arr[i]);
      }
    });

    it('removes stale array scripts when the array shrinks', () => {
      const { rerender } = renderSeo({
        title: 'T',
        description: 'd',
        structuredDataArray: [{ '@type': 'A' }, { '@type': 'B' }, { '@type': 'C' }],
      });
      expect(getStructuredDataScript('page-structured-data-2')).not.toBeNull();

      rerender({
        title: 'T',
        description: 'd',
        structuredDataArray: [{ '@type': 'A' }],
      });
      expect(getStructuredDataScript('page-structured-data-0')).not.toBeNull();
      expect(getStructuredDataScript('page-structured-data-1')).toBeNull();
      expect(getStructuredDataScript('page-structured-data-2')).toBeNull();
    });

    it('does not inject array scripts when the array is empty', () => {
      renderSeo({ title: 'T', description: 'd', structuredDataArray: [] });
      expect(getStructuredDataScript('page-structured-data-0')).toBeNull();
    });
  });

  describe('cleanup on unmount', () => {
    it('removes single structured data script on unmount', () => {
      const { unmount } = renderSeo({
        title: 'T',
        description: 'd',
        structuredData: { '@type': 'WebSite' },
      });
      expect(getStructuredDataScript('page-structured-data')).not.toBeNull();

      unmount();
      expect(getStructuredDataScript('page-structured-data')).toBeNull();
    });

    it('removes array structured data scripts on unmount', () => {
      const { unmount } = renderSeo({
        title: 'T',
        description: 'd',
        structuredDataArray: [{ '@type': 'A' }, { '@type': 'B' }],
      });
      expect(getStructuredDataScript('page-structured-data-0')).not.toBeNull();
      expect(getStructuredDataScript('page-structured-data-1')).not.toBeNull();

      unmount();
      expect(getStructuredDataScript('page-structured-data-0')).toBeNull();
      expect(getStructuredDataScript('page-structured-data-1')).toBeNull();
    });

    it('keeps meta tags after unmount (only structured data is cleaned up)', () => {
      const { unmount } = renderSeo({
        title: 'T',
        description: 'd',
        canonicalPath: '/x',
        noIndex: true,
      });
      expect(getMeta('name', 'description')).not.toBeNull();
      expect(getLink('canonical')).not.toBeNull();
      expect(getMeta('name', 'robots')).not.toBeNull();

      const beforeCount = headMetaCount();
      unmount();
      // meta/link tags are not removed by the cleanup function
      expect(getMeta('name', 'description')).not.toBeNull();
      expect(getLink('canonical')).not.toBeNull();
      expect(getMeta('name', 'robots')).not.toBeNull();
      expect(document.head.querySelectorAll('meta').length).toBe(beforeCount);
    });
  });
});
