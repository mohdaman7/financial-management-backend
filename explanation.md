# Financial Logic Breakdown

I've investigated the database and the backend's financial allocation logic (FIFO Engine). Here is exactly how the `1000` paid amount was calculated for the new invoice (`SKY-2026-ST7372`).

### 1. The Global FIFO Allocation Engine
Your backend uses a global `FifoAllocationEngine` (`fifoAllocationEngine.ts`) that runs automatically. It gathers **all** receipts and **all** invoices for a customer and allocates the payments sequentially from the oldest invoice to the newest.

### 2. The Customer's Credits (Receipts)
The database shows exactly 3 receipts for this customer (`Angad KT`):
- `REC-0001`: **5000 AED**
- `REC-0002`: **1500 AED**
- `REC-0003`: **1500 AED**
**Total Receipts Available:** **8,000 AED**

### 3. The Customer's Invoices (Chronological Order)
The FIFO engine applied the 8,000 AED across the customer's invoices in order of creation:

1. **SKY-2026-ST4571 (6000 AED Total)**
   - The database shows this invoice was generated with `advance_paid: 500`.
   - Remaining due: `5500`.
   - FIFO engine takes `5500` from the receipts.
   - **Receipts left:** `8000 - 5500 = 2500 AED`.

2. **SKY-2026-ST9263 (2000 AED Total)**
   - Advance paid: `0`.
   - Remaining due: `2000`.
   - FIFO engine takes `2000` from the receipts.
   - **Receipts left:** `2500 - 2000 = 500 AED`. *(This is the 500 unallocated receipt money you saw!)*

3. **SKY-2026-ST7372 (3000 AED Total) - The New Invoice**
   - The database shows this invoice was generated with **`advance_paid: 500`**. *(Even though you intended to pass 0, the payload sent 500. This is likely because the `DocumentGenerationModal` state didn't reset after the first invoice, carrying over the 500 advance from `ST4571`)*.
   - The FIFO engine sees the **500 advance**.
   - The FIFO engine then applies the **remaining 500 AED from the receipts** (the unallocated credit you mentioned).
   - **Total Paid Calculated:** `500 (Advance) + 500 (Receipt Credit) = 1000 AED`.

### Why did it happen?
1. The **500 AED unallocated receipt credit** was correctly applied to the new invoice by the FIFO engine.
2. An **additional 500 AED** was added because the invoice was generated with `advance_paid: 500` in the payload, likely due to a frontend state persistence issue in the `DocumentGenerationModal`. 

Would you like me to fix the `DocumentGenerationModal` so that the `advance_paid` field properly resets to `0` every time you open it to prevent this from happening again?
