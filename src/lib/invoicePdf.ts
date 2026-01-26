import { jsPDF } from "jspdf";

export type InvoicePdfSettings = {
  business_name?: string | null;
  business_address?: string | null;
  business_email?: string | null;
  business_phone?: string | null;
  business_website?: string | null;
  tax_label?: string | null;
  tax_number?: string | null;
  currency?: string | null;
};

export type InvoicePdfCustomer = {
  company_name?: string | null;
  contact_name?: string | null;
  address?: string | null;
  email?: string | null;
};

export type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

export type InvoicePdfInvoice = {
  invoice_number: string;
  invoice_date?: string | null;
  created_at?: string | null;
  due_date?: string | null;
  amount_due: number; // cents
  amount_paid?: number | null; // cents
  customer?: InvoicePdfCustomer | null;
  line_items?: InvoicePdfLineItem[] | null;
};

const currencySymbols: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CAD: "C$",
  AUD: "A$",
};

function formatCurrency(amount: number, currency = "GBP", fromCents = false): string {
  const value = fromCents ? amount / 100 : amount;
  const symbol = currencySymbols[currency] || currency + " ";
  return `${symbol}${value.toFixed(2)}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB");
}

export function generateInvoicePdfBase64(params: {
  invoice: InvoicePdfInvoice;
  settings?: InvoicePdfSettings | null;
  organizationName?: string | null;
}): string {
  const { invoice, settings, organizationName } = params;

  const businessName =
    settings?.business_name?.trim() ||
    organizationName?.trim() ||
    "Invoice";

  const currency = settings?.currency || "GBP";
  const taxLabel = settings?.tax_label || "VAT";

  const customer = invoice.customer || {};
  const items = invoice.line_items || [];

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(businessName, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const rightX = pageWidth - margin;
  const headerY = y;

  // Right-aligned invoice meta
  const invoiceDate = formatDate(invoice.invoice_date || invoice.created_at);
  const dueDate = formatDate(invoice.due_date);

  const metaLines: string[] = [
    `Invoice: ${invoice.invoice_number}`,
    invoiceDate ? `Date: ${invoiceDate}` : "",
    dueDate ? `Due: ${dueDate}` : "",
  ].filter(Boolean);

  metaLines.forEach((line, idx) => {
    doc.text(line, rightX, headerY + idx * 14, { align: "right" });
  });

  y += 28;

  // Business address block
  const businessAddressLines = (settings?.business_address || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (businessAddressLines.length) {
    doc.setTextColor(80);
    businessAddressLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 12;
    });
    doc.setTextColor(0);
  }

  if (settings?.tax_number) {
    doc.setTextColor(80);
    doc.text(`${taxLabel}: ${settings.tax_number}`, margin, y);
    doc.setTextColor(0);
    y += 14;
  }

  y += 10;
  ensureSpace(80);

  // Customer block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Bill To", margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const customerName = customer.contact_name || customer.company_name || "";
  const customerCompany = customer.company_name || "";

  const customerLines: string[] = [
    customerName,
    customerCompany && customerCompany !== customerName ? customerCompany : "",
    ...(customer.address || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    customer.email || "",
  ].filter(Boolean);

  customerLines.forEach((line) => {
    ensureSpace(14);
    doc.text(line, margin, y);
    y += 12;
  });

  y += 14;
  ensureSpace(140);

  // Table
  const colDesc = margin;
  const colQty = margin + contentWidth * 0.62;
  const colRate = margin + contentWidth * 0.74;
  const colAmt = margin + contentWidth;

  const headerHeight = 18;

  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Description", colDesc, y);
  doc.text("Qty", colQty, y, { align: "right" });
  doc.text("Rate", colRate, y, { align: "right" });
  doc.text("Amount", colAmt, y, { align: "right" });

  y += headerHeight;
  doc.setFont("helvetica", "normal");

  const lineHeight = 12;
  const maxDescWidth = colQty - colDesc - 12;

  if (!items.length) {
    doc.setTextColor(120);
    doc.text("No line items", margin, y);
    doc.setTextColor(0);
    y += 18;
  } else {
    for (const item of items) {
      const descLines = doc.splitTextToSize(item.description || "", maxDescWidth) as string[];
      const rowHeight = Math.max(descLines.length * lineHeight, lineHeight) + 6;

      ensureSpace(rowHeight + 8);

      // Description
      descLines.forEach((dl, i) => {
        doc.text(dl, colDesc, y + i * lineHeight);
      });

      // Numbers (align to first line)
      const baseLineY = y;
      doc.text(String(item.quantity ?? ""), colQty, baseLineY, { align: "right" });
      doc.text(formatCurrency(item.rate ?? 0, currency, false), colRate, baseLineY, { align: "right" });
      doc.text(formatCurrency(item.amount ?? 0, currency, false), colAmt, baseLineY, { align: "right" });

      y += rowHeight;
      doc.setDrawColor(235);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }
  }

  // Totals
  ensureSpace(80);

  const total = invoice.amount_due ?? 0;
  const paid = invoice.amount_paid ?? 0;
  const balance = total - paid;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  const labelX = margin + contentWidth * 0.65;
  doc.text("Total", labelX, y);
  doc.text(formatCurrency(total, currency, true), colAmt, y, { align: "right" });
  y += 16;

  if (paid > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Paid", labelX, y);
    doc.text(`-${formatCurrency(paid, currency, true)}`, colAmt, y, { align: "right" });
    doc.setTextColor(0);
    y += 14;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Balance Due", labelX, y);
  doc.text(formatCurrency(balance, currency, true), colAmt, y, { align: "right" });

  // Output base64 (no data-uri prefix)
  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1];
  if (!base64) {
    throw new Error("Failed to generate PDF data.");
  }
  return base64;
}
