import { logger } from '../utils/logger.js';

/**
 * Run a simplified Lighthouse-style audit on a Playwright page.
 *
 * This is NOT real Lighthouse — it uses heuristic checks via Playwright's
 * page.evaluate to produce scores in four categories:
 *   - performance  (DOM size, image count, inline style count)
 *   - accessibility (aria labels, alt text, heading order, lang attribute)
 *   - seo          (meta tags, headings, link text)
 *   - bestPractices (doctype, charset, no inline event handlers)
 *
 * Each category is scored 0–100.
 *
 * @param {import('playwright').Page} page — a Playwright page that has already navigated
 * @returns {Promise<{ performance: number, accessibility: number, seo: number, bestPractices: number }>}
 */
export async function runLighthouseAudit(page) {
  logger.info('Running simplified Lighthouse audit…');

  const raw = await page.evaluate(() => {
    // ── Helpers ──────────────────────────────────────────────────────

    /** Parse an rgb/rgba string into { r, g, b }. Returns null on failure. */
    function parseColor(str) {
      const m = str.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3] };
    }

    /** Relative luminance per WCAG 2.0 */
    function luminance({ r, g, b }) {
      const [rs, gs, bs] = [r, g, b].map((c) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    /** WCAG contrast ratio between two rgb objects */
    function contrastRatio(c1, c2) {
      const l1 = luminance(c1);
      const l2 = luminance(c2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    // ── Gather DOM facts ─────────────────────────────────────────────

    const allElements = document.querySelectorAll('*');
    const domSize = allElements.length;

    const images = document.querySelectorAll('img');
    const imageCount = images.length;
    const imagesWithAlt = [...images].filter((img) => img.hasAttribute('alt') && img.alt.trim() !== '').length;
    const imagesMissingAlt = imageCount - imagesWithAlt;

    const inlineStyleCount = [...allElements].filter((el) => el.hasAttribute('style')).length;

    // Meta / head checks
    const hasViewport = !!document.querySelector('meta[name="viewport"]');
    const hasTitle = !!document.querySelector('title') && document.title.trim().length > 0;
    const hasMetaDescription =
      !!document.querySelector('meta[name="description"]') &&
      (document.querySelector('meta[name="description"]').content || '').trim().length > 0;
    const hasLang = document.documentElement.hasAttribute('lang') && document.documentElement.lang.trim().length > 0;
    const hasCharset =
      !!document.querySelector('meta[charset]') || !!document.querySelector('meta[http-equiv="Content-Type"]');
    const hasDoctype = document.doctype !== null;

    // Headings
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const headingLevels = [...headings].map((h) => parseInt(h.tagName[1], 10));
    const hasH1 = headingLevels.includes(1);

    let headingOrderCorrect = true;
    for (let i = 1; i < headingLevels.length; i++) {
      if (headingLevels[i] > headingLevels[i - 1] + 1) {
        headingOrderCorrect = false;
        break;
      }
    }

    // H1 appears before first H2 (if both exist)
    const h1First =
      !hasH1 || headingLevels.length === 0 || headingLevels.indexOf(1) <= headingLevels.indexOf(2) || !headingLevels.includes(2);

    // Links
    const links = document.querySelectorAll('a');
    const linkCount = links.length;
    const linksWithText = [...links].filter((a) => a.textContent.trim().length > 0 || a.hasAttribute('aria-label')).length;
    const emptyLinks = linkCount - linksWithText;

    // Aria labels on interactive elements
    const interactiveEls = document.querySelectorAll('button, input, select, textarea, a');
    const interactiveCount = interactiveEls.length;
    const ariaLabeledCount = [...interactiveEls].filter(
      (el) => el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.hasAttribute('title')
    ).length;

    // Inline event handlers (onclick, onmouseover, etc.)
    const inlineHandlerCount = [...allElements].filter((el) =>
      [...el.attributes].some((attr) => attr.name.startsWith('on'))
    ).length;

    // Color contrast sampling (check up to 200 text elements)
    const textElements = [...document.querySelectorAll('p, span, a, li, td, th, h1, h2, h3, h4, h5, h6, label, button')].slice(0, 200);
    let contrastPasses = 0;
    let contrastTotal = 0;
    for (const el of textElements) {
      const cs = window.getComputedStyle(el);
      const fg = parseColor(cs.color);
      const bg = parseColor(cs.backgroundColor);
      if (fg && bg) {
        contrastTotal++;
        if (contrastRatio(fg, bg) >= 4.5) {
          contrastPasses++;
        }
      }
    }

    return {
      domSize,
      imageCount,
      imagesMissingAlt,
      inlineStyleCount,
      hasViewport,
      hasTitle,
      hasMetaDescription,
      hasLang,
      hasCharset,
      hasDoctype,
      hasH1,
      headingOrderCorrect,
      h1First,
      linkCount,
      emptyLinks,
      interactiveCount,
      ariaLabeledCount,
      inlineHandlerCount,
      contrastPasses,
      contrastTotal,
    };
  });

  // ── Scoring ──────────────────────────────────────────────────────

  const performance = scorePerformance(raw);
  const accessibility = scoreAccessibility(raw);
  const seo = scoreSEO(raw);
  const bestPractices = scoreBestPractices(raw);

  const result = { performance, accessibility, seo, bestPractices };

  logger.info(
    `Audit complete — perf=${performance} a11y=${accessibility} seo=${seo} bp=${bestPractices}`
  );
  return result;
}

// ── Scoring helpers (pure, deterministic) ─────────────────────────────

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Performance score based on DOM size, image count, and inline styles.
 */
function scorePerformance({ domSize, imageCount, inlineStyleCount }) {
  let score = 100;

  // Penalise large DOMs (1500+ is heavy)
  if (domSize > 3000) score -= 30;
  else if (domSize > 1500) score -= 15;
  else if (domSize > 800) score -= 5;

  // Penalise many images
  if (imageCount > 50) score -= 25;
  else if (imageCount > 20) score -= 15;
  else if (imageCount > 10) score -= 5;

  // Penalise inline styles (they block efficient rendering)
  if (inlineStyleCount > 50) score -= 20;
  else if (inlineStyleCount > 20) score -= 10;
  else if (inlineStyleCount > 5) score -= 3;

  return clamp(score);
}

/**
 * Accessibility score based on alt text, headings, lang, aria, contrast.
 */
function scoreAccessibility({
  imageCount,
  imagesMissingAlt,
  hasLang,
  hasH1,
  headingOrderCorrect,
  h1First,
  interactiveCount,
  ariaLabeledCount,
  contrastPasses,
  contrastTotal,
}) {
  let score = 100;

  // Images without alt text (up to -25)
  if (imageCount > 0) {
    const missingRatio = imagesMissingAlt / imageCount;
    score -= Math.round(missingRatio * 25);
  }

  // No lang attribute
  if (!hasLang) score -= 15;

  // Heading hierarchy
  if (!hasH1) score -= 10;
  if (!headingOrderCorrect) score -= 10;
  if (!h1First) score -= 5;

  // Aria labels on interactive elements
  if (interactiveCount > 0) {
    const ariaRatio = ariaLabeledCount / interactiveCount;
    // Only penalise if very few are labelled; many elements self-label via text content
    if (ariaRatio < 0.1 && interactiveCount > 5) score -= 10;
  }

  // Color contrast
  if (contrastTotal > 0) {
    const passRatio = contrastPasses / contrastTotal;
    score -= Math.round((1 - passRatio) * 25);
  }

  return clamp(score);
}

/**
 * SEO score based on meta tags, headings, link text.
 */
function scoreSEO({ hasTitle, hasMetaDescription, hasViewport, hasH1, headingOrderCorrect, linkCount, emptyLinks }) {
  let score = 100;

  if (!hasTitle) score -= 25;
  if (!hasMetaDescription) score -= 20;
  if (!hasViewport) score -= 15;
  if (!hasH1) score -= 15;
  if (!headingOrderCorrect) score -= 5;

  // Empty links (no anchor text) hurt SEO
  if (linkCount > 0 && emptyLinks > 0) {
    const emptyRatio = emptyLinks / linkCount;
    score -= Math.round(emptyRatio * 20);
  }

  return clamp(score);
}

/**
 * Best-practices score based on doctype, charset, inline handlers.
 */
function scoreBestPractices({ hasDoctype, hasCharset, inlineHandlerCount, hasViewport }) {
  let score = 100;

  if (!hasDoctype) score -= 25;
  if (!hasCharset) score -= 20;
  if (!hasViewport) score -= 10;

  // Inline event handlers
  if (inlineHandlerCount > 20) score -= 25;
  else if (inlineHandlerCount > 5) score -= 15;
  else if (inlineHandlerCount > 0) score -= 5;

  return clamp(score);
}
