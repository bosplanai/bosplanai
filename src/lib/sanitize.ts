import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks.
 * This function removes potentially dangerous elements and attributes
 * while preserving safe formatting tags used in rich text editors.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
      // Headings
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      // Lists
      'ul', 'ol', 'li',
      // Links (href will be validated)
      'a',
      // Quotes and code
      'blockquote', 'code', 'pre',
      // Tables
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      // Other common elements
      'span', 'div', 'hr', 'mark', 'sub', 'sup',
      // Images (src will be validated)
      'img',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel',
      'class', 'style',
      'src', 'alt', 'width', 'height',
      'colspan', 'rowspan',
      'align',
    ],
    ALLOW_DATA_ATTR: false,
    // Only allow safe URL protocols
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Add rel="noopener noreferrer" to links automatically
    ADD_ATTR: ['target'],
  });
}

/**
 * Sanitize plain text by escaping HTML entities.
 * Use this for content that should be displayed as plain text.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}
