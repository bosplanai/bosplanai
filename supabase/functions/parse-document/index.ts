import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced DOCX parser that preserves formatting
function parseDocxXml(documentXml: string, relationshipsXml: string | null, numberingXml: string | null): string {
  const html: string[] = [];
  
  // Parse relationships for hyperlinks
  const relationships = new Map<string, string>();
  if (relationshipsXml) {
    const relMatches = relationshipsXml.match(/<Relationship[^>]*>/g) || [];
    for (const rel of relMatches) {
      const idMatch = rel.match(/Id="([^"]*)"/);
      const targetMatch = rel.match(/Target="([^"]*)"/);
      const typeMatch = rel.match(/Type="[^"]*\/([^"\/]*)"/);
      if (idMatch && targetMatch) {
        relationships.set(idMatch[1], targetMatch[1]);
      }
    }
  }

  // Parse numbering definitions for lists
  const numberingFormats = new Map<string, { type: string; level: number }>();
  if (numberingXml) {
    const abstractNums = numberingXml.match(/<w:abstractNum[^>]*>[\s\S]*?<\/w:abstractNum>/g) || [];
    for (const abstractNum of abstractNums) {
      const abstractIdMatch = abstractNum.match(/w:abstractNumId="(\d+)"/);
      if (abstractIdMatch) {
        const lvlMatches = abstractNum.match(/<w:lvl[^>]*>[\s\S]*?<\/w:lvl>/g) || [];
        for (const lvl of lvlMatches) {
          const lvlIdMatch = lvl.match(/w:ilvl="(\d+)"/);
          const numFmtMatch = lvl.match(/<w:numFmt[^>]*w:val="([^"]*)"/);
          if (lvlIdMatch) {
            const isBullet = numFmtMatch && numFmtMatch[1] === 'bullet';
            numberingFormats.set(`${abstractIdMatch[1]}-${lvlIdMatch[1]}`, {
              type: isBullet ? 'ul' : 'ol',
              level: parseInt(lvlIdMatch[1])
            });
          }
        }
      }
    }
  }

  // Split by paragraphs and tables
  const bodyMatch = documentXml.match(/<w:body[^>]*>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) return '<p>Could not extract document content</p>';
  
  const bodyContent = bodyMatch[1];
  
  // Process elements in order (paragraphs and tables)
  let currentListType: string | null = null;
  let currentListLevel = 0;
  
  // Find all top-level elements
  const elements: { type: string; content: string; index: number }[] = [];
  
  // Find paragraphs
  const paraRegex = /<w:p[^\/]*>[\s\S]*?<\/w:p>|<w:p[^\/]*\/>/g;
  let match;
  while ((match = paraRegex.exec(bodyContent)) !== null) {
    elements.push({ type: 'paragraph', content: match[0], index: match.index });
  }
  
  // Find tables
  const tableRegex = /<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g;
  while ((match = tableRegex.exec(bodyContent)) !== null) {
    elements.push({ type: 'table', content: match[0], index: match.index });
  }
  
  // Sort by index to maintain document order
  elements.sort((a, b) => a.index - b.index);
  
  for (const element of elements) {
    if (element.type === 'table') {
      // Close any open list
      if (currentListType) {
        html.push(`</${currentListType}>`);
        currentListType = null;
      }
      html.push(parseTable(element.content));
    } else {
      const paraResult = parseParagraph(element.content, relationships, numberingFormats);
      
      // Handle list transitions
      if (paraResult.listType) {
        if (currentListType !== paraResult.listType) {
          if (currentListType) {
            html.push(`</${currentListType}>`);
          }
          html.push(`<${paraResult.listType}>`);
          currentListType = paraResult.listType;
        }
        html.push(`<li>${paraResult.html}</li>`);
      } else {
        if (currentListType) {
          html.push(`</${currentListType}>`);
          currentListType = null;
        }
        if (paraResult.html.trim()) {
          html.push(paraResult.html);
        }
      }
    }
  }
  
  // Close any remaining list
  if (currentListType) {
    html.push(`</${currentListType}>`);
  }
  
  return html.join('\n');
}

function parseParagraph(
  paraXml: string, 
  relationships: Map<string, string>,
  numberingFormats: Map<string, { type: string; level: number }>
): { html: string; listType: string | null } {
  // Check for heading style
  const styleMatch = paraXml.match(/<w:pStyle[^>]*w:val="([^"]*)"/);
  const style = styleMatch ? styleMatch[1] : null;
  
  // Check for numbering (list)
  const numIdMatch = paraXml.match(/<w:numId[^>]*w:val="(\d+)"/);
  const ilvlMatch = paraXml.match(/<w:ilvl[^>]*w:val="(\d+)"/);
  let listType: string | null = null;
  
  if (numIdMatch) {
    // Determine if bullet or numbered
    const numFmtKey = `${numIdMatch[1]}-${ilvlMatch ? ilvlMatch[1] : '0'}`;
    const fmt = numberingFormats.get(numFmtKey);
    listType = fmt?.type || 'ul';
  }
  
  // Check for alignment
  const alignMatch = paraXml.match(/<w:jc[^>]*w:val="([^"]*)"/);
  let alignment = '';
  if (alignMatch) {
    const alignMap: Record<string, string> = {
      'left': 'left',
      'center': 'center',
      'right': 'right',
      'both': 'justify',
      'distribute': 'justify'
    };
    alignment = alignMap[alignMatch[1]] || '';
  }
  
  // Check for indentation
  const indentMatch = paraXml.match(/<w:ind[^>]*>/);
  let indent = '';
  if (indentMatch) {
    const leftMatch = indentMatch[0].match(/w:left="(\d+)"/);
    const firstLineMatch = indentMatch[0].match(/w:firstLine="(\d+)"/);
    if (leftMatch) {
      const twips = parseInt(leftMatch[1]);
      const px = Math.round(twips / 20); // Convert twips to pixels (rough)
      indent = `margin-left: ${px}px;`;
    }
    if (firstLineMatch) {
      const twips = parseInt(firstLineMatch[1]);
      const px = Math.round(twips / 20);
      indent += ` text-indent: ${px}px;`;
    }
  }
  
  // Build inline styles
  let styleAttr = '';
  if (alignment || indent) {
    const styles: string[] = [];
    if (alignment) styles.push(`text-align: ${alignment}`);
    if (indent) styles.push(indent);
    styleAttr = ` style="${styles.join('; ')}"`;
  }
  
  // Extract runs (text with formatting)
  const content = parseRuns(paraXml, relationships);
  
  // Determine element type based on style
  let tag = 'p';
  if (style) {
    if (style.match(/^Heading1|^Title/i)) tag = 'h1';
    else if (style.match(/^Heading2|^Subtitle/i)) tag = 'h2';
    else if (style.match(/^Heading3/i)) tag = 'h3';
    else if (style.match(/^Heading4/i)) tag = 'h4';
    else if (style.match(/^Heading5/i)) tag = 'h5';
    else if (style.match(/^Heading6/i)) tag = 'h6';
  }
  
  if (listType) {
    return { html: content, listType };
  }
  
  return { html: content ? `<${tag}${styleAttr}>${content}</${tag}>` : '', listType: null };
}

function parseRuns(paraXml: string, relationships: Map<string, string>): string {
  const parts: string[] = [];
  
  // Find hyperlinks and regular runs
  const hyperlinkRegex = /<w:hyperlink[^>]*>[\s\S]*?<\/w:hyperlink>/g;
  const runRegex = /<w:r[^\/]*>[\s\S]*?<\/w:r>/g;
  
  // Process hyperlinks
  let lastIndex = 0;
  let match;
  
  // Get all content between hyperlinks
  const processedRanges: { start: number; end: number; content: string }[] = [];
  
  while ((match = hyperlinkRegex.exec(paraXml)) !== null) {
    // Process runs before this hyperlink
    const beforeContent = paraXml.slice(lastIndex, match.index);
    const runsInBefore = beforeContent.match(runRegex) || [];
    for (const run of runsInBefore) {
      const runContent = parseRun(run);
      if (runContent) parts.push(runContent);
    }
    
    // Process hyperlink
    const rIdMatch = match[0].match(/r:id="([^"]*)"/);
    const href = rIdMatch ? relationships.get(rIdMatch[1]) : null;
    const linkRuns = match[0].match(runRegex) || [];
    const linkText = linkRuns.map(r => parseRun(r)).join('');
    
    if (href && linkText) {
      parts.push(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
    } else if (linkText) {
      parts.push(linkText);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Process remaining runs after last hyperlink
  const afterContent = paraXml.slice(lastIndex);
  const runsAfter = afterContent.match(runRegex) || [];
  for (const run of runsAfter) {
    // Skip runs that are inside hyperlinks (already processed)
    const runContent = parseRun(run);
    if (runContent) parts.push(runContent);
  }
  
  return parts.join('');
}

function parseRun(runXml: string): string {
  // Extract text
  const textMatches = runXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const text = textMatches.map(t => {
    const m = t.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
    return m ? m[1] : '';
  }).join('');
  
  if (!text) return '';
  
  // Check for formatting
  const isBold = /<w:b[^>]*\/>|<w:b[^>]*>/.test(runXml) && !/<w:b[^>]*w:val="(false|0)"/.test(runXml);
  const isItalic = /<w:i[^>]*\/>|<w:i[^>]*>/.test(runXml) && !/<w:i[^>]*w:val="(false|0)"/.test(runXml);
  const isUnderline = /<w:u[^>]*\/>|<w:u[^>]*>/.test(runXml) && !/<w:u[^>]*w:val="none"/.test(runXml);
  const isStrike = /<w:strike[^>]*\/>|<w:strike[^>]*>/.test(runXml) && !/<w:strike[^>]*w:val="(false|0)"/.test(runXml);
  
  // Check for highlight
  const highlightMatch = runXml.match(/<w:highlight[^>]*w:val="([^"]*)"/);
  const highlight = highlightMatch ? highlightMatch[1] : null;
  
  // Check for color
  const colorMatch = runXml.match(/<w:color[^>]*w:val="([^"]*)"/);
  const color = colorMatch && colorMatch[1] !== 'auto' ? colorMatch[1] : null;
  
  // Check for font size
  const sizeMatch = runXml.match(/<w:sz[^>]*w:val="(\d+)"/);
  const size = sizeMatch ? parseInt(sizeMatch[1]) / 2 : null; // Half-points to points
  
  // Check for font family
  const fontMatch = runXml.match(/<w:rFonts[^>]*w:ascii="([^"]*)"/);
  const font = fontMatch ? fontMatch[1] : null;
  
  // Build inline styles
  const styles: string[] = [];
  if (color) styles.push(`color: #${color}`);
  if (size && size !== 11 && size !== 12) styles.push(`font-size: ${size}pt`);
  if (font) styles.push(`font-family: "${font}"`);
  
  // Map Word highlight colors to CSS
  const highlightColors: Record<string, string> = {
    'yellow': '#ffff00',
    'green': '#00ff00',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'blue': '#0000ff',
    'red': '#ff0000',
    'darkBlue': '#000080',
    'darkCyan': '#008080',
    'darkGreen': '#008000',
    'darkMagenta': '#800080',
    'darkRed': '#800000',
    'darkYellow': '#808000',
    'darkGray': '#808080',
    'lightGray': '#c0c0c0',
    'black': '#000000'
  };
  
  if (highlight && highlightColors[highlight]) {
    styles.push(`background-color: ${highlightColors[highlight]}`);
  }
  
  let result = escapeHtml(text);
  
  // Apply inline style if any
  if (styles.length > 0) {
    result = `<span style="${styles.join('; ')}">${result}</span>`;
  }
  
  // Apply formatting tags
  if (isStrike) result = `<s>${result}</s>`;
  if (isUnderline) result = `<u>${result}</u>`;
  if (isItalic) result = `<em>${result}</em>`;
  if (isBold) result = `<strong>${result}</strong>`;
  
  return result;
}

function parseTable(tableXml: string): string {
  const rows: string[] = [];
  const rowMatches = tableXml.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];
  
  let isFirstRow = true;
  
  for (const rowXml of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowXml.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/g) || [];
    
    for (const cellXml of cellMatches) {
      // Get cell properties
      const colspanMatch = cellXml.match(/<w:gridSpan[^>]*w:val="(\d+)"/);
      const colspan = colspanMatch ? ` colspan="${colspanMatch[1]}"` : '';
      
      // Parse cell content (paragraphs)
      const cellParas = cellXml.match(/<w:p[^\/]*>[\s\S]*?<\/w:p>|<w:p[^\/]*\/>/g) || [];
      const cellContent = cellParas.map(p => {
        const result = parseParagraph(p, new Map(), new Map());
        // Strip outer p tag for table cells
        const match = result.html.match(/<p[^>]*>([\s\S]*)<\/p>/);
        return match ? match[1] : result.html;
      }).join('<br>');
      
      const tag = isFirstRow ? 'th' : 'td';
      cells.push(`<${tag}${colspan}>${cellContent || '&nbsp;'}</${tag}>`);
    }
    
    rows.push(`<tr>${cells.join('')}</tr>`);
    isFirstRow = false;
  }
  
  return `<table class="document-table">${rows.join('')}</table>`;
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
        const relationshipsXml = files.get('word/_rels/document.xml.rels');
        const numberingXml = files.get('word/numbering.xml');
        
        if (documentXml) {
          const docContent = new TextDecoder().decode(documentXml);
          const relsContent = relationshipsXml ? new TextDecoder().decode(relationshipsXml) : null;
          const numContent = numberingXml ? new TextDecoder().decode(numberingXml) : null;
          content = parseDocxXml(docContent, relsContent, numContent);
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
