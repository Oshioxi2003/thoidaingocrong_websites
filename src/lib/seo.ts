import { useEffect } from 'react';

// ============ Site Configuration ============

export const SITE_CONFIG = {
  name: 'Thời Đại Ngọc Rồng',
  domain: 'https://thoidaingocrong.com',
  defaultDescription: 'Thời Đại Ngọc Rồng — Game nhập vai hành động lấy cảm hứng từ Dragon Ball. Thu thập Ngọc Rồng, chiến đấu với chiến binh toàn vũ trụ. Tải game miễn phí!',
  defaultOgImage: '/assets/og-default.jpg',
  locale: 'vi_VN',
};

// ============ Slug Generator (Vietnamese-friendly) ============

const VIETNAMESE_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'đ': 'd',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
};

/**
 * Chuyển chuỗi tiếng Việt thành slug URL-friendly
 * VD: "Cập nhật mới v2.5!" → "cap-nhat-moi-v2-5"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(char => VIETNAMESE_MAP[char] || char)
    .join('')
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '')         // Trim hyphens
    .substring(0, 80);             // Max 80 chars
}

/**
 * Tạo URL bài viết chuẩn SEO: /news/:id/:slug
 */
export function getPostUrl(id: number, title: string): string {
  const slug = generateSlug(title);
  return `/news/${id}/${slug}`;
}

// ============ useSEO Hook — Dynamic Document Head ============

interface SEOOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonical?: string;
  noIndex?: boolean;
  /** JSON-LD structured data object */
  jsonLd?: Record<string, unknown>;
}

function setMeta(property: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(url: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = url;
}

function setJsonLd(data: Record<string, unknown>) {
  const id = 'seo-json-ld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd() {
  const el = document.getElementById('seo-json-ld');
  if (el) el.remove();
}

/**
 * Custom hook cập nhật document title, meta tags, OG tags, canonical, JSON-LD
 * Tự cleanup khi unmount (reset về default)
 */
export function useSEO(options: SEOOptions) {
  useEffect(() => {
    const {
      title,
      description,
      ogImage,
      ogType = 'website',
      canonical,
      noIndex,
      jsonLd,
    } = options;

    // Title
    const prevTitle = document.title;
    if (title) {
      document.title = `${title} | ${SITE_CONFIG.name}`;
    }

    // Meta description
    const desc = description || SITE_CONFIG.defaultDescription;
    setMeta('description', desc);

    // OG tags
    setMeta('og:title', title || SITE_CONFIG.name, true);
    setMeta('og:description', desc, true);
    setMeta('og:type', ogType, true);
    setMeta('og:site_name', SITE_CONFIG.name, true);
    setMeta('og:locale', SITE_CONFIG.locale, true);
    if (ogImage) {
      const fullImage = ogImage.startsWith('http') ? ogImage : `${SITE_CONFIG.domain}${ogImage}`;
      setMeta('og:image', fullImage, true);
    }

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title || SITE_CONFIG.name);
    setMeta('twitter:description', desc);

    // Canonical
    if (canonical) {
      const fullCanonical = canonical.startsWith('http') ? canonical : `${SITE_CONFIG.domain}${canonical}`;
      setCanonical(fullCanonical);
      setMeta('og:url', fullCanonical, true);
    }

    // noIndex
    if (noIndex) {
      setMeta('robots', 'noindex, nofollow');
    }

    // JSON-LD
    if (jsonLd) {
      setJsonLd(jsonLd);
    }

    // Cleanup on unmount: reset to defaults
    return () => {
      document.title = prevTitle;
      removeJsonLd();
    };
  }, [options.title, options.description, options.canonical, options.ogImage, options.ogType, options.noIndex]);
}

/**
 * Trích xuất preview text từ nội dung bài viết (Editor.js JSON hoặc plain text)
 * Dùng cho meta description
 */
export function extractPostPreview(description: string, maxLength = 160): string {
  try {
    const parsed = JSON.parse(description);
    if (parsed?.blocks) {
      const text = parsed.blocks
        .filter((b: { type: string }) => b.type === 'paragraph' || b.type === 'header')
        .map((b: { data?: { text?: string } }) => b.data?.text?.replace(/<[^>]*>/g, '') || '')
        .join(' ');
      return text.substring(0, maxLength) || SITE_CONFIG.defaultDescription;
    }
  } catch {
    // plain text
  }
  const clean = description.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return clean.substring(0, maxLength) || SITE_CONFIG.defaultDescription;
}
