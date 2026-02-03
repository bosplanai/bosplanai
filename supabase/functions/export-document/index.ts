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
        // Create a Word-compatible HTML document
        // Word can open HTML files with .doc extension
        const wordHtml = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word"
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
    @page { size: A4; margin: 1in; }
    body { 
      font-family: 'Calibri', 'Arial', sans-serif; 
      font-size: 11pt; 
      line-height: 1.5;
      color: #000;
    }
    h1 { font-size: 24pt; font-weight: bold; margin: 12pt 0; }
    h2 { font-size: 18pt; font-weight: bold; margin: 10pt 0; }
    h3 { font-size: 14pt; font-weight: bold; margin: 8pt 0; }
    p { margin: 6pt 0; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
    td, th { border: 1px solid #000; padding: 6pt; }
    th { background: #f0f0f0; font-weight: bold; }
    ul, ol { margin: 6pt 0; padding-left: 24pt; }
    li { margin: 3pt 0; }
    blockquote { border-left: 3pt solid #ccc; padding-left: 12pt; margin: 6pt 0; color: #555; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
        exportData = btoa(unescape(encodeURIComponent(wordHtml)));
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = 'doc';
        break;
        
      case 'rtf':
        // Create a simple RTF document
        const rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Calibri;}}
{\\colortbl;\\red0\\green0\\blue0;}
\\f0\\fs22
${stripHtmlToRtf(content)}
}`;
        exportData = btoa(unescape(encodeURIComponent(rtfContent)));
        mimeType = 'application/rtf';
        extension = 'rtf';
        break;
        
      case 'html':
        const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${baseName}</title>
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

// Helper function to convert HTML to RTF-compatible text
function stripHtmlToRtf(html: string): string {
  let text = stripHtmlToText(html);
  
  // Escape RTF special characters
  text = text.replace(/\\/g, '\\\\');
  text = text.replace(/\{/g, '\\{');
  text = text.replace(/\}/g, '\\}');
  
  // Convert newlines to RTF paragraph breaks
  text = text.replace(/\n\n/g, '\\par\\par ');
  text = text.replace(/\n/g, '\\par ');
  
  return text;
}
