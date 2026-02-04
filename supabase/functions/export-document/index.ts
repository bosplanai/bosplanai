import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, format, fileName } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Exporting document: ${fileName} as ${format}`);

    let exportData: string;
    let mimeType: string;
    let extension: string;
    
    // Get base filename without extension
    const baseName = fileName.replace(/\.[^/.]+$/, '') || 'document';

    switch (format) {
      case 'docx':
        // Create a Word-compatible HTML document with enhanced styling
        // Word can open HTML files with .doc extension and preserves formatting
        const wordHtml = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    /* Page setup */
    @page { 
      size: A4; 
      margin: 1in; 
      mso-page-orientation: portrait;
    }
    @page Section1 { }
    div.Section1 { page: Section1; }
    
    /* Base styles */
    body { 
      font-family: 'Calibri', 'Arial', sans-serif; 
      font-size: 11pt; 
      line-height: 1.5;
      color: #000;
    }
    
    /* Headings */
    h1 { 
      font-size: 24pt; 
      font-weight: bold; 
      margin: 12pt 0;
      mso-style-name: "Heading 1";
    }
    h2 { 
      font-size: 18pt; 
      font-weight: bold; 
      margin: 10pt 0;
      mso-style-name: "Heading 2";
    }
    h3 { 
      font-size: 14pt; 
      font-weight: bold; 
      margin: 8pt 0;
      mso-style-name: "Heading 3";
    }
    h4 { 
      font-size: 12pt; 
      font-weight: bold; 
      margin: 6pt 0;
      mso-style-name: "Heading 4";
    }
    
    /* Paragraphs */
    p { 
      margin: 6pt 0; 
      mso-style-name: "Normal";
    }
    
    /* Tables */
    table { 
      border-collapse: collapse; 
      width: 100%; 
      margin: 12pt 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    td, th { 
      border: 1px solid #000; 
      padding: 6pt;
      mso-border-alt: solid windowtext .5pt;
    }
    th { 
      background: #f0f0f0; 
      font-weight: bold;
      mso-shading: white;
      mso-pattern: gray-125 auto;
    }
    
    /* Lists */
    ul, ol { 
      margin: 6pt 0; 
      padding-left: 24pt;
    }
    li { 
      margin: 3pt 0;
      mso-list: l0 level1 lfo1;
    }
    
    /* Blockquotes */
    blockquote { 
      border-left: 3pt solid #ccc; 
      padding-left: 12pt; 
      margin: 6pt 0; 
      color: #555;
      font-style: italic;
    }
    
    /* Images */
    img { 
      max-width: 100%; 
      height: auto;
    }
    
    /* Text formatting */
    strong, b { font-weight: bold; }
    em, i { font-style: italic; }
    u { text-decoration: underline; }
    s, strike, del { text-decoration: line-through; }
    sub { vertical-align: sub; font-size: 0.75em; }
    sup { vertical-align: super; font-size: 0.75em; }
    mark { background-color: yellow; }
    
    /* Links */
    a { 
      color: #0563C1; 
      text-decoration: underline;
    }
    
    /* Code */
    code, pre { 
      font-family: 'Consolas', 'Courier New', monospace;
      background: #f5f5f5;
      padding: 2pt 4pt;
    }
    pre { 
      display: block; 
      padding: 6pt; 
      margin: 6pt 0;
      white-space: pre-wrap;
    }
    
    /* Page breaks */
    .page-break {
      page-break-after: always;
      mso-break-type: section-break;
    }
    
    /* Document header/footer */
    .document-header {
      border-bottom: 1pt solid #ccc;
      padding-bottom: 6pt;
      margin-bottom: 12pt;
    }
    .document-footer {
      border-top: 1pt solid #ccc;
      padding-top: 6pt;
      margin-top: 12pt;
    }
    
    /* Preserve inline styles */
    [style] { }
  </style>
</head>
<body>
<div class="Section1">
${content}
</div>
</body>
</html>`;
        exportData = btoa(unescape(encodeURIComponent(wordHtml)));
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'doc';
        break;
        
      case 'rtf':
        // Create an RTF document with formatting preservation
        const rtfContent = createRtfDocument(content);
        exportData = btoa(unescape(encodeURIComponent(rtfContent)));
        mimeType = 'application/rtf';
        extension = 'rtf';
        break;
        
      case 'html':
        const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(baseName)}</title>
  <style>
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 12pt; 
      line-height: 1.6;
      max-width: 800px;
      margin: 2em auto;
      padding: 1em;
    }
    h1 { font-size: 24pt; }
    h2 { font-size: 18pt; }
    h3 { font-size: 14pt; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ccc; padding: 8px; }
    th { background: #f5f5f5; }
    img { max-width: 100%; height: auto; }
    .page-break { page-break-after: always; border-top: 2px dashed #ccc; margin: 2em 0; }
    sub { vertical-align: sub; font-size: 0.75em; }
    sup { vertical-align: super; font-size: 0.75em; }
    mark { background-color: yellow; }
    blockquote { border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em; color: #666; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
        exportData = btoa(unescape(encodeURIComponent(htmlDoc)));
        mimeType = 'text/html';
        extension = 'html';
        break;
        
      case 'txt':
        const textContent = stripHtmlToText(content);
        exportData = btoa(unescape(encodeURIComponent(textContent)));
        mimeType = 'text/plain';
        extension = 'txt';
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported format: ${format}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    console.log(`Export successful: ${baseName}.${extension}`);

    return new Response(
      JSON.stringify({
        data: exportData,
        mimeType,
        filename: `${baseName}.${extension}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Escape HTML entities
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper function to convert HTML to plain text
function stripHtmlToText(html: string): string {
  // Remove script and style tags with content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Convert common elements to text equivalents
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li>/gi, '• ');
  text = text.replace(/<\/li>/gi, '\n');
  text = text.replace(/<hr[^>]*>/gi, '\n---\n');
  
  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
}

// Create RTF document with better formatting
function createRtfDocument(html: string): string {
  // RTF header with font table and color table
  let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\n';
  rtf += '{\\fonttbl{\\f0\\fswiss\\fcharset0 Calibri;}{\\f1\\fmodern\\fcharset0 Courier New;}}\n';
  rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;\\red255\\green0\\blue0;\\red0\\green128\\blue0;\\red128\\green128\\blue128;\\red255\\green255\\blue0;}\n';
  rtf += '\\viewkind4\\uc1\\pard\\f0\\fs22\n';
  
  // Process HTML to RTF
  let content = html;
  
  // Handle headings
  content = content.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, text) => `\\pard\\b\\fs48 ${stripHtmlForRtf(text)}\\b0\\fs22\\par\\par `);
  content = content.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, text) => `\\pard\\b\\fs36 ${stripHtmlForRtf(text)}\\b0\\fs22\\par\\par `);
  content = content.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, text) => `\\pard\\b\\fs28 ${stripHtmlForRtf(text)}\\b0\\fs22\\par\\par `);
  
  // Handle paragraphs
  content = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text) => `\\pard ${stripHtmlForRtf(text)}\\par\\par `);
  
  // Handle formatting
  content = content.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '\\b $1\\b0 ');
  content = content.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '\\b $1\\b0 ');
  content = content.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '\\i $1\\i0 ');
  content = content.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '\\i $1\\i0 ');
  content = content.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '\\ul $1\\ulnone ');
  content = content.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '\\strike $1\\strike0 ');
  content = content.replace(/<sub[^>]*>([\s\S]*?)<\/sub>/gi, '{\\sub $1}');
  content = content.replace(/<sup[^>]*>([\s\S]*?)<\/sup>/gi, '{\\super $1}');
  
  // Handle lists
  content = content.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, '$1');
  content = content.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, '$1');
  content = content.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\\pard\\bullet  $1\\par ');
  
  // Handle line breaks and page breaks
  content = content.replace(/<br\s*\/?>/gi, '\\line ');
  content = content.replace(/<hr[^>]*class="page-break"[^>]*>/gi, '\\page ');
  content = content.replace(/<hr[^>]*>/gi, '\\pard\\brdrb\\brdrs\\brdrw10\\brsp20 \\par ');
  
  // Handle blockquotes
  content = content.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\\pard\\li720\\i $1\\i0\\li0\\par ');
  
  // Handle code
  content = content.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '{\\f1 $1}');
  content = content.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\\pard{\\f1 $1}\\par ');
  
  // Remove remaining HTML tags
  content = content.replace(/<[^>]+>/g, '');
  
  // Escape RTF special characters in remaining text
  content = escapeRtfText(content);
  
  rtf += content;
  rtf += '}';
  
  return rtf;
}

// Strip HTML tags for RTF inline conversion
function stripHtmlForRtf(html: string): string {
  // Process inline formatting first
  let text = html;
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '\\b $1\\b0 ');
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '\\b $1\\b0 ');
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '\\i $1\\i0 ');
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '\\i $1\\i0 ');
  text = text.replace(/<u[^>]*>([\s\S]*?)<\/u>/gi, '\\ul $1\\ulnone ');
  text = text.replace(/<br\s*\/?>/gi, '\\line ');
  
  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');
  
  return escapeRtfText(text);
}

// Escape special RTF characters
function escapeRtfText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
