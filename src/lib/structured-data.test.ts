import { describe, it, expect } from 'vitest';
import {
  organizationSchema,
  breadcrumbSchema,
  faqSchema,
  productSchema,
  howToSchema,
  localBusinessSchema,
  webPageSchema,
} from './structured-data';

// VITE_SITE_URL is set to https://freluxtools.netlify.app in the project's .env;
// the code also falls back to that same URL when the env var is absent.
const SITE_URL = 'https://freluxtools.netlify.app';
const SITE_NAME = 'FRELUX PAINT CALC';

describe('organizationSchema', () => {
  it('returns a WebApplication schema with correct @context and @type', () => {
    const schema = organizationSchema();
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebApplication');
  });

  it('returns the correct site name and url', () => {
    const schema = organizationSchema();
    expect(schema.name).toBe(SITE_NAME);
    expect(schema.url).toBe(SITE_URL);
  });

  it('includes a free offer', () => {
    const schema = organizationSchema();
    expect(schema.offers).toMatchObject({
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    });
  });

  it('includes applicationCategory and operatingSystem', () => {
    const schema = organizationSchema();
    expect(schema.applicationCategory).toBe('BusinessApplication');
    expect(schema.operatingSystem).toBe('Web');
  });

  it('includes a description string', () => {
    const schema = organizationSchema();
    expect(typeof schema.description).toBe('string');
    expect(schema.description.length).toBeGreaterThan(0);
  });
});

describe('breadcrumbSchema', () => {
  it('returns a BreadcrumbList with correct @context and @type', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Colors', path: '/colors' },
    ]);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('BreadcrumbList');
  });

  it('maps items to ListItem entries with correct positions (1-based)', () => {
    const items = [
      { name: 'Home', path: '/' },
      { name: 'Colors', path: '/colors' },
      { name: 'Navy', path: '/colors/navy' },
    ];
    const schema = breadcrumbSchema(items);
    expect(schema.itemListElement).toHaveLength(3);
    schema.itemListElement.forEach((el, index) => {
      expect(el['@type']).toBe('ListItem');
      expect(el.position).toBe(index + 1);
      expect(el.name).toBe(items[index].name);
      expect(el.item).toBe(`${SITE_URL}${items[index].path}`);
    });
  });

  it('builds fully-qualified item URLs from paths', () => {
    const schema = breadcrumbSchema([{ name: 'Blog', path: '/blog/post-1' }]);
    expect(schema.itemListElement[0].item).toBe(`${SITE_URL}/blog/post-1`);
  });

  it('handles an empty array (no items)', () => {
    const schema = breadcrumbSchema([]);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema.itemListElement).toEqual([]);
  });

  it('handles a single item with position 1', () => {
    const schema = breadcrumbSchema([{ name: 'Home', path: '/' }]);
    expect(schema.itemListElement).toHaveLength(1);
    expect(schema.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${SITE_URL}/`,
    });
  });
});

describe('faqSchema', () => {
  it('returns a FAQPage with correct @context and @type', () => {
    const schema = faqSchema([
      { question: 'What is paint?', answer: 'A liquid coating.' },
    ]);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
  });

  it('maps items to Question/Answer structures', () => {
    const items = [
      { question: 'How much paint do I need?', answer: 'Use the calculator.' },
      { question: 'What colors are popular?', answer: 'Neutral tones.' },
    ];
    const schema = faqSchema(items);
    expect(schema.mainEntity).toHaveLength(2);
    schema.mainEntity.forEach((entity, i) => {
      expect(entity['@type']).toBe('Question');
      expect(entity.name).toBe(items[i].question);
      expect(entity.acceptedAnswer['@type']).toBe('Answer');
      expect(entity.acceptedAnswer.text).toBe(items[i].answer);
    });
  });

  it('handles an empty array', () => {
    const schema = faqSchema([]);
    expect(schema['@type']).toBe('FAQPage');
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema.mainEntity).toEqual([]);
  });

  it('handles a single item', () => {
    const schema = faqSchema([
      { question: 'One question?', answer: 'One answer.' },
    ]);
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0].name).toBe('One question?');
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe('One answer.');
  });
});

describe('productSchema', () => {
  it('returns a Product schema with correct @context and @type', () => {
    const schema = productSchema({
      name: 'Navy Blue',
      description: 'A deep navy paint color.',
      slug: 'navy-blue',
    });
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('Product');
  });

  it('builds the product url from the slug', () => {
    const schema = productSchema({
      name: 'Navy Blue',
      description: 'desc',
      slug: 'navy-blue',
    });
    expect(schema.url).toBe(`${SITE_URL}/colors/navy-blue`);
  });

  it('includes brand information', () => {
    const schema = productSchema({
      name: 'Navy Blue',
      description: 'desc',
      slug: 'navy-blue',
    });
    expect(schema.brand).toMatchObject({
      '@type': 'Brand',
      name: SITE_NAME,
    });
  });

  it('includes image when provided and omits it when not', () => {
    const withImage = productSchema({
      name: 'A',
      description: 'd',
      slug: 'a',
      image: 'https://example.com/img.png',
    });
    expect(withImage.image).toBe('https://example.com/img.png');

    const withoutImage = productSchema({
      name: 'A',
      description: 'd',
      slug: 'a',
    });
    expect(withoutImage).not.toHaveProperty('image');
  });

  it('includes category when provided and is undefined when not', () => {
    const withCat = productSchema({
      name: 'A',
      description: 'd',
      slug: 'a',
      category: 'Living Room',
    });
    expect(withCat.category).toBe('Living Room');

    const withoutCat = productSchema({
      name: 'A',
      description: 'd',
      slug: 'a',
    });
    expect(withoutCat.category).toBeUndefined();
  });
});

describe('howToSchema', () => {
  it('returns a HowTo schema with correct @context and @type', () => {
    const schema = howToSchema({
      name: 'How to paint a wall',
      description: 'Step by step.',
      steps: [{ name: 'Prep', text: 'Clean the wall.' }],
      slug: 'paint-wall',
    });
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('HowTo');
  });

  it('maps steps to HowToStep entries with 1-based positions', () => {
    const steps = [
      { name: 'Prep', text: 'Clean.' },
      { name: 'Prime', text: 'Apply primer.' },
      { name: 'Paint', text: 'Apply paint.' },
    ];
    const schema = howToSchema({
      name: 'T',
      description: 'D',
      steps,
      slug: 's',
    });
    expect(schema.step).toHaveLength(3);
    schema.step.forEach((s, i) => {
      expect(s['@type']).toBe('HowToStep');
      expect(s.position).toBe(i + 1);
      expect(s.name).toBe(steps[i].name);
      expect(s.text).toBe(steps[i].text);
    });
  });

  it('includes a HowToTool referencing the site name', () => {
    const schema = howToSchema({
      name: 'T',
      description: 'D',
      steps: [],
      slug: 's',
    });
    expect(schema.tool).toMatchObject({
      '@type': 'HowToTool',
      name: SITE_NAME,
    });
  });

  it('handles an empty steps array', () => {
    const schema = howToSchema({
      name: 'T',
      description: 'D',
      steps: [],
      slug: 's',
    });
    expect(schema.step).toEqual([]);
  });
});

describe('localBusinessSchema', () => {
  it('returns a LocalBusiness schema with correct @context and @type', () => {
    const schema = localBusinessSchema({});
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('LocalBusiness');
  });

  it('uses site name and url by default', () => {
    const schema = localBusinessSchema({});
    expect(schema.name).toBe(SITE_NAME);
    expect(schema.url).toBe(SITE_URL);
    expect(schema.areaServed).toBe('Worldwide');
  });

  it('includes email and telephone (whatsapp) when provided', () => {
    const schema = localBusinessSchema({
      name: 'Custom Biz',
      whatsapp: '+1234567890',
      email: 'hi@example.com',
    });
    expect(schema.name).toBe('Custom Biz');
    expect(schema.email).toBe('hi@example.com');
    expect(schema.telephone).toBe('+1234567890');
  });

  it('omits email and telephone when not provided', () => {
    const schema = localBusinessSchema({});
    expect(schema).not.toHaveProperty('email');
    expect(schema).not.toHaveProperty('telephone');
  });
});

describe('webPageSchema', () => {
  it('returns a WebPage schema with correct @context and @type', () => {
    const schema = webPageSchema({
      name: 'About',
      description: 'About us',
      path: '/about',
    });
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('WebPage');
  });

  it('builds the url from the path', () => {
    const schema = webPageSchema({
      name: 'About',
      description: 'About us',
      path: '/about',
    });
    expect(schema.url).toBe(`${SITE_URL}/about`);
  });

  it('includes name and description', () => {
    const schema = webPageSchema({
      name: 'Contact',
      description: 'Get in touch',
      path: '/contact',
    });
    expect(schema.name).toBe('Contact');
    expect(schema.description).toBe('Get in touch');
  });

  it('includes breadcrumb (BreadcrumbList) when provided and non-empty', () => {
    const schema = webPageSchema({
      name: 'Color',
      description: 'A color page',
      path: '/colors/navy',
      breadcrumbs: [{ name: 'Colors', path: '/colors' }],
    });
    expect(schema.breadcrumb).toBeDefined();
    expect((schema.breadcrumb as { '@type': string })['@type']).toBe('BreadcrumbList');
  });

  it('omits breadcrumb when not provided', () => {
    const schema = webPageSchema({
      name: 'About',
      description: 'About',
      path: '/about',
    });
    expect(schema).not.toHaveProperty('breadcrumb');
  });

  it('omits breadcrumb when provided as an empty array', () => {
    const schema = webPageSchema({
      name: 'About',
      description: 'About',
      path: '/about',
      breadcrumbs: [],
    });
    expect(schema).not.toHaveProperty('breadcrumb');
  });
});

describe('All schemas share @context', () => {
  it('every exported schema function sets @context to https://schema.org', () => {
    expect(organizationSchema()['@context']).toBe('https://schema.org');
    expect(breadcrumbSchema([])['@context']).toBe('https://schema.org');
    expect(faqSchema([])['@context']).toBe('https://schema.org');
    expect(
      productSchema({ name: 'A', description: 'd', slug: 'a' })['@context'],
    ).toBe('https://schema.org');
    expect(
      howToSchema({ name: 'A', description: 'd', steps: [], slug: 'a' })['@context'],
    ).toBe('https://schema.org');
    expect(localBusinessSchema({})['@context']).toBe('https://schema.org');
    expect(webPageSchema({ name: 'A', description: 'd', path: '/' })['@context']).toBe(
      'https://schema.org',
    );
  });
});
