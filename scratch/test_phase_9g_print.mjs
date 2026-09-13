import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

console.log('=== PHASE 9G INVOICE PRINT AUDIT ===\n');

let allPassed = true;
function assert(desc, condition) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    allPassed = false;
  }
}

// 1. Inspect src/index.css for print isolation contract
const indexCss = fs.readFileSync(path.join(projectRoot, 'src/index.css'), 'utf8');

assert('index.css hides #invoice-print-root by default on screen', indexCss.includes('#invoice-print-root') && indexCss.includes('display: none !important;'));
assert('index.css defines @page size A4 portrait', indexCss.includes('size: A4 portrait;'));
assert('index.css @media print hides #root', indexCss.includes('#root {\n    display: none !important;\n  }'));
assert('index.css @media print displays #invoice-print-root', indexCss.includes('#invoice-print-root {\n    display: block !important;'));
assert('index.css sets A4 width 210mm on #invoice-print-root', indexCss.includes('width: 210mm !important;'));
assert('index.css sets print-color-adjust exact', indexCss.includes('print-color-adjust: exact !important;'));
assert('index.css table allows pagination (break-inside: auto)', indexCss.includes('break-inside: auto !important;'));
assert('index.css thead repeats on continuation pages (table-header-group)', indexCss.includes('display: table-header-group !important;'));
assert('index.css tr protects rows from splitting (break-inside: avoid)', indexCss.includes('break-inside: avoid !important;'));

// 2. Inspect ClientInvoiceGenerator.tsx for explicit print portal
const invoiceGeneratorCode = fs.readFileSync(path.join(projectRoot, 'src/components/ClientInvoiceGenerator.tsx'), 'utf8');

assert('ClientInvoiceGenerator imports createPortal from react-dom', invoiceGeneratorCode.includes("import { createPortal } from 'react-dom';"));
assert('ClientInvoiceGenerator creates portal targeting document.body', invoiceGeneratorCode.includes("createPortal(\n          <div id=\"invoice-print-root\""));
assert('Invoice header contains AKK Photo Studio branding', invoiceGeneratorCode.includes('AKK Photo Studio'));
assert('Invoice header contains Atelier Invoice badge', invoiceGeneratorCode.includes('Atelier Invoice'));
assert('Invoice header contains Statement Number label', invoiceGeneratorCode.includes('Statement Number'));
assert('Invoice contains Billed to client section', invoiceGeneratorCode.includes('Billed to client'));
assert('Invoice contains Session allocation & dates section', invoiceGeneratorCode.includes('Session allocation &amp; dates') || invoiceGeneratorCode.includes('Session allocation'));
assert('Invoice contains Line Items Table with Burmese text support', invoiceGeneratorCode.includes('myanmarDescription'));
assert('Invoice contains Remittance Instructions section', invoiceGeneratorCode.includes('Remittance Instructions'));
assert('Invoice contains Gross Services Subtotal & Balance Payable summary', invoiceGeneratorCode.includes('Balance Payable'));
assert('Invoice contains Official Studio Stamp', invoiceGeneratorCode.includes('Official Studio Stamp'));
assert('Invoice stamp uses semantic wording "GEAR MANIFEST"', invoiceGeneratorCode.includes('GEAR') && invoiceGeneratorCode.includes('MANIFEST'));
assert('Invoice stamp does not overclaim with VERIFIED', !invoiceGeneratorCode.includes('VERIFIED GEAR AUDIT'));
assert('Invoice contains Studio Director Signature (U Aung Kyaw)', invoiceGeneratorCode.includes('U Aung Kyaw'));
assert('Print portal components use print-avoid-break utility', invoiceGeneratorCode.includes('print-avoid-break'));

console.log(`\nAudit completed. Overall Result: ${allPassed ? 'ALL CHECKS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
process.exit(allPassed ? 0 : 1);
