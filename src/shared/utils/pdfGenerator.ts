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
(${item.description.padEnd(45, ' ').slice(0, 45)}  ${item.qty.toString().padStart(3, ' ')}    ${item.rate.toFixed(2).padStart(10, ' ')}        ${item.tax}%       ${(item.rate * item.qty * (1 + item.tax / 100)).toFixed(2).padStart(12, ' ')}) Tj`,
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

  static generateInvoicePdf(invoice: {
    invoice_number: string;
    file_no?: string;
    invoice_type?: 'standard' | 'statement';
    customer_name: string;
    care_of?: string;
    contact_name?: string;
    customer_phone?: string;
    customer_email?: string;
    passenger_name?: string;
    lead_by: string;
    category?: string;
    issue_date: string;
    due_date: string;
    payment_terms: string;
    status: string;
    currency: string;
    subtotal: number;
    vat: number;
    additions?: number;
    deductions?: number;
    grand_total: number;
    paid_amount: number;
    balance_amount: number;
    remarks?: string;
    items?: Array<{
      description: string;
      nbNo?: string;
      name?: string;
      transNo?: string;
      qty: number;
      rate: number;
      tax?: number;
      netAmount?: number;
      govCost?: number;
      pro?: string;
      proComm?: number;
    }>;
    statement_entries?: Array<{
      date: string;
      details: string;
      debit: number;
      credit: number;
    }>;
    opening_balance?: number;
    options?: {
      print_header_logo?: boolean;
      include_bank_details?: boolean;
      watermark?: boolean;
    };
  }): Buffer {
    const isStatement = invoice.invoice_type === 'statement';
    const title = isStatement ? 'CUSTOMER STATEMENT VOUCHER' : 'TAX INVOICE';
    const items = invoice.items || [];
    const entries = invoice.statement_entries || [];

    const itemsSection = isStatement
      ? `
0 -20 Td
/F1 10 Tf
(Statement Entries / Ledger Breakdown:) Tj
0 -14 Td
(Date           Details                                                Debit (AED)    Credit (AED)) Tj
0 -10 Td
(------------------------------------------------------------------------------------------------------) Tj
/F2 9 Tf
${entries
  .map(
    (e) => `
0 -14 Td
(${e.date.padEnd(14, ' ')} ${e.details.padEnd(52, ' ').slice(0, 52)} ${e.debit.toFixed(2).padStart(12, ' ')}   ${e.credit.toFixed(2).padStart(12, ' ')}) Tj`,
  )
  .join('')}
`
      : `
0 -20 Td
/F1 10 Tf
(Item Description                           Ref/NB No.         Qty    Rate (AED)   Tax%    Amount (AED)) Tj
0 -10 Td
(------------------------------------------------------------------------------------------------------) Tj
/F2 9 Tf
${items
  .map(
    (item) => `
0 -14 Td
(${item.description.padEnd(34, ' ').slice(0, 34)}  ${(item.nbNo || '-').padEnd(16, ' ').slice(0, 16)}  ${item.qty.toString().padStart(3, ' ')}   ${item.rate.toFixed(2).padStart(10, ' ')}   ${(item.tax || 0).toString().padStart(3, ' ')}%   ${(item.netAmount ?? item.qty * item.rate).toFixed(2).padStart(12, ' ')}) Tj`,
  )
  .join('')}
`;

    const bankDetailsSection =
      invoice.options?.include_bank_details !== false
        ? `
0 -20 Td
/F1 9 Tf
(Bank Settlement Details:) Tj
0 -12 Td
/F2 8 Tf
(Bank: Emirates NBD | Account Name: Skyfall International Travels LLC | IBAN: AE000000000000000000000) Tj`
        : '';

    const watermarkText = invoice.options?.watermark
      ? `
0 -15 Td
/F1 10 Tf
(*** OFFICIAL SKYFALL DOCUMENT - VERIFIED & AUDITED ***) Tj`
      : '';

    const textContent = `
%PDF-1.4
1 0 obj
<< /Title (${title} - ${invoice.invoice_number})
   /Creator (Skyfall Financial & Travels ERP System v2.4.0)
   /Producer (Skyfall Invoicing Engine) >>
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
<< /Length 1800 >>
stream
BT
/F1 18 Tf
50 740 Td
(SKYFALL INTERNATIONAL TRAVELS LLC) Tj
/F2 9 Tf
0 -16 Td
(Government Visa Services, Attestation, Company Formation & Travels | Dubai, UAE) Tj
0 -12 Td
(Tel: +971 4 000 0000 | Email: accounts@skyfall.ae | TRN: 100456789000003) Tj

/F1 13 Tf
0 -26 Td
(${title}: #${invoice.invoice_number}) Tj
/F2 9 Tf
0 -15 Td
(Issue Date: ${invoice.issue_date}    |    Due Date: ${invoice.due_date}    |    Terms: ${invoice.payment_terms}    |    Status: ${invoice.status}) Tj
0 -14 Td
(Customer: ${invoice.customer_name} ${invoice.care_of ? `(C/O: ${invoice.care_of})` : ''}) Tj
0 -14 Td
(Contact: ${invoice.contact_name || invoice.customer_name}    |    Phone: ${invoice.customer_phone || 'N/A'}    |    Lead: ${invoice.lead_by}) Tj

${itemsSection}

0 -18 Td
/F1 10 Tf
(------------------------------------------------------------------------------------------------------) Tj
0 -15 Td
(SUBTOTAL:                                                                  ${invoice.currency} ${invoice.subtotal.toFixed(2)}) Tj
0 -13 Td
(VAT (5%):                                                                   ${invoice.currency} ${invoice.vat.toFixed(2)}) Tj
${(invoice.additions || 0) > 0 ? `0 -13 Td\n(ADDITIONS:                                                                  ${invoice.currency} ${(invoice.additions || 0).toFixed(2)}) Tj` : ''}
${(invoice.deductions || 0) > 0 ? `0 -13 Td\n(DEDUCTIONS:                                                                 ${invoice.currency} ${(invoice.deductions || 0).toFixed(2)}) Tj` : ''}
0 -15 Td
(GRAND TOTAL:                                                                ${invoice.currency} ${invoice.grand_total.toFixed(2)}) Tj
0 -13 Td
(PAID AMOUNT:                                                                ${invoice.currency} ${invoice.paid_amount.toFixed(2)}) Tj
0 -13 Td
(BALANCE REMAINING:                                                          ${invoice.currency} ${invoice.balance_amount.toFixed(2)}) Tj

${bankDetailsSection}
${watermarkText}

0 -25 Td
/F1 9 Tf
(Authorized Accountant / Manager: ${invoice.lead_by}) Tj
0 -12 Td
/F2 8 Tf
(Generated electronically by Skyfall ERP System v2.4.0. Valid without physical signature.) Tj
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
2400
%%EOF
    `.trim();

    return Buffer.from(textContent, 'utf-8');
  }

  static generateOfferLetterPdf(offerLetter: {
    reference_no: string;
    company_name: string;
    company_email?: string;
    employee_full_name: string;
    position: string;
    offer_date: string;
    join_by_date: string;
    monthly_salary_amount: number;
    probation_period: string;
    monthly_salary_formatted: string;
    place_of_employment: string;
    working_hours_standard: string;
    candidate_bio: {
      dob?: string;
      gender?: string;
      nationality?: string;
      passport_number: string;
      passport_issue_date?: string;
      passport_expiry_date?: string;
      passport_place_of_issue?: string;
      permanent_home_address?: string;
    };
    status: string;
    options?: {
      include_company_stamp?: boolean;
      watermark?: boolean;
    };
  }): Buffer {
    const bio = offerLetter.candidate_bio;
    const watermarkText = offerLetter.options?.watermark
      ? `
0 -15 Td
/F1 10 Tf
(*** OFFICIAL EMPLOYMENT OFFER - VERIFIED BY HR ***) Tj`
      : '';

    const textContent = `
%PDF-1.4
1 0 obj
<< /Title (Employment Offer Letter - ${offerLetter.employee_full_name})
   /Creator (Skyfall Financial & Travels ERP System v2.4.0)
   /Producer (Skyfall Offer Letter Engine) >>
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
<< /Length 2000 >>
stream
BT
/F1 18 Tf
50 740 Td
(${offerLetter.company_name.toUpperCase()}) Tj
/F2 9 Tf
0 -16 Td
(Official Corporate Employment Offer Letter | United Arab Emirates) Tj
0 -12 Td
(Email: ${offerLetter.company_email || 'hr@company.co.ae'} | Ref: ${offerLetter.reference_no} | Date: ${offerLetter.offer_date}) Tj

/F1 12 Tf
0 -26 Td
(CONFIDENTIAL EMPLOYMENT OFFER LETTER) Tj
/F2 10 Tf
0 -18 Td
(Dear ${offerLetter.employee_full_name},) Tj
0 -15 Td
(We are pleased to offer you the position of ${offerLetter.position} at ${offerLetter.company_name}.) Tj
0 -14 Td
(This offer is subject to standard UAE employment regulations, visa processing, and document verification.) Tj

0 -22 Td
/F1 10 Tf
(TERMS & REMUNERATION PACKAGE:) Tj
0 -15 Td
/F2 9 Tf
(Position / Title: ${offerLetter.position}) Tj
0 -14 Td
(Monthly Salary: ${offerLetter.monthly_salary_formatted}) Tj
0 -14 Td
(Probation Period: ${offerLetter.probation_period}) Tj
0 -14 Td
(Place of Employment: ${offerLetter.place_of_employment}) Tj
0 -14 Td
(Working Hours: ${offerLetter.working_hours_standard}) Tj
0 -14 Td
(Date of Joining (Join By): ${offerLetter.join_by_date}) Tj

0 -22 Td
/F1 10 Tf
(CANDIDATE PASSPORT & VERIFICATION PARTICULARS:) Tj
0 -15 Td
/F2 9 Tf
(Candidate Name: ${offerLetter.employee_full_name}    |    Gender: ${bio.gender || 'MALE'}    |    DOB: ${bio.dob || 'N/A'}) Tj
0 -14 Td
(Passport Number: ${bio.passport_number}    |    Nationality: ${bio.nationality || 'N/A'}    |    Place of Issue: ${bio.passport_place_of_issue || 'N/A'}) Tj
0 -14 Td
(Passport Validity: Issue: ${bio.passport_issue_date || 'N/A'}    |    Expiry: ${bio.passport_expiry_date || 'N/A'}) Tj
0 -14 Td
(Residential Address: ${bio.permanent_home_address || 'DUBAI, UAE'}) Tj

${watermarkText}

0 -30 Td
/F1 9 Tf
(FOR AND ON BEHALF OF EMPLOYER:                    CANDIDATE ACCEPTANCE:) Tj
0 -15 Td
/F2 8 Tf
(Authorized HR / General Manager                  I accept the terms and conditions outlined above.) Tj
0 -25 Td
(Signature: _________________________             Signature: _________________________) Tj
0 -14 Td
(Date: ${offerLetter.offer_date}                                 Date: ______________________________) Tj
0 -18 Td
/F2 8 Tf
(Generated electronically by Skyfall ERP System v2.4.0. Formal employment contract executed on Ministry portal.) Tj
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
2600
%%EOF
    `.trim();

    return Buffer.from(textContent, 'utf-8');
  }
}
