import { FifoAllocationEngine, FifoInvoiceInput, FifoReceiptInput } from '../src/shared/utils/fifoAllocationEngine';

describe('FifoAllocationEngine', () => {
  it('should correctly calculate starting due with advance_paid', () => {
    const invoices: FifoInvoiceInput[] = [
      {
        id: 'inv-1',
        mongoId: '6a99e4da7f03691937a3f941',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 3000,
        advancePaid: 500,
        date: '2026-09-01',
        createdAt: new Date('2026-09-01'),
      },
    ];

    const result = FifoAllocationEngine.calculate(invoices, []);
    const inv1Alloc = result.invoiceAllocations.get('inv-1')!;

    expect(inv1Alloc.paid).toBe(500);
    expect(inv1Alloc.remaining).toBe(2500);
    expect(inv1Alloc.status).toBe('Partially Paid');
    expect(inv1Alloc.advancePaid).toBe(500);
  });

  it('should allocate receipts in FIFO order across invoices', () => {
    const invoices: FifoInvoiceInput[] = [
      {
        id: 'inv-1',
        mongoId: '6a99e4da7f03691937a3f941',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 1000,
        advancePaid: 200, // starting due: 800
        date: '2026-09-01',
        createdAt: new Date('2026-09-01'),
      },
      {
        id: 'inv-2',
        mongoId: '6a99e4da7f03691937a3f942',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 2000,
        advancePaid: 0, // starting due: 2000
        date: '2026-09-02',
        createdAt: new Date('2026-09-02'),
      },
    ];

    const receipts: FifoReceiptInput[] = [
      {
        id: 'rec-1',
        mongoId: '6a99e4da7f03691937a3f943',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        amount: 1000, // 800 to inv-1 (fully pays it), 200 to inv-2
        date: '2026-09-03',
        createdAt: new Date('2026-09-03'),
      },
    ];

    const result = FifoAllocationEngine.calculate(invoices, receipts);

    const inv1 = result.invoiceAllocations.get('inv-1')!;
    expect(inv1.paid).toBe(1000);
    expect(inv1.remaining).toBe(0);
    expect(inv1.status).toBe('Paid');

    const inv2 = result.invoiceAllocations.get('inv-2')!;
    expect(inv2.paid).toBe(200);
    expect(inv2.remaining).toBe(1800);
    expect(inv2.status).toBe('Partially Paid');

    const rec1 = result.receiptAllocations.get('rec-1')!;
    expect(rec1.allocated).toBe(1000);
    expect(rec1.unallocated).toBe(0);
  });

  it('should handle excess advance payment as customer credit and apply to next invoice', () => {
    const invoices: FifoInvoiceInput[] = [
      {
        id: 'inv-1',
        mongoId: '6a99e4da7f03691937a3f941',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 2339,
        advancePaid: 2500, // Excess: 161
        date: '2026-09-01',
        createdAt: new Date('2026-09-01'),
      },
      {
        id: 'inv-2',
        mongoId: '6a99e4da7f03691937a3f942',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 1000,
        advancePaid: 0,
        date: '2026-09-02',
        createdAt: new Date('2026-09-02'),
      },
    ];

    const result = FifoAllocationEngine.calculate(invoices, []);

    const inv1 = result.invoiceAllocations.get('inv-1')!;
    expect(inv1.paid).toBe(2339);
    expect(inv1.remaining).toBe(0);
    expect(inv1.status).toBe('Paid');

    const inv2 = result.invoiceAllocations.get('inv-2')!;
    expect(inv2.paid).toBe(161);
    expect(inv2.remaining).toBe(839);
    expect(inv2.status).toBe('Partially Paid');

    expect(result.customerCredits.get('cust-1')).toBe(0);
  });

  it('should prioritize targeted receipt allocations (invoiceId / allocations) before FIFO', () => {
    const invoices: FifoInvoiceInput[] = [
      {
        id: 'inv-1',
        mongoId: '6a99e4da7f03691937a3f941',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 1000,
        advancePaid: 0,
        date: '2026-09-01',
        createdAt: new Date('2026-09-01'),
      },
      {
        id: 'inv-2',
        mongoId: '6a99e4da7f03691937a3f942',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 500,
        advancePaid: 0,
        date: '2026-09-02',
        createdAt: new Date('2026-09-02'),
      },
    ];

    // Receipt specifically targets inv-2 for 500 AED
    const receipts: FifoReceiptInput[] = [
      {
        id: 'rec-1',
        mongoId: '6a99e4da7f03691937a3f943',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        amount: 500,
        date: '2026-09-03',
        createdAt: new Date('2026-09-03'),
        invoiceId: 'inv-2',
      },
    ];

    const result = FifoAllocationEngine.calculate(invoices, receipts);

    const inv1 = result.invoiceAllocations.get('inv-1')!;
    expect(inv1.paid).toBe(0);
    expect(inv1.remaining).toBe(1000);
    expect(inv1.status).toBe('Pending');

    const inv2 = result.invoiceAllocations.get('inv-2')!;
    expect(inv2.paid).toBe(500);
    expect(inv2.remaining).toBe(0);
    expect(inv2.status).toBe('Paid');

    const rec1 = result.receiptAllocations.get('rec-1')!;
    expect(rec1.allocated).toBe(500);
    expect(rec1.unallocated).toBe(0);
  });

  it('should not double-count settled receipts or produce phantom advance credits when a new invoice is added', () => {
    // Initial state: inv-1 paid by rec-1
    // New state: inv-2 added, rec-2 added
    const invoices: FifoInvoiceInput[] = [
      {
        id: 'inv-1',
        mongoId: '6a99e4da7f03691937a3f941',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 1000,
        advancePaid: 0,
        date: '2026-09-01',
        createdAt: new Date('2026-09-01'),
      },
      {
        id: 'inv-2',
        mongoId: '6a99e4da7f03691937a3f942',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        grandTotal: 500,
        advancePaid: 0,
        date: '2026-09-04',
        createdAt: new Date('2026-09-04'),
      },
    ];

    const receipts: FifoReceiptInput[] = [
      {
        id: 'rec-1',
        mongoId: '6a99e4da7f03691937a3f943',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        amount: 1000,
        date: '2026-09-01',
        createdAt: new Date('2026-09-01'),
        invoiceId: 'inv-1',
        allocations: [{ invoice_id: 'inv-1', allocated_amount: 1000 }],
      },
      {
        id: 'rec-2',
        mongoId: '6a99e4da7f03691937a3f944',
        customerId: 'cust-1',
        customerName: 'Test Customer',
        amount: 200,
        date: '2026-09-04',
        createdAt: new Date('2026-09-04'),
        invoiceId: 'inv-2',
        allocations: [{ invoice_id: 'inv-2', allocated_amount: 200 }],
      },
    ];

    const result = FifoAllocationEngine.calculate(invoices, receipts);

    const inv1 = result.invoiceAllocations.get('inv-1')!;
    expect(inv1.paid).toBe(1000);
    expect(inv1.remaining).toBe(0);
    expect(inv1.status).toBe('Paid');

    const inv2 = result.invoiceAllocations.get('inv-2')!;
    expect(inv2.paid).toBe(200);
    expect(inv2.remaining).toBe(300);
    expect(inv2.status).toBe('Partially Paid');

    const rec1 = result.receiptAllocations.get('rec-1')!;
    expect(rec1.allocated).toBe(1000);
    expect(rec1.unallocated).toBe(0);

    const rec2 = result.receiptAllocations.get('rec-2')!;
    expect(rec2.allocated).toBe(200);
    expect(rec2.unallocated).toBe(0);

    expect(result.customerCredits.get('cust-1')).toBe(0);
  });
});
