const LIVE_API_URL = 'https://skyfall-financial-backend.onrender.com/api/v1';

async function clearLiveData() {
  console.log(`Connecting to Live API at: ${LIVE_API_URL}`);

  let token = '';

  const credentials = [
    { email: 'superadmin@skyfall.ae', password: 'SecurePassword123!' },
    { email: 'superadmin@erp.com', password: 'password123' },
    { email: 'admin@skyfall.ae', password: 'SecurePassword123!' },
  ];

  for (const cred of credentials) {
    try {
      console.log(`Trying login with ${cred.email}...`);
      const res = await fetch(`${LIVE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred),
      });
      const data: any = await res.json();
      token = data?.data?.accessToken || data?.accessToken;
      if (token) {
        console.log(`Logged in successfully as ${cred.email}!`);
        break;
      }
    } catch (e: any) {
      console.log(`Login error for ${cred.email}:`, e.message);
    }
  }

  if (!token) {
    console.error('Could not log into live API with any admin credentials.');
    return;
  }

  // 1. Fetch companies
  let companies: any[] = [];
  try {
    const compRes = await fetch(`${LIVE_API_URL}/companies`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const compData: any = await compRes.json();
    companies = compData?.data || compData || [];
    console.log(`Found ${companies.length} companies.`);
  } catch (err: any) {
    console.warn('Could not fetch companies:', err.message);
  }

  const companyIds = companies.map((c: any) => c.id || c._id).filter(Boolean);
  if (companyIds.length === 0) {
    companyIds.push('000000000000000000000000');
  }

  for (const compId of companyIds) {
    console.log(`\n--- Cleaning data for company ${compId} ---`);
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'x-company-id': compId,
      'Content-Type': 'application/json',
    };

    // A. Delete Invoices
    try {
      const invRes = await fetch(`${LIVE_API_URL}/invoices?limit=200`, { headers });
      const invData: any = await invRes.json();
      const list = Array.isArray(invData?.data?.invoices)
        ? invData.data.invoices
        : Array.isArray(invData?.data)
        ? invData.data
        : [];
      console.log(`Found ${list.length} invoices.`);
      for (const inv of list) {
        const id = inv.id || inv._id;
        if (id) {
          const dRes = await fetch(`${LIVE_API_URL}/invoices/${id}`, { method: 'DELETE', headers });
          console.log(`Deleted invoice: ${inv.invoice_number || id}`);
        }
      }
    } catch (e: any) {
      console.log('Error deleting invoices:', e.message);
    }

    // B. Delete Receipts
    try {
      const recRes = await fetch(`${LIVE_API_URL}/receipts?limit=200`, { headers });
      const recData: any = await recRes.json();
      const list = Array.isArray(recData?.data?.receipts)
        ? recData.data.receipts
        : Array.isArray(recData?.data)
        ? recData.data
        : [];
      console.log(`Found ${list.length} receipts.`);
      for (const rec of list) {
        const id = rec.id || rec._id;
        if (id) {
          await fetch(`${LIVE_API_URL}/receipts/${id}`, { method: 'DELETE', headers });
          console.log(`Deleted/Cancelled receipt: ${rec.reference || id}`);
        }
      }
    } catch (e: any) {
      console.log('Error deleting receipts:', e.message);
    }

    // C. Delete Quotations / Proposals
    try {
      const propRes = await fetch(`${LIVE_API_URL}/proposals?limit=200`, { headers });
      const propData: any = await propRes.json();
      const list = Array.isArray(propData?.data?.proposals)
        ? propData.data.proposals
        : Array.isArray(propData?.data)
        ? propData.data
        : [];
      console.log(`Found ${list.length} proposals/quotations.`);
      for (const prop of list) {
        const id = prop.id || prop._id;
        if (id) {
          await fetch(`${LIVE_API_URL}/proposals/${id}`, { method: 'DELETE', headers });
          console.log(`Deleted proposal: ${prop.quoteRef || id}`);
        }
      }
    } catch (e: any) {
      console.log('Error deleting proposals:', e.message);
    }

    // D. Delete Customers
    try {
      const custRes = await fetch(`${LIVE_API_URL}/customers?limit=200`, { headers });
      const custData: any = await custRes.json();
      const list = Array.isArray(custData?.data?.customers)
        ? custData.data.customers
        : Array.isArray(custData?.data)
        ? custData.data
        : [];
      console.log(`Found ${list.length} customers.`);
      for (const cust of list) {
        const id = cust.id || cust._id;
        if (id) {
          await fetch(`${LIVE_API_URL}/customers/${id}`, { method: 'DELETE', headers });
          console.log(`Deleted customer: ${cust.name || id}`);
        }
      }
    } catch (e: any) {
      console.log('Error deleting customers:', e.message);
    }
  }

  console.log('\n--- LIVE DATABASE CLEANUP COMPLETE ---');
}

clearLiveData();
