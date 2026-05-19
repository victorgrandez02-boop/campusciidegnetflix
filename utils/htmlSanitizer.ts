const ALLOWED_TAGS = new Set([
  'a',
  'abbr',
  'article',
  'aside',
  'b',
  'blockquote',
  'br',
  'caption',
  'code',
  'col',
  'colgroup',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'i',
  'img',
  'li',
  'main',
  'mark',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const GLOBAL_ATTRS = new Set(['class', 'id', 'title', 'aria-label', 'role']);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
};

const URL_ATTRS = new Set(['href', 'src']);
const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|data:image\/(?:png|jpeg|jpg|gif|webp);base64,)/i;
const DROP_WITH_CONTENT = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'link',
  'meta',
  'base',
]);

const isSafeUrl = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith('#') || SAFE_URL_PATTERN.test(trimmed);
};

export const looksLikeRemoteHtml = (value: string) => /^https:\/\/[^\s<>"']+$/i.test(value.trim());

export const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/\s(?:href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<template>${html}</template>`, 'text/html');
  const template = doc.querySelector('template');
  if (!template) return '';

  const sanitizeNode = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const element = child as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (DROP_WITH_CONTENT.has(tagName)) {
        element.remove();
        continue;
      }

      if (!ALLOWED_TAGS.has(tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        sanitizeNode(node);
        continue;
      }

      for (const attr of Array.from(element.attributes)) {
        const attrName = attr.name.toLowerCase();
        const allowedForTag = TAG_ATTRS[tagName]?.has(attrName);
        const allowed = GLOBAL_ATTRS.has(attrName) || allowedForTag;

        if (!allowed || attrName.startsWith('on')) {
          element.removeAttribute(attr.name);
          continue;
        }

        if (URL_ATTRS.has(attrName) && !isSafeUrl(attr.value)) {
          element.removeAttribute(attr.name);
        }
      }

      if (tagName === 'a') {
        element.setAttribute('rel', 'noopener noreferrer');
        if (element.getAttribute('target') === '_blank') {
          element.setAttribute('target', '_blank');
        }
      }

      if (tagName === 'img' && !element.getAttribute('loading')) {
        element.setAttribute('loading', 'lazy');
      }

      sanitizeNode(element);
    }
  };

  sanitizeNode(template.content);
  return template.innerHTML;
};

export const buildSafeHtmlDocument = (html: string) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" />
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 24px; color: #111827; background: #ffffff; line-height: 1.6; }
    img, video, iframe { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    pre { overflow: auto; padding: 16px; background: #f3f4f6; border-radius: 8px; }
    a { color: #0369a1; }
  </style>
</head>
<body>${sanitizeHtml(html)}</body>
</html>`;
