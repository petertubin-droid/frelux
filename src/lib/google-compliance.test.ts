/**
 * Tests for the Google Content Compliance Checker
 */

import { describe, it, expect } from 'vitest';
import { checkGoogleCompliance } from './google-compliance';
import type { ArticleInput } from './article-validation';

function makeValidArticle(overrides: Partial<ArticleInput> = {}): ArticleInput {
  return {
    slug: 'complete-guide-painting-interior-walls-professional',
    title: 'The Complete Guide to Painting Interior Walls Like a Professional',
    excerpt: 'Learn every step of painting interior walls from preparation to finishing touches.',
    content: `## Why Proper Wall Painting Matters

Painting interior walls is one of the most transformative things you can do for any space. A fresh coat of paint breathes new life into a room, changes how it feels, and even affects the perceived size and brightness of the area. But painting is also one of those tasks where the difference between a professional result and a DIY disaster comes down to technique, patience, and preparation.

Many people pick up a brush, buy a can of paint, and start painting without understanding the process. The result is usually streaky walls, visible brush marks, peeling paint within months, and uneven color distribution. Professional painters follow a system that has been refined over decades, and that system is what this guide will walk you through.

Whether you are painting a single accent wall or an entire house, the principles remain the same. Take your time, use the right tools, and do not skip steps. The wall you paint today should still look good five years from now.

## Essential Tools and Materials

Before you begin, gather everything you need. Running to the hardware store mid project breaks your rhythm and can lead to color mismatches if paint batches differ. You need quality brushes, rollers, primer, drop cloths, and painter tape. [See our paint calculator](/paint-calculator) to estimate how much paint to buy.

Paint covers approximately 350 to 400 square feet per coat, but this varies based on wall texture and color. A good primer creates a uniform surface that helps the topcoat adhere and show its true color.

## Preparing the Room

Preparation is where professionals spend the majority of their time, and it is the step most DIY painters rush through. A well prepared room makes painting faster, cleaner, and produces a better finish. Start by removing all furniture from the room if possible.

## Conclusion

Painting interior walls is a project that anyone can do well with the right approach. The difference between a mediocre result and a professional looking finish is not talent. It is preparation, technique, and patience. Take the time to prepare your walls, use quality tools, primer when needed, and apply two coats with attention to maintaining a wet edge.

Remember that paint is the backdrop of your daily life. It deserves the same attention you give to choosing furniture, flooring, and lighting. Do it right, and your walls will look beautiful for years to come.`,
    category_slug: 'painting-guides',
    author: 'Frelux Editorial Team',
    read_time_minutes: 2,
    meta_title: 'Complete Guide to Painting Interior Walls Like a Professional',
    meta_description:
      'Step by step guide to painting interior walls like a pro. Covers tools, preparation, priming, cutting in, rolling, second coats, common mistakes, and pro tips for a flawless finish.',
    meta_keywords:
      'interior wall painting, painting guide, how to paint walls, painting techniques, professional painting tips',
    cover_image_url: null,
    status: 'published',
    is_featured: true,
    ...overrides,
  };
}

describe('Google Compliance Checker', () => {
  describe('compliant article', () => {
    it('returns compliant=true for a well-formed article', () => {
      const report = checkGoogleCompliance(makeValidArticle());
      expect(report.compliant).toBe(true);
    });

    it('returns a score between 0 and 100', () => {
      const report = checkGoogleCompliance(makeValidArticle());
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });

    it('has no blocking issues for valid article', () => {
      const report = checkGoogleCompliance(makeValidArticle());
      expect(report.blockingIssues).toHaveLength(0);
    });

    it('includes passed checks', () => {
      const report = checkGoogleCompliance(makeValidArticle());
      expect(report.passedChecks.length).toBeGreaterThan(0);
      expect(report.passedChecks.some((c) => c.includes('author-attribution'))).toBe(true);
    });

    it('summary mentions score and E-E-A-T', () => {
      const report = checkGoogleCompliance(makeValidArticle());
      expect(report.summary).toContain('score');
      expect(report.summary).toContain('E-E-A-T');
    });
  });

  describe('non-compliant article', () => {
    it('returns compliant=false when author is null', () => {
      const report = checkGoogleCompliance(makeValidArticle({ author: null }));
      expect(report.compliant).toBe(false);
      expect(report.blockingIssues.some((i) => i.includes('author-attribution'))).toBe(true);
    });

    it('returns compliant=false when meta_description is null', () => {
      const report = checkGoogleCompliance(makeValidArticle({ meta_description: null }));
      expect(report.compliant).toBe(false);
      expect(report.blockingIssues.some((i) => i.includes('meta-description'))).toBe(true);
    });

    it('returns compliant=false when slug is invalid', () => {
      const report = checkGoogleCompliance(makeValidArticle({ slug: 'Invalid Slug!' }));
      expect(report.compliant).toBe(false);
    });

    it('returns compliant=false with placeholder content', () => {
      const report = checkGoogleCompliance(makeValidArticle({ content: '## Intro\n\nLorem ipsum dolor sit amet. ' + 'word '.repeat(300) }));
      expect(report.compliant).toBe(false);
      expect(report.blockingIssues.some((i) => i.includes('placeholder'))).toBe(true);
    });

    it('includes advisory issues for warnings', () => {
      const report = checkGoogleCompliance(makeValidArticle({ excerpt: null, meta_keywords: null }));
      expect(report.advisoryIssues.length).toBeGreaterThan(0);
    });

    it('summary mentions blocking issues count', () => {
      const report = checkGoogleCompliance(makeValidArticle({ author: null, meta_description: null }));
      expect(report.summary).toContain('blocking');
    });
  });

  describe('E-E-A-T assessment', () => {
    it('passes all 4 pillars for valid article', () => {
      const report = checkGoogleCompliance(makeValidArticle());
      expect(report.eeattAssessment.experience).toBe('pass');
      expect(report.eeattAssessment.expertise).toBe('pass');
      expect(report.eeattAssessment.authoritativeness).toBe('pass');
      expect(report.eeattAssessment.trustworthiness).toBe('pass');
    });

    it('fails expertise when author is missing', () => {
      const report = checkGoogleCompliance(makeValidArticle({ author: null }));
      expect(report.eeattAssessment.expertise).toBe('fail');
      expect(report.eeattAssessment.authoritativeness).toBe('fail');
    });

    it('fails experience with thin content', () => {
      const report = checkGoogleCompliance(makeValidArticle({ content: 'Short. ' + 'word '.repeat(50) }));
      expect(report.eeattAssessment.experience).toBe('fail');
    });

    it('fails experience with placeholder content', () => {
      const report = checkGoogleCompliance(makeValidArticle({ content: '## Intro\n\nLorem ipsum. ' + 'word '.repeat(300) }));
      expect(report.eeattAssessment.experience).toBe('fail');
    });

    it('fails trustworthiness with invalid slug', () => {
      const report = checkGoogleCompliance(makeValidArticle({ slug: 'Bad Slug!' }));
      expect(report.eeattAssessment.trustworthiness).toBe('fail');
    });

    it('fails trustworthiness with missing meta description', () => {
      const report = checkGoogleCompliance(makeValidArticle({ meta_description: null }));
      expect(report.eeattAssessment.trustworthiness).toBe('fail');
    });
  });
});
