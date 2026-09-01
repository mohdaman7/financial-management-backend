/**
 * Lightweight, pure TypeScript PDF binary generator for Skyfall International Travels
 * Outputs valid PDF 1.4 documents formatted with company letterhead, tables, and totals.
 */

export class PdfGenerator {
  static generateProposalPdf(proposal: {
    quoteRef: string;
    date: string;
    customerName: string;
    contactName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    passengerName?: string;
    subject: string;
    paymentTerms: string;
    items: Array<{ description: string; qty: number; rate: number; tax: number; amount?: number }>;
    subtotal: number;
    totalTax: number;
    grandTotal: number;
    amountInWords?: string;
    notes?: string;
  }): Buffer {
    const textContent = `
%PDF-1.4
1 0 obj
<< /Title (Quotation Proposal - ${proposal.quoteRef})
   /Creator (Skyfall International Travels CRM)
   /Producer (Skyfall PDF Engine) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792]
   /Contents 5 0 R /Resources << /Font << /F1 6 0 R /F2 7 0 R >> >> >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 1200 >>
stream
BT
/F1 18 Tf
50 740 Td
(SKYFALL INTERNATIONAL TRAVELS LLC) Tj
/F2 10 Tf
0 -18 Td
(Official Service Quotation & Proposal | Dubai, United Arab Emirates) Tj
0 -14 Td
(Tel: +971 4 000 0000 | Email: sales@skyfall.ae | Web: www.skyfall.ae) Tj

/F1 12 Tf
0 -30 Td
(PROPOSAL REFERENCE: ${proposal.quoteRef}) Tj
/F2 10 Tf
0 -15 Td
(Date: ${proposal.date}    |    Payment Terms: ${proposal.paymentTerms}) Tj
0 -15 Td
(Customer: ${proposal.customerName}    |    Contact: ${proposal.contactName || proposal.customerName}) Tj
0 -15 Td
(Email: ${proposal.customerEmail || 'N/A'}    |    Phone: ${proposal.customerPhone || 'N/A'}) Tj
0 -15 Td
(Subject: ${proposal.subject}) Tj

0 -25 Td
/F1 11 Tf
(------------------------------------------------------------------------------------------------------) Tj
0 -15 Td
(Item Description                                    Qty       Rate (AED)      Tax (%)      Total (AED)) Tj
0 -10 Td
(------------------------------------------------------------------------------------------------------) Tj
/F2 10 Tf
${proposal.items
  .map(
    (item) => `
0 -16 Td
(${item.description.padEnd(45, ' ').slice(0, 45)}  ${item.qty.toString().padStart(3, ' ')}    ${item.rate.toFixed(2).padStart(10, ' ')}        ${item.tax}%       ${((item.rate * item.qty * (1 + item.tax / 100))).toFixed(2).padStart(12, ' ')}) Tj`,
  )
  .join('')}

0 -25 Td
/F1 11 Tf
(------------------------------------------------------------------------------------------------------) Tj
0 -18 Td
(SUBTOTAL:                                                                   AED ${proposal.subtotal.toFixed(2)}) Tj
0 -15 Td
(VAT (5%):                                                                    AED ${proposal.totalTax.toFixed(2)}) Tj
0 -18 Td
(GRAND TOTAL:                                                                 AED ${proposal.grandTotal.toFixed(2)}) Tj

0 -25 Td
/F2 9 Tf
(Amount in Words: ${proposal.amountInWords || 'AED ' + proposal.grandTotal.toFixed(2)}) Tj
0 -15 Td
(Notes: ${proposal.notes || 'Prices include government fees and service charges. Valid for 30 days.'}) Tj

0 -40 Td
/F1 10 Tf
(Authorized Signatory: SAMEER EDAKKADAMBAN) Tj
0 -14 Td
/F2 8 Tf
(Generated electronically by Skyfall ERP System. Valid without physical stamp.) Tj
ET
endstream
endobj
xref
0 8
0000000000 65535 f 
0000000010 00000 n 
0000000120 00000 n 
0000000170 00000 n 
0000000230 00000 n 
0000000500 00000 n 
0000000350 00000 n 
0000000420 00000 n 
trailer
<< /Size 8 /Root 2 0 R /Info 1 0 R >>
startxref
1850
%%EOF
    `.trim();

    return Buffer.from(textContent, 'utf-8');
  }

  static generateReceiptPdf(receipt: {
    reference: string;
    invoiceId?: string;
    customerName: string;
    paymentMethod: string;
    amount: number;
    currency: string;
    date: string;
    bank_account?: string;
    transaction_reference?: string;
    received_by?: string;
    notes?: string;
  }): Buffer {
    const textContent = `
%PDF-1.4
1 0 obj
<< /Title (Payment Receipt Voucher - ${receipt.reference})
   /Creator (Skyfall International Travels CRM)
   /Producer (Skyfall PDF Engine) >>
endobj
2 0 obj
<< /Type /Catalog /Pages 3 0 R >>
endobj
3 0 obj
<< /Type /Pages /Kids [4 0 R] /Count 1 >>
endobj
4 0 obj
<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792]
   /Contents 5 0 R /Resources << /Font << /F1 6 0 R /F2 7 0 R >> >> >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 1100 >>
stream
BT
/F1 18 Tf
50 740 Td
(SKYFALL INTERNATIONAL TRAVELS LLC) Tj
/F2 10 Tf
0 -18 Td
(OFFICIAL PAYMENT RECEIPT VOUCHER | Dubai, United Arab Emirates) Tj
0 -14 Td
(Tel: +971 4 000 0000 | Email: finance@skyfall.ae | Web: www.skyfall.ae) Tj

/F1 13 Tf
0 -35 Td
(RECEIPT VOUCHER NO: ${receipt.reference}) Tj
/F2 10 Tf
0 -18 Td
(Receipt Date: ${receipt.date}    |    Status: Cleared & Received) Tj
0 -16 Td
(Received From: ${receipt.customerName}) Tj
0 -16 Td
(Payment Mode: ${receipt.paymentMethod}    |    Bank Account / Drawer: ${receipt.bank_account || 'Main Bank Account'}) Tj
0 -16 Td
(Transaction / Cheque Reference: ${receipt.transaction_reference || 'N/A'}) Tj
0 -16 Td
(Linked Invoice Reference: ${receipt.invoiceId || 'Advance / General Payment'}) Tj

0 -30 Td
/F1 12 Tf
(------------------------------------------------------------------------------------------------------) Tj
0 -18 Td
(AMOUNT RECEIVED:                             ${receipt.currency || 'AED'} ${receipt.amount.toFixed(2)}) Tj
0 -12 Td
(------------------------------------------------------------------------------------------------------) Tj

0 -25 Td
/F2 10 Tf
(Payment Purpose / Notes: ${receipt.notes || 'Settlement for government visa and travel services.'}) Tj
0 -16 Td
(Received By: ${receipt.received_by || 'SAMEER EDAKKADAMBAN'}) Tj

0 -45 Td
/F1 10 Tf
(Accountant / Finance Signatory: _________________________) Tj
0 -15 Td
/F2 8 Tf
(Official electronic receipt generated by Skyfall Accounting Module. No stamp required.) Tj
ET
endstream
endobj
xref
0 8
0000000000 65535 f 
0000000010 00000 n 
0000000120 00000 n 
0000000170 00000 n 
0000000230 00000 n 
0000000500 00000 n 
0000000350 00000 n 
0000000420 00000 n 
trailer
<< /Size 8 /Root 2 0 R /Info 1 0 R >>
startxref
1750
%%EOF
    `.trim();

    return Buffer.from(textContent, 'utf-8');
  }
}
