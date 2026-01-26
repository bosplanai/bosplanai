import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExportResult {
  data?: string; // Base64 encoded file
  mimeType?: string;
  filename?: string;
  error?: string;
}

// Clean HTML for export
function cleanHtmlForExport(html: string): string {
  // Remove embedded styles from document wrapper
  let cleaned = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/class="[^"]*"/gi, '')
    .replace(/data-[a-z-]+="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '');
  
  return cleaned;
}

// Convert HTML to DOCX-compatible format
async function exportToDocx(html: string, fileName: string): Promise<ExportResult> {
  try {
    // Use docx library for proper Word document generation
    const docx = await import('https://esm.sh/docx@8.5.0');
    
    // Parse HTML and convert to docx elements
    const paragraphs: any[] = [];
    
    // Simple HTML to docx conversion
    // First, clean and normalize the HTML
    const cleanHtml = cleanHtmlForExport(html);
    
    // Extract text content with basic structure
    const tempDoc = cleanHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, '\t')
      .replace(/<\/th>/gi, '\t');
    
    // Remove remaining HTML tags
    const textContent = tempDoc.replace(/<[^>]+>/g, '').trim();
    
    // Split into paragraphs and create docx elements
    const lines = textContent.split(/\n+/).filter(line => line.trim());
    
    for (const line of lines) {
      paragraphs.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: line.trim(),
              font: 'Calibri',
              size: 22, // 11pt
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
    
    // Create the document
    const doc = new docx.Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: paragraphs,
      }],
    });
    
    // Generate the docx file
    const buffer = await docx.Packer.toBuffer(doc);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    
    return {
      data: base64,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: fileName.replace(/\.[^.]+$/, '') + '.docx',
    };
  } catch (error) {
    console.error('DOCX export error:', error);
    
    // Fallback: Create a simple HTML-based document
    const docContent = `
      <?xml version="1.0" encoding="UTF-8"?>
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Calibri, sans-serif; font-size: 11pt; }
            h1 { font-size: 2em; font-weight: bold; }
            h2 { font-size: 1.5em; font-weight: bold; }
            h3 { font-size: 1.17em; font-weight: bold; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #000; padding: 8px; }
          </style>
        </head>
        <body>
          ${cleanHtmlForExport(html)}
        </body>
      </html>
    `;
    
    const base64 = btoa(unescape(encodeURIComponent(docContent)));
    
    return {
      data: base64,
      mimeType: 'application/msword',
      filename: fileName.replace(/\.[^.]+$/, '') + '.doc',
    };
  }
}

// Convert HTML to PDF-ready HTML (for client-side printing)
function exportToPdf(html: string, fileName: string): ExportResult {
  // Create a print-optimized HTML document
  const printHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${fileName}</title>
        <style>
          @media print {
            @page { margin: 1in; size: A4; }
          }
          body { 
            font-family: 'Times New Roman', Georgia, serif; 
            font-size: 12pt; 
            line-height: 1.6;
            color: #000;
            max-width: 800px;
            margin: 0 auto;
            padding: 2em;
          }
          h1 { font-size: 24pt; font-weight: bold; margin: 0.5em 0; }
          h2 { font-size: 18pt; font-weight: bold; margin: 0.5em 0; }
          h3 { font-size: 14pt; font-weight: bold; margin: 0.5em 0; }
          p { margin: 0.5em 0; text-align: justify; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          td, th { border: 1px solid #000; padding: 8px; }
          th { background: #f0f0f0; font-weight: bold; }
          blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; color: #555; }
          ul, ol { margin: 0.5em 0; padding-left: 2em; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        ${cleanHtmlForExport(html)}
      </body>
    </html>
  `;
  
  const base64 = btoa(unescape(encodeURIComponent(printHtml)));
  
  return {
    data: base64,
    mimeType: 'text/html',
    filename: fileName.replace(/\.[^.]+$/, '') + '.pdf.html',
  };
}

// Convert HTML to RTF
async function exportToRtf(html: string, fileName: string): Promise<ExportResult> {
  try {
    // Simple HTML to RTF conversion
    let rtf = '{\\rtf1\\ansi\\deff0';
    rtf += '{\\fonttbl{\\f0 Times New Roman;}{\\f1 Calibri;}}';
    rtf += '\\f1\\fs22 '; // Default font: Calibri 11pt
    
    // Clean HTML and convert to RTF
    const cleanHtml = cleanHtmlForExport(html);
    
    // Basic tag conversion
    let content = cleanHtml
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\\fs48\\b $1\\b0\\fs22\\par\\par ')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\\fs36\\b $1\\b0\\fs22\\par\\par ')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\\fs28\\b $1\\b0\\fs22\\par\\par ')
      .replace(/<strong>(.*?)<\/strong>/gi, '\\b $1\\b0 ')
      .replace(/<b>(.*?)<\/b>/gi, '\\b $1\\b0 ')
      .replace(/<em>(.*?)<\/em>/gi, '\\i $1\\i0 ')
      .replace(/<i>(.*?)<\/i>/gi, '\\i $1\\i0 ')
      .replace(/<u>(.*?)<\/u>/gi, '\\ul $1\\ul0 ')
      .replace(/<br\s*\/?>/gi, '\\line ')
      .replace(/<\/p>/gi, '\\par\\par ')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\\par ')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<li[^>]*>/gi, '\\tab\\bullet ')
      .replace(/<\/li>/gi, '\\par ')
      .replace(/<[^>]+>/g, '') // Remove remaining tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');
    
    rtf += content + '}';
    
    const base64 = btoa(unescape(encodeURIComponent(rtf)));
    
    return {
      data: base64,
      mimeType: 'application/rtf',
      filename: fileName.replace(/\.[^.]+$/, '') + '.rtf',
    };
  } catch (error) {
    console.error('RTF export error:', error);
    return {
      error: `Failed to export RTF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Export as HTML
function exportToHtml(html: string, fileName: string): ExportResult {
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${fileName}</title>
        <style>
          body {
            font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2em;
            color: #333;
          }
          h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; }
          h2 { font-size: 1.5em; font-weight: bold; margin: 0.75em 0; }
          h3 { font-size: 1.17em; font-weight: bold; margin: 0.83em 0; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; }
          td, th { border: 1px solid #ddd; padding: 8px 12px; }
          th { background: #f5f5f5; font-weight: 600; }
          blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em; color: #555; }
          img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
  
  const base64 = btoa(unescape(encodeURIComponent(fullHtml)));
  
  return {
    data: base64,
    mimeType: 'text/html',
    filename: fileName.replace(/\.[^.]+$/, '') + '.html',
  };
}

// Export as plain text
function exportToText(html: string, fileName: string): ExportResult {
  // Convert HTML to plain text
  const text = cleanHtmlForExport(html)
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n$1\n' + '='.repeat(40) + '\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n$1\n' + '-'.repeat(30) + '\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/th>/gi, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  const base64 = btoa(unescape(encodeURIComponent(text)));
  
  return {
    data: base64,
    mimeType: 'text/plain',
    filename: fileName.replace(/\.[^.]+$/, '') + '.txt',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, format, fileName } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const exportFormat = (format || 'docx').toLowerCase();
    const name = fileName || 'document';
    let result: ExportResult;

    switch (exportFormat) {
      case 'docx':
      case 'doc':
        result = await exportToDocx(content, name);
        break;
      case 'pdf':
        result = await exportToPdf(content, name);
        break;
      case 'rtf':
        result = await exportToRtf(content, name);
        break;
      case 'html':
        result = exportToHtml(content, name);
        break;
      case 'txt':
      case 'text':
        result = exportToText(content, name);
        break;
      default:
        result = { error: `Unsupported export format: ${exportFormat}` };
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Export document error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
