/**
 * Document utility functions for file type checking and handling
 * This file centralizes logic for determining editable vs view-only files
 */

// MIME types for editable documents (including legacy Word/Excel for parsing)
const EDITABLE_MIME_TYPES = [
  // Modern Word documents (.docx)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Legacy Word (.doc) - now editable via parse-document
  'application/msword',
  // Excel spreadsheets (.xlsx)
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Legacy Excel (.xls) - now editable via parse-document
  'application/vnd.ms-excel',
];

// MIME types for preview-only documents (no editing)
const VIEW_ONLY_MIME_TYPES = [
  // PDF
  'application/pdf',
  // PowerPoint (modern and legacy) - view only for now
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

// All Office document MIME types (for Google Docs viewer fallback)
const ALL_OFFICE_MIME_TYPES = [
  ...EDITABLE_MIME_TYPES,
  ...VIEW_ONLY_MIME_TYPES.filter(m => m.includes('presentationml') || m.includes('powerpoint')),
];

/**
 * Check if a file is editable in the in-app document editor
 * Editable files: .docx, .doc, .xlsx, .xls
 */
export function isEditableDocument(mimeType: string | null, fileName?: string | null): boolean {
  if (!mimeType && !fileName) return false;
  
  // Check by MIME type first
  if (mimeType) {
    const lowerMime = mimeType.toLowerCase();
    if (EDITABLE_MIME_TYPES.some(type => lowerMime.includes(type) || lowerMime === type)) {
      return true;
    }
    // Also check for generic Office document MIME types
    if (lowerMime.includes('wordprocessingml') || lowerMime.includes('spreadsheetml') ||
        lowerMime.includes('msword') || lowerMime.includes('ms-excel')) {
      return true;
    }
  }
  
  // Fallback to file extension check - all Word and Excel formats are editable
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    return lowerName.endsWith('.docx') || 
           lowerName.endsWith('.doc') || 
           lowerName.endsWith('.xlsx') || 
           lowerName.endsWith('.xls');
  }
  
  return false;
}

/**
 * Check if a file is a legacy Office document (.doc, .xls)
 * Note: Legacy formats are now supported for editing via parse-document
 * This function is kept for backward compatibility but always returns false
 * @deprecated Legacy formats are now editable
 */
export function isLegacyOfficeDocument(mimeType: string | null, fileName?: string | null): boolean {
  // Legacy formats are now editable, so this always returns false
  return false;
}

/**
 * Check if a file is an Office document (any format - for Google Docs viewer)
 */
export function isOfficeDocument(mimeType: string | null, fileName?: string | null): boolean {
  if (!mimeType && !fileName) return false;
  
  if (mimeType) {
    const lowerMime = mimeType.toLowerCase();
    if (lowerMime.includes('wordprocessingml') ||
        lowerMime.includes('msword') ||
        lowerMime.includes('spreadsheetml') ||
        lowerMime.includes('ms-excel') ||
        lowerMime.includes('presentationml') ||
        lowerMime.includes('ms-powerpoint')) {
      return true;
    }
  }
  
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    return lowerName.endsWith('.docx') || 
           lowerName.endsWith('.doc') || 
           lowerName.endsWith('.xlsx') || 
           lowerName.endsWith('.xls') ||
           lowerName.endsWith('.pptx') ||
           lowerName.endsWith('.ppt');
  }
  
  return false;
}

/**
 * Check if a file is a PDF
 */
export function isPdfDocument(mimeType: string | null, fileName?: string | null): boolean {
  if (mimeType && mimeType.toLowerCase() === 'application/pdf') return true;
  if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true;
  return false;
}

/**
 * Check if a file is an image
 */
export function isImageFile(mimeType: string | null): boolean {
  return mimeType?.startsWith('image/') ?? false;
}

/**
 * Check if a file is a video
 */
export function isVideoFile(mimeType: string | null): boolean {
  return mimeType?.startsWith('video/') ?? false;
}

/**
 * Check if a file is an audio file
 */
export function isAudioFile(mimeType: string | null): boolean {
  return mimeType?.startsWith('audio/') ?? false;
}

/**
 * Check if a file can be previewed in the browser
 * Returns true for images, videos, audio, PDFs, and Office documents (via Google Docs viewer)
 */
export function isPreviewable(mimeType: string | null, fileName?: string | null): boolean {
  if (!mimeType && !fileName) return false;
  
  return isImageFile(mimeType) || 
         isVideoFile(mimeType) || 
         isAudioFile(mimeType) || 
         isPdfDocument(mimeType, fileName) ||
         isOfficeDocument(mimeType, fileName);
}

/**
 * Get the document type category for display purposes
 */
export type DocumentCategory = 'editable' | 'pdf' | 'image' | 'video' | 'audio' | 'other';

export function getDocumentCategory(mimeType: string | null, fileName?: string | null): DocumentCategory {
  if (isEditableDocument(mimeType, fileName)) return 'editable';
  if (isPdfDocument(mimeType, fileName)) return 'pdf';
  if (isImageFile(mimeType)) return 'image';
  if (isVideoFile(mimeType)) return 'video';
  if (isAudioFile(mimeType)) return 'audio';
  return 'other';
}

/**
 * Get a human-readable description of file capabilities
 */
export function getFileCapabilitiesDescription(mimeType: string | null, fileName?: string | null): {
  canView: boolean;
  canEdit: boolean;
  canDownload: boolean;
  editMessage?: string;
} {
  const category = getDocumentCategory(mimeType, fileName);
  
  switch (category) {
    case 'editable':
      return {
        canView: true,
        canEdit: true,
        canDownload: true,
      };
    case 'pdf':
    case 'image':
    case 'video':
    case 'audio':
      return {
        canView: true,
        canEdit: false,
        canDownload: true,
      };
    default:
      return {
        canView: false,
        canEdit: false,
        canDownload: true,
      };
  }
}
