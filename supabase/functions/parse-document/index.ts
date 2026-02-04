import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Store for extracted images (base64)
interface ParseContext {
  images: Map<string, string>; // rId -> base64 data URL
  relationships: Map<string, { target: string; type: string }>;
  numberingFormats: Map<string, { type: string; level: number }>;
  headerContent: string;
  footerContent: string;
}

// Enhanced DOCX parser that preserves formatting
function parseDocxXml(
  documentXml: string, 
  relationshipsXml: string | null, 
  numberingXml: string | null,
  context: ParseContext
): string {
  const html: string[] = [];
  
  // Add header content if exists
  if (context.headerContent) {
    html.push(`<header class="document-header">${context.headerContent}</header>`);
  }
  
  // Parse relationships for hyperlinks and images
  if (relationshipsXml) {
    const relMatches = relationshipsXml.match(/<Relationship[^>]*>/g) || [];
    for (const rel of relMatches) {
      const idMatch = rel.match(/Id="([^"]*)"/);
      const targetMatch = rel.match(/Target="([^"]*)"/);
      const typeMatch = rel.match(/Type="[^"]*\/([^"\/]*)"/);
      if (idMatch && targetMatch) {
        context.relationships.set(idMatch[1], {
          target: targetMatch[1],
          type: typeMatch ? typeMatch[1] : 'unknown'
        });
      }
    }
  }

  // Parse numbering definitions for lists
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
            context.numberingFormats.set(`${abstractIdMatch[1]}-${lvlIdMatch[1]}`, {
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
  if (!bodyMatch) return ''; // Return empty string to signal parsing failure
  
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
      html.push(parseTable(element.content, context));
    } else {
      const paraResult = parseParagraph(element.content, context);
      
      // Check for page break
      if (paraResult.hasPageBreak) {
        if (currentListType) {
          html.push(`</${currentListType}>`);
          currentListType = null;
        }
        html.push('<hr class="page-break" />');
      }
      
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
  
  // Add footer content if exists
  if (context.footerContent) {
    html.push(`<footer class="document-footer">${context.footerContent}</footer>`);
  }
  
  return html.join('\n');
}

function parseParagraph(
  paraXml: string, 
  context: ParseContext
): { html: string; listType: string | null; hasPageBreak: boolean } {
  // Check for page break
  const hasPageBreak = /<w:br[^>]*w:type="page"/.test(paraXml);
  
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
    const fmt = context.numberingFormats.get(numFmtKey);
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
  let indentStyles: string[] = [];
  if (indentMatch) {
    const leftMatch = indentMatch[0].match(/w:left="(\d+)"/);
    const firstLineMatch = indentMatch[0].match(/w:firstLine="(\d+)"/);
    const hangingMatch = indentMatch[0].match(/w:hanging="(\d+)"/);
    if (leftMatch) {
      const twips = parseInt(leftMatch[1]);
      const px = Math.round(twips / 20); // Convert twips to pixels (rough)
      indentStyles.push(`margin-left: ${px}px`);
    }
    if (firstLineMatch) {
      const twips = parseInt(firstLineMatch[1]);
      const px = Math.round(twips / 20);
      indentStyles.push(`text-indent: ${px}px`);
    }
    if (hangingMatch) {
      const twips = parseInt(hangingMatch[1]);
      const px = Math.round(twips / 20);
      indentStyles.push(`text-indent: -${px}px`);
    }
  }
  
  // Check for line spacing
  const spacingMatch = paraXml.match(/<w:spacing[^>]*>/);
  if (spacingMatch) {
    const lineMatch = spacingMatch[0].match(/w:line="(\d+)"/);
    const beforeMatch = spacingMatch[0].match(/w:before="(\d+)"/);
    const afterMatch = spacingMatch[0].match(/w:after="(\d+)"/);
    const lineRuleMatch = spacingMatch[0].match(/w:lineRule="([^"]*)"/);
    
    if (lineMatch) {
      const value = parseInt(lineMatch[1]);
      const lineRule = lineRuleMatch ? lineRuleMatch[1] : 'auto';
      if (lineRule === 'auto') {
        // Value is in 240ths of a line
        const lineHeight = value / 240;
        indentStyles.push(`line-height: ${lineHeight.toFixed(2)}`);
      } else if (lineRule === 'exact' || lineRule === 'atLeast') {
        // Value is in twips
        const pt = value / 20;
        indentStyles.push(`line-height: ${pt}pt`);
      }
    }
    if (beforeMatch) {
      const twips = parseInt(beforeMatch[1]);
      const pt = twips / 20;
      indentStyles.push(`margin-top: ${pt}pt`);
    }
    if (afterMatch) {
      const twips = parseInt(afterMatch[1]);
      const pt = twips / 20;
      indentStyles.push(`margin-bottom: ${pt}pt`);
    }
  }
  
  // Build inline styles
  let styleAttr = '';
  if (alignment || indentStyles.length > 0) {
    const styles: string[] = [];
    if (alignment) styles.push(`text-align: ${alignment}`);
    styles.push(...indentStyles);
    styleAttr = ` style="${styles.join('; ')}"`;
  }
  
  // Extract runs (text with formatting)
  const content = parseRuns(paraXml, context);
  
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
    return { html: content, listType, hasPageBreak };
  }
  
  return { html: content ? `<${tag}${styleAttr}>${content}</${tag}>` : '', listType: null, hasPageBreak };
}

function parseRuns(paraXml: string, context: ParseContext): string {
  const parts: string[] = [];
  
  // Find hyperlinks, drawings (images), and regular runs
  const hyperlinkRegex = /<w:hyperlink[^>]*>[\s\S]*?<\/w:hyperlink>/g;
  const drawingRegex = /<w:drawing>[\s\S]*?<\/w:drawing>/g;
  const runRegex = /<w:r[^\/]*>[\s\S]*?<\/w:r>/g;
  
  // Process in order by finding all elements and sorting by index
  const allElements: { type: string; content: string; index: number }[] = [];
  
  let match: RegExpExecArray | null;
  while ((match = hyperlinkRegex.exec(paraXml)) !== null) {
    allElements.push({ type: 'hyperlink', content: match[0], index: match.index });
  }
  
  while ((match = drawingRegex.exec(paraXml)) !== null) {
    allElements.push({ type: 'drawing', content: match[0], index: match.index });
  }
  
  // Find runs that are NOT inside hyperlinks or drawings
  const processedRanges = allElements.map(e => ({ start: e.index, end: e.index + e.content.length }));
  
  let runMatch: RegExpExecArray | null;
  while ((runMatch = runRegex.exec(paraXml)) !== null) {
    const isInsideOther = processedRanges.some(
      range => runMatch!.index >= range.start && runMatch!.index < range.end
    );
    if (!isInsideOther) {
      allElements.push({ type: 'run', content: runMatch[0], index: runMatch.index });
    }
  }
  
  // Sort by position
  allElements.sort((a, b) => a.index - b.index);
  
  for (const elem of allElements) {
    if (elem.type === 'hyperlink') {
      const rIdMatch = elem.content.match(/r:id="([^"]*)"/);
      const rel = rIdMatch ? context.relationships.get(rIdMatch[1]) : null;
      const href = rel?.target || null;
      const linkRuns = elem.content.match(/<w:r[^\/]*>[\s\S]*?<\/w:r>/g) || [];
      const linkText = linkRuns.map(r => parseRun(r, context)).join('');
      
      if (href && linkText) {
        parts.push(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
      } else if (linkText) {
        parts.push(linkText);
      }
    } else if (elem.type === 'drawing') {
      // Extract image from drawing
      const embedMatch = elem.content.match(/r:embed="([^"]*)"/);
      if (embedMatch) {
        const imageData = context.images.get(embedMatch[1]);
        if (imageData) {
          // Get dimensions if available
          const cxMatch = elem.content.match(/cx="(\d+)"/);
          const cyMatch = elem.content.match(/cy="(\d+)"/);
          let styleAttr = '';
          if (cxMatch || cyMatch) {
            const styles: string[] = [];
            if (cxMatch) {
              const emuWidth = parseInt(cxMatch[1]);
              const pxWidth = Math.round(emuWidth / 914400 * 96); // EMU to pixels
              styles.push(`width: ${pxWidth}px`);
            }
            if (cyMatch) {
              const emuHeight = parseInt(cyMatch[1]);
              const pxHeight = Math.round(emuHeight / 914400 * 96);
              styles.push(`height: ${pxHeight}px`);
            }
            styleAttr = ` style="${styles.join('; ')}"`;
          }
          parts.push(`<img src="${imageData}" class="document-image"${styleAttr} />`);
        }
      }
    } else if (elem.type === 'run') {
      const runContent = parseRun(elem.content, context);
      if (runContent) parts.push(runContent);
    }
  }
  
  return parts.join('');
}

function parseRun(runXml: string, context: ParseContext): string {
  // Check for embedded image in run
  const drawingMatch = runXml.match(/<w:drawing>[\s\S]*?<\/w:drawing>/);
  if (drawingMatch) {
    const embedMatch = drawingMatch[0].match(/r:embed="([^"]*)"/);
    if (embedMatch) {
      const imageData = context.images.get(embedMatch[1]);
      if (imageData) {
        return `<img src="${imageData}" class="document-image" />`;
      }
    }
  }
  
  // Extract text
  const textMatches = runXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const text = textMatches.map(t => {
    const m = t.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
    return m ? m[1] : '';
  }).join('');
  
  // Check for break elements
  if (/<w:br[^>]*\/>/.test(runXml) && !/<w:br[^>]*w:type="page"/.test(runXml)) {
    return text + '<br/>';
  }
  
  if (!text) return '';
  
  // Check for formatting
  const isBold = /<w:b[^>]*\/>|<w:b[^>]*>/.test(runXml) && !/<w:b[^>]*w:val="(false|0)"/.test(runXml);
  const isItalic = /<w:i[^>]*\/>|<w:i[^>]*>/.test(runXml) && !/<w:i[^>]*w:val="(false|0)"/.test(runXml);
  const isUnderline = /<w:u[^>]*\/>|<w:u[^>]*>/.test(runXml) && !/<w:u[^>]*w:val="none"/.test(runXml);
  const isStrike = /<w:strike[^>]*\/>|<w:strike[^>]*>/.test(runXml) && !/<w:strike[^>]*w:val="(false|0)"/.test(runXml);
  const isSubscript = /<w:vertAlign[^>]*w:val="subscript"/.test(runXml);
  const isSuperscript = /<w:vertAlign[^>]*w:val="superscript"/.test(runXml);
  
  // Check for highlight
  const highlightMatch = runXml.match(/<w:highlight[^>]*w:val="([^"]*)"/);
  const highlight = highlightMatch ? highlightMatch[1] : null;
  
  // Check for shading (another way Word does highlighting)
  const shadingMatch = runXml.match(/<w:shd[^>]*w:fill="([^"]*)"/);
  const shading = shadingMatch && shadingMatch[1] !== 'auto' ? shadingMatch[1] : null;
  
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
  } else if (shading) {
    styles.push(`background-color: #${shading}`);
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
  if (isSubscript) result = `<sub>${result}</sub>`;
  if (isSuperscript) result = `<sup>${result}</sup>`;
  
  return result;
}

function parseTable(tableXml: string, context: ParseContext): string {
  const rows: string[] = [];
  const rowMatches = tableXml.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];
  
  let isFirstRow = true;
  
  // Check for header row indication
  const hasHeaderRow = /<w:tblHeader/.test(tableXml) || /<w:firstRow\s+w:val="(true|1)"/.test(tableXml);
  
  for (const rowXml of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowXml.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/g) || [];
    const isHeaderRow = isFirstRow && (hasHeaderRow || /<w:tblHeader/.test(rowXml));
    
    for (const cellXml of cellMatches) {
      // Get cell properties
      const colspanMatch = cellXml.match(/<w:gridSpan[^>]*w:val="(\d+)"/);
      const colspan = colspanMatch ? ` colspan="${colspanMatch[1]}"` : '';
      
      // Check for vertical merge
      const vMergeMatch = cellXml.match(/<w:vMerge[^>]*(w:val="([^"]*)")?/);
      if (vMergeMatch && !vMergeMatch[2]) {
        // This is a continuation cell, skip it
        continue;
      }
      
      // Get cell background/shading
      const cellShadingMatch = cellXml.match(/<w:shd[^>]*w:fill="([^"]*)"/);
      const cellBg = cellShadingMatch && cellShadingMatch[1] !== 'auto' ? cellShadingMatch[1] : null;
      
      // Get cell alignment
      const cellAlignMatch = cellXml.match(/<w:jc[^>]*w:val="([^"]*)"/);
      const cellAlign = cellAlignMatch ? cellAlignMatch[1] : null;
      
      let cellStyle = '';
      const cellStyles: string[] = [];
      if (cellBg) cellStyles.push(`background-color: #${cellBg}`);
      if (cellAlign) {
        const alignMap: Record<string, string> = { 'left': 'left', 'center': 'center', 'right': 'right' };
        if (alignMap[cellAlign]) cellStyles.push(`text-align: ${alignMap[cellAlign]}`);
      }
      if (cellStyles.length > 0) cellStyle = ` style="${cellStyles.join('; ')}"`;
      
      // Parse cell content (paragraphs)
      const cellParas = cellXml.match(/<w:p[^\/]*>[\s\S]*?<\/w:p>|<w:p[^\/]*\/>/g) || [];
      const cellContent = cellParas.map(p => {
        const result = parseParagraph(p, context);
        // Strip outer p tag for table cells
        const match = result.html.match(/<p[^>]*>([\s\S]*)<\/p>/);
        return match ? match[1] : result.html;
      }).join('<br>');
      
      const tag = isHeaderRow ? 'th' : 'td';
      cells.push(`<${tag}${colspan}${cellStyle}>${cellContent || '&nbsp;'}</${tag}>`);
    }
    
    if (cells.length > 0) {
      rows.push(`<tr>${cells.join('')}</tr>`);
    }
    isFirstRow = false;
  }
  
  return `<table class="document-table">${rows.join('')}</table>`;
}

// Parse header/footer XML
function parseHeaderFooter(xml: string, context: ParseContext): string {
  const paras = xml.match(/<w:p[^\/]*>[\s\S]*?<\/w:p>|<w:p[^\/]*\/>/g) || [];
  const content = paras.map(p => {
    const result = parseParagraph(p, context);
    return result.html;
  }).filter(h => h.trim()).join('\n');
  return content;
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

// Get MIME type from file extension
function getMimeTypeFromExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'emf': 'image/x-emf',
    'wmf': 'image/x-wmf',
  };
  return mimeTypes[ext] || 'image/png';
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

    // Determine file type - distinguish between .doc (legacy) and .docx (modern)
    const isDocx = lowerPath.endsWith('.docx') || lowerMimeType.includes('wordprocessingml');
    const isLegacyDoc = (lowerPath.endsWith('.doc') && !lowerPath.endsWith('.docx')) || 
                        (lowerMimeType.includes('msword') && !lowerMimeType.includes('wordprocessingml'));

    // Handle DOCX files (modern XML-based format)
    if (isDocx) {
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const files = await unzipFile(arrayBuffer);
        
        // Initialize context
        const context: ParseContext = {
          images: new Map(),
          relationships: new Map(),
          numberingFormats: new Map(),
          headerContent: '',
          footerContent: ''
        };
        
        // Extract images from word/media/
        for (const [filename, data] of files.entries()) {
          if (filename.startsWith('word/media/')) {
            // Get rId for this image from relationships
            const imageName = filename.replace('word/media/', '');
            const mimeType = getMimeTypeFromExt(imageName);
            
            // Convert to base64
            const base64 = btoa(String.fromCharCode(...data));
            const dataUrl = `data:${mimeType};base64,${base64}`;
            
            // We'll map by filename since we need to match with relationships later
            context.images.set(imageName, dataUrl);
          }
        }
        
        // Parse relationships to map rIds to image filenames
        const relationshipsXml = files.get('word/_rels/document.xml.rels');
        if (relationshipsXml) {
          const relsContent = new TextDecoder().decode(relationshipsXml);
          const relMatches = relsContent.match(/<Relationship[^>]*>/g) || [];
          for (const rel of relMatches) {
            const idMatch = rel.match(/Id="([^"]*)"/);
            const targetMatch = rel.match(/Target="([^"]*)"/);
            const typeMatch = rel.match(/Type="[^"]*\/([^"\/]*)"/);
            if (idMatch && targetMatch) {
              const target = targetMatch[1].replace('media/', '');
              if (typeMatch && typeMatch[1] === 'image') {
                const imageData = context.images.get(target);
                if (imageData) {
                  context.images.set(idMatch[1], imageData);
                }
              }
            }
          }
        }
        
        // Parse header
        const header1Data = files.get('word/header1.xml');
        if (header1Data) {
          const headerXml = new TextDecoder().decode(header1Data);
          context.headerContent = parseHeaderFooter(headerXml, context);
        }
        
        // Parse footer
        const footer1Data = files.get('word/footer1.xml');
        if (footer1Data) {
          const footerXml = new TextDecoder().decode(footer1Data);
          context.footerContent = parseHeaderFooter(footerXml, context);
        }
        
        const documentXml = files.get('word/document.xml');
        const numberingXml = files.get('word/numbering.xml');
        
        if (documentXml) {
          const docContent = new TextDecoder().decode(documentXml);
          const relsContent = relationshipsXml ? new TextDecoder().decode(relationshipsXml) : null;
          const numContent = numberingXml ? new TextDecoder().decode(numberingXml) : null;
          content = parseDocxXml(docContent, relsContent, numContent, context);
          // Check if parsing returned empty/failed
          if (!content || content.trim() === '') {
            content = ''; // Ensure it's empty string for detection
          }
        } else {
          content = ''; // Return empty for detection
        }
      } catch (e) {
        console.error("DOCX parsing error:", e);
        content = ''; // Return empty on error
      }
    }
    // Handle legacy DOC files
    else if (isLegacyDoc) {
      content = '<p><strong>Legacy .doc format detected.</strong></p><p>This file uses the older Microsoft Word binary format which cannot be directly edited in the browser.</p><p>To edit this document:</p><ol><li>Download the original file</li><li>Open it in Microsoft Word or Google Docs</li><li>Save it as .docx format</li><li>Re-upload the .docx file</li></ol>';
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
          content = ''; // Return empty for detection
        }
      } catch (e) {
        console.error("XLSX parsing error:", e);
        content = ''; // Return empty on error
      }
    }
    // Legacy DOC files are now handled above with isLegacyDoc check
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
