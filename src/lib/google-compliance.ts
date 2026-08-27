/**
 * Google Content Compliance Checker for FRELUX Learn Articles
 *
 * A lightweight wrapper around the article validation engine that produces
 * a Google-specific compliance report. This is the function to call before
 * publishing any new article to ensure it meets Google's guidelines.
 *
 * Usage:
 *   import { checkGoogleCompliance } from '@/lib/google-compliance';
 *   const report = checkGoogleCompliance(article);
 *   if (!report.compliant) console.error(report.issues);
 */

import { validateArticle, formatValidationIssues, type ArticleInput, type ArticleValidationResult } from './article-validation';

export interface GoogleComplianceReport {
  compliant: boolean;
  score: number;
  blockingIssues: string[];  // errors — must fix before publishing
  advisoryIssues: string[];  // warnings — recommended fixes
  passedChecks: string[];    // rules that passed
  eeattAssessment: {
    experience: 'pass' | 'fail';
    expertise: 'pass' | 'fail';
    authoritativeness: 'pass' | 'fail';
    trustworthiness: 'pass' | 'fail';
  };
  summary: string;
}

export function checkGoogleCompliance(article: ArticleInput): GoogleComplianceReport {
  const result: ArticleValidationResult = validateArticle(article);
  const issues = formatValidationIssues(result);

  const blockingIssues = issues.filter((i) => i.startsWith('❌'));
  const advisoryIssues = issues.filter((i) => i.startsWith('⚠️'));
  const passedChecks = result.rules
    .filter((r) => r.passed)
    .map((r) => `✓ [${r.rule}] ${r.message}`);

  // E-E-A-T assessment
  const hasAuthor = result.rules.find((r) => r.rule === 'author-attribution')?.passed ?? false;
  const hasContent = result.rules.find((r) => r.rule === 'word-count-minimum')?.passed ?? false;
  const hasMetaDesc = result.rules.find((r) => r.rule === 'meta-description-missing')?.passed ?? true;
  const noPlaceholder = result.rules.find((r) => r.rule === 'no-placeholder-content')?.passed ?? false;
  const hasConclusion = result.rules.find((r) => r.rule === 'conclusion-section')?.passed ?? false;
  const hasSlug = result.rules.find((r) => r.rule === 'slug-format')?.passed ?? false;

  const eeattAssessment = {
    experience: hasContent && noPlaceholder ? 'pass' as const : 'fail' as const,
    expertise: hasAuthor && hasContent ? 'pass' as const : 'fail' as const,
    authoritativeness: hasAuthor && hasSlug ? 'pass' as const : 'fail' as const,
    trustworthiness: hasMetaDesc && noPlaceholder && hasSlug ? 'pass' as const : 'fail' as const,
  };

  const eeattPassCount = Object.values(eeattAssessment).filter((v) => v === 'pass').length;

  const summary = blockingIssues.length === 0
    ? `Article passes Google compliance with score ${result.score}/100. ${eeattPassCount}/4 E-E-A-T pillars met. ${advisoryIssues.length} advisory issue(s).`
    : `Article fails Google compliance — ${blockingIssues.length} blocking issue(s) must be fixed before publishing. Score: ${result.score}/100.`;

  return {
    compliant: blockingIssues.length === 0,
    score: result.score,
    blockingIssues,
    advisoryIssues,
    passedChecks,
    eeattAssessment,
    summary,
  };
}
