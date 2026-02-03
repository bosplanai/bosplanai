import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple XML parser for DOCX files
function parseDocxXml(xmlContent: string): string {
  // Extract text from w:t tags (Word text elements)
  const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const paragraphs: string[] = [];
  let currentParagraph = '';
  
  // Track paragraph breaks
  const paragraphMatches = xmlContent.split(/<w:p[^\/]*>/);
  
  for (const para of paragraphMatches) {
    if (!para.trim()) continue;
    
    const texts: string[] = [];
    const textTags = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    
    for (const tag of textTags) {
      const textMatch = tag.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
      if (textMatch && textMatch[1]) {
        texts.push(textMatch[1]);
      }
    }
    
    if (texts.length > 0) {
      paragraphs.push(texts.join(''));
    }
  }
  
  // Convert to HTML paragraphs
  return paragraphs
    .filter(p => p.trim())
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join('\n');
}

// Simple XML parser for XLSX files
function parseXlsxXml(sharedStringsXml: string | null, sheetXml: string): string {
  // Parse shared strings
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siMatches = sharedStringsXml.match(/<si>[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatch = si.match(/<t[^>]*>([^<]*)<\/t>/);
      if (tMatch) {
        sharedStrings.push(tMatch[1]);
      } else {
        // Handle multiple t tags in rich text
        const tMatches = si.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
        const combinedText = tMatches.map(t => {
          const m = t.match(/<t[^>]*>([^<]*)<\/t>/);
          return m ? m[1] : '';
        }).join('');
        sharedStrings.push(combinedText);
      }
    }
  }
  
  // Parse sheet data
  const rows: string[][] = [];
  const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];
  
  for (const rowXml of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowXml.match(/<c[^>]*>[\s\S]*?<\/c>/g) || [];
    
    for (const cellXml of cellMatches) {
      const vMatch = cellXml.match(/<v>([^<]*)<\/v>/);
      const tAttr = cellXml.match(/t="([^"]*)"/);
      
      if (vMatch) {
        const value = vMatch[1];
        // Check if it's a shared string reference
        if (tAttr && tAttr[1] === 's') {
          const index = parseInt(value, 10);
          cells.push(sharedStrings[index] || value);
        } else {
          cells.push(value);
        }
      } else {
        cells.push('');
      }
    }
    
    if (cells.some(c => c.trim())) {
      rows.push(cells);
    }
  }
  
  // Convert to HTML table
  if (rows.length === 0) {
    return '<p>No data found in spreadsheet</p>';
  }
  
  let html = '<div class="xlsx-content"><table class="excel-table">';
  
  // First row as header
  if (rows.length > 0) {
    html += '<thead><tr>';
    for (const cell of rows[0]) {
      html += `<th>${escapeHtml(cell)}</th>`;
    }
    html += '</tr></thead>';
  }
  
  // Remaining rows as body
  if (rows.length > 1) {
    html += '<tbody>';
    for (let i = 1; i < rows.length; i++) {
      html += '<tr>';
      for (const cell of rows[i]) {
        html += `<td>${escapeHtml(cell)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
  }
  
  html += '</table></div>';
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Unzip function using DecompressionStream
async function unzipFile(arrayBuffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  const view = new DataView(arrayBuffer);
  let offset = 0;
  
  while (offset < arrayBuffer.byteLength - 4) {
    const signature = view.getUint32(offset, true);
    
    // Local file header signature
    if (signature === 0x04034b50) {
      const compressedMethod = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const fileNameLength = view.getUint16(offset + 26, true);
      const extraFieldLength = view.getUint16(offset + 28, true);
      
      const fileNameStart = offset + 30;
      const fileNameBytes = new Uint8Array(arrayBuffer, fileNameStart, fileNameLength);
      const fileName = new TextDecoder().decode(fileNameBytes);
      
      const dataStart = fileNameStart + fileNameLength + extraFieldLength;
      const compressedData = new Uint8Array(arrayBuffer, dataStart, compressedSize);
      
      if (compressedMethod === 0) {
        // No compression
        files.set(fileName, compressedData);
      } else if (compressedMethod === 8) {
        // Deflate compression
        try {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(compressedData);
          writer.close();
          
          const reader = ds.readable.getReader();
          const chunks: Uint8Array[] = [];
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          
          // Combine chunks
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let position = 0;
          for (const chunk of chunks) {
            result.set(chunk, position);
            position += chunk.length;
          }
          
          files.set(fileName, result);
        } catch (e) {
          console.error(`Failed to decompress ${fileName}:`, e);
        }
      }
      
      offset = dataStart + compressedSize;
    } else if (signature === 0x02014b50) {
      // Central directory - stop processing
      break;
    } else {
      offset++;
    }
  }
  
  return files;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileId, filePath, mimeType, bucket } = await req.json();

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: "File path is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided bucket or default to drive-files
    const storageBucket = bucket || "drive-files";

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(storageBucket)
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file", details: downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lowerMimeType = (mimeType || '').toLowerCase();
    const lowerPath = filePath.toLowerCase();
    let content = '';

    // Handle DOCX files
    if (lowerMimeType.includes('wordprocessingml') || lowerMimeType.includes('msword') || lowerPath.endsWith('.docx')) {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const files = await unzipFile(arrayBuffer);
        
        const documentXml = files.get('word/document.xml');
        if (documentXml) {
          const xmlContent = new TextDecoder().decode(documentXml);
          content = parseDocxXml(xmlContent);
        } else {
          content = '<p>Could not extract document content</p>';
        }
      } catch (e) {
        console.error("DOCX parsing error:", e);
        content = `<p>Error parsing document: ${e instanceof Error ? e.message : 'Unknown error'}</p>`;
      }
    }
    // Handle XLSX files
    else if (lowerMimeType.includes('spreadsheet') || lowerMimeType.includes('excel') || lowerPath.endsWith('.xlsx')) {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const files = await unzipFile(arrayBuffer);
        
        const sharedStringsData = files.get('xl/sharedStrings.xml');
        const sharedStringsXml = sharedStringsData 
          ? new TextDecoder().decode(sharedStringsData) 
          : null;
        
        const sheet1Data = files.get('xl/worksheets/sheet1.xml');
        if (sheet1Data) {
          const sheetXml = new TextDecoder().decode(sheet1Data);
          content = parseXlsxXml(sharedStringsXml, sheetXml);
        } else {
          content = '<p>Could not extract spreadsheet content</p>';
        }
      } catch (e) {
        console.error("XLSX parsing error:", e);
        content = `<p>Error parsing spreadsheet: ${e instanceof Error ? e.message : 'Unknown error'}</p>`;
      }
    }
    // Handle DOC files (older format) - limited support
    else if (lowerMimeType.includes('msword') || lowerPath.endsWith('.doc')) {
      // DOC files are binary format and harder to parse
      // Return a message indicating limited support
      content = '<p>Legacy .doc format detected. For best editing experience, please convert to .docx format.</p>';
    }
    // Handle XLS files (older format) - limited support
    else if (lowerPath.endsWith('.xls')) {
      content = '<p>Legacy .xls format detected. For best editing experience, please convert to .xlsx format.</p>';
    }
    // Handle plain text files
    else if (lowerMimeType.includes('text/plain') || lowerPath.endsWith('.txt')) {
      const text = await fileData.text();
      content = `<p>${escapeHtml(text).replace(/\n/g, '</p><p>')}</p>`;
    }
    else {
      return new Response(
        JSON.stringify({ 
          error: "Unsupported file type for parsing",
          supportedTypes: ["docx", "xlsx", "txt"],
          receivedType: mimeType
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ content, fileId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Parse document error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to parse document",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
