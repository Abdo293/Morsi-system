/**
 * Isolated Print Engine
 * Renders documents into an isolated hidden iframe with exact page dimensions
 * and print styles. Avoids printing the main app UI and eliminates styling bugs.
 */

export interface PrintOptions {
  title?: string;
  pageStyle?: string;
  extraCss?: string;
}

export function printHtmlDocument(htmlContent: string, options: PrintOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const title = options.title || "طباعة المستند";
      const pageStyle = options.pageStyle || "@page { size: auto; margin: 0; }";
      const extraCss = options.extraCss || "";

      // Remove any lingering print iframes
      const existingIframe = document.getElementById("morsi-print-iframe");
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "morsi-print-iframe";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        iframe.remove();
        throw new Error("تعذر إنشاء نافذة الطباعة");
      }

      iframeDoc.open();
      iframeDoc.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    ${pageStyle}
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background: #ffffff !important;
      color: #000000 !important;
      direction: rtl;
      font-family: 'Cairo', 'Segoe UI', Arial, sans-serif;
      text-align: right;
    }
    img {
      max-width: 100%;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    ${extraCss}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`);
      iframeDoc.close();

      const win = iframe.contentWindow;
      if (!win) {
        iframe.remove();
        throw new Error("تعذر الوصول لنافذة الطباعة");
      }

      const triggerPrint = () => {
        try {
          win.focus();
          win.print();
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              iframe.remove();
            }
          }, 2000);
        }
      };

      // Wait for images and fonts to load inside iframe
      const images = Array.from(iframeDoc.images);
      const imgPromises = images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((imgResolve) => {
          img.onload = () => imgResolve();
          img.onerror = () => imgResolve();
        });
      });

      Promise.all(imgPromises).then(() => {
        if (iframeDoc.fonts && typeof iframeDoc.fonts.ready !== "undefined") {
          iframeDoc.fonts.ready.then(() => setTimeout(triggerPrint, 150));
        } else {
          setTimeout(triggerPrint, 250);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Print a thermal receipt (80mm or 58mm) in an isolated context
 */
export function printReceiptHtml(receiptNode: HTMLElement, paperSize: "80mm" | "58mm" = "80mm"): Promise<void> {
  const is58mm = paperSize === "58mm";
  const rollWidth = is58mm ? "58mm" : "80mm";
  const cardWidth = is58mm ? "48mm" : "72mm";

  const pageStyle = `@page {
    size: ${rollWidth} auto;
    margin: 0;
  }`;

  const extraCss = `
    body {
      padding: 0;
      margin: 0;
      display: flex;
      justify-content: center;
    }
    .thermal-receipt-card {
      width: ${cardWidth} !important;
      max-width: ${cardWidth} !important;
      padding: ${is58mm ? "2mm 1mm 1.5mm" : "3mm 2mm 2mm"} !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      overflow: visible !important;
      font-size: ${is58mm ? "11px" : "12px"} !important;
      line-height: 1.35 !important;
      color: #000 !important;
    }
    .thermal-receipt-header {
      text-align: center;
      margin-bottom: 6px;
    }
    .thermal-receipt-logo {
      max-height: ${is58mm ? "70px" : "95px"} !important;
      max-width: ${is58mm ? "190px" : "260px"} !important;
      object-fit: contain;
      margin: 0 auto 6px;
      display: block;
      filter: grayscale(100%) contrast(160%);
    }
    .thermal-receipt-title {
      font-size: 16px;
      font-weight: 900;
      margin: 2px 0;
      color: #000;
      text-align: center;
    }
    .thermal-receipt-address {
      font-size: 11.5px;
      font-weight: 700;
      color: #000;
      text-align: center;
      margin: 2px 0 3px;
    }
    .thermal-receipt-contacts {
      font-size: 10.5px;
      color: #000;
      margin: 2px 0 3px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: center;
    }
    .thermal-receipt-contacts-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 4px;
    }
    .thermal-receipt-contacts-row span {
      font-weight: 600;
    }
    .thermal-receipt-contacts-row strong {
      font-weight: 800;
      letter-spacing: 0.3px;
    }
    .thermal-receipt-divider-double {
      border-bottom: 2px dashed #000;
      margin: 5px 0;
    }
    .thermal-receipt-divider {
      border-bottom: 1px dashed #444;
      margin: 5px 0;
    }
    .thermal-receipt-meta {
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: #000;
      margin-bottom: 4px;
    }
    .thermal-receipt-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .thermal-receipt-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
      margin: 5px 0;
    }
    .thermal-receipt-table th {
      border-bottom: 1px dashed #000;
      padding: 3px 2px;
      font-weight: 800;
      font-size: 10.5px;
      color: #000;
    }
    .thermal-receipt-table td {
      border: none;
      padding: 3px 2px;
      vertical-align: top;
      color: #000;
    }
    .thermal-receipt-table tr:not(:last-child) td {
      border-bottom: 1px dotted #aaa;
    }
    .thermal-receipt-totals {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
      margin: 4px 0;
    }
    .thermal-receipt-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .thermal-receipt-grand-box {
      border: 2px solid #000;
      padding: 5px 6px;
      margin: 5px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 900;
      font-size: 14px;
      background: #fff;
    }
    .thermal-receipt-barcode {
      text-align: center;
      margin: 8px 0 4px;
    }
    .thermal-receipt-footer {
      text-align: center;
      margin-top: 6px;
      padding-top: 4px;
    }
    .thermal-receipt-social-grid {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 10px;
      margin-top: 4px;
    }
    .thermal-receipt-social-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
  `;

  // Clone node and strip buttons or controls if any
  const clone = receiptNode.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".print-hide, button, input, select").forEach((el) => el.remove());

  return printHtmlDocument(clone.outerHTML, {
    title: "فاتورة كاشير - MORSI FOR BELT",
    pageStyle,
    extraCss,
  });
}

/**
 * Print an A4 report or document (Sales report, Inventory audit, Employee sheet, Refund slip)
 */
export function printReportHtml(reportNode: HTMLElement, reportTitle: string): Promise<void> {
  const pageStyle = `@page {
    size: A4 portrait;
    margin: 12mm 10mm;
  }`;

  const extraCss = `
    body {
      padding: 0;
      font-size: 12px;
      color: #000;
    }
    .report-print-container {
      width: 100%;
    }
    .report-print-header {
      text-align: center;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 2px solid #333;
    }
    .report-print-header h1 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 800;
    }
    .report-print-header .report-meta {
      font-size: 12px;
      color: #555;
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 12px 0 !important;
      font-size: 11px !important;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      border: 1px solid #333 !important;
      padding: 6px 8px !important;
      text-align: right !important;
      color: #000 !important;
    }
    th {
      background-color: #f2ede7 !important;
      font-weight: 800 !important;
    }
    .table-wrap {
      overflow: visible !important;
      max-height: none !important;
    }
    .panel {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .print-only-header {
      display: block !important;
      text-align: center;
      margin-bottom: 14px;
    }
    .invoice-details-grid {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 8px !important;
      margin-bottom: 12px !important;
      border: 1px solid #ddd;
      padding: 10px;
      border-radius: 6px;
      background: #faf8f6 !important;
    }
    .invoice-details-grid div small {
      display: block;
      color: #666;
      font-size: 11px;
    }
    .invoice-details-grid div strong {
      font-size: 13px;
      color: #000;
    }
    .sheet-totals, .sales-report-summary-card {
      border: 1px solid #333 !important;
      padding: 8px 12px !important;
      margin: 10px 0 !important;
      background: #faf8f6 !important;
      page-break-inside: avoid;
    }
    .pill {
      border: 1px solid #555 !important;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-block;
    }
  `;

  const clone = reportNode.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".print-hide, .variant-picker-overlay, button, input, select, textarea, .staff-filters").forEach((el) => el.remove());
  clone.querySelectorAll<HTMLElement>(".print-only-header").forEach((el) => {
    el.style.display = "block";
  });
  clone.querySelectorAll<HTMLElement>(".table-wrap").forEach((el) => {
    el.style.overflow = "visible";
    el.style.maxHeight = "none";
  });

  const headerHtml = `
    <div class="report-print-header">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-weight:900;font-size:14px;letter-spacing:1px;">MORSI FOR BELT</span>
        <span style="font-size:11px;color:#666;">نظام إدارة المبيعات والمخزون</span>
      </div>
      <h1>${reportTitle}</h1>
      <div class="report-meta">
        <span>تاريخ الطباعة: ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" })} - ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
        <span>المتجر: طنطا - شارع القنطرة</span>
      </div>
    </div>
  `;

  return printHtmlDocument(`
    <div class="report-print-container">
      ${headerHtml}
      ${clone.innerHTML}
    </div>
  `, {
    title: `${reportTitle} - MORSI FOR BELT`,
    pageStyle,
    extraCss,
  });
}

/**
 * Print thermal barcode stickers
 */
export function printBarcodeStickersHtml(
  stickersContainer: HTMLElement,
  labelSize: "compact" | "standard" | "large"
): Promise<void> {
  const dimensions = labelSize === "compact"
    ? { width: 40, height: 25 }
    : labelSize === "standard"
    ? { width: 50, height: 30 }
    : { width: 60, height: 40 };

  const pageStyle = `@page {
    size: ${dimensions.width}mm ${dimensions.height}mm;
    margin: 0;
  }`;

  const extraCss = `
    html, body {
      margin: 0;
      padding: 0;
      width: ${dimensions.width}mm;
    }
    .barcode-stickers-grid {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .barcode-label-card {
      width: ${dimensions.width}mm !important;
      height: ${dimensions.height}mm !important;
      max-width: ${dimensions.width}mm !important;
      max-height: ${dimensions.height}mm !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: ${labelSize === "compact" ? "1mm" : "1.5mm"} !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      text-align: center !important;
      background: #fff !important;
      color: #000 !important;
    }
    .barcode-label-inner {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 1px;
      overflow: hidden;
    }
    .barcode-label-name {
      font-size: ${labelSize === "compact" ? "10.5px" : labelSize === "standard" ? "12.5px" : "15px"};
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      margin: 0;
      line-height: 1.15;
    }
    .barcode-label-variant {
      font-size: ${labelSize === "compact" ? "8.5px" : labelSize === "standard" ? "10px" : "11.5px"};
      color: #222;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      line-height: 1.1;
    }
    .barcode-variant-sep {
      margin: 0 2px;
      font-weight: bold;
    }
    .barcode-label-loc {
      font-size: ${labelSize === "compact" ? "8.5px" : labelSize === "standard" ? "9.5px" : "11px"};
      color: #444;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      line-height: 1.1;
    }
    .barcode-label-svg-wrap {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 1px 0;
    }
    .barcode-label-svg-wrap svg {
      width: 92% !important;
      max-width: 95% !important;
      height: ${labelSize === "compact" ? "38px" : labelSize === "standard" ? "52px" : "72px"} !important;
      display: block;
      margin: 0 auto !important;
    }
    .barcode-label-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${labelSize === "compact" ? "10px" : labelSize === "standard" ? "12px" : "15px"};
      font-weight: 900;
      letter-spacing: 1.2px;
      line-height: 1;
      margin-top: 1px;
    }
    .barcode-label-price {
      font-size: ${labelSize === "compact" ? "12.5px" : labelSize === "standard" ? "15px" : "18px"};
      font-weight: 900;
      line-height: 1.15;
      margin: 0;
    }
  `;

  const clone = stickersContainer.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".print-hide").forEach((el) => el.remove());

  return printHtmlDocument(clone.outerHTML, {
    title: "طباعة باركود - MORSI FOR BELT",
    pageStyle,
    extraCss,
  });
}
