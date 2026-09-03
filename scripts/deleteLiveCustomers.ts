async function check() {
  const loginRes = await fetch('https://skyfall-financial-backend.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@skyfall.ae', password: 'SecurePassword123!' }),
  });
  const data: any = await loginRes.json();
  const token = data.data.accessToken;
  const user = data.data.user;
  console.log('User companyId:', user.assignedCompanyId, user.companyId);

  // Fetch with multiple company header variations
  const headersList = [
    { Authorization: `Bearer ${token}` },
    { Authorization: `Bearer ${token}`, 'x-company-id': '000000000000000000000000' },
    { Authorization: `Bearer ${token}`, 'x-company-id': user.assignedCompanyId || user.companyId },
  ];

  for (const h of headersList) {
    const res = await fetch('https://skyfall-financial-backend.onrender.com/api/v1/customers?limit=100', {
      headers: h as any,
    });
    const custData: any = await res.json();
    console.log('Customers count:', custData.data?.customers?.length || (Array.isArray(custData.data) ? custData.data.length : 0));
    const list = custData.data?.customers || custData.data || [];
    if (Array.isArray(list)) {
      for (const c of list) {
        const id = c.id || c._id;
        console.log(`Deleting customer ID: ${id} (${c.name})`);
        const delRes = await fetch(`https://skyfall-financial-backend.onrender.com/api/v1/customers/${id}`, {
          method: 'DELETE',
          headers: h as any,
        });
        console.log('Delete status:', delRes.status);
      }
    }
  }

  // Also check invoices, receipts, proposals again
  console.log('\nVerifying Invoices count on live:');
  const invRes = await fetch('https://skyfall-financial-backend.onrender.com/api/v1/invoices', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const invData: any = await invRes.json();
  console.log('Live Invoices remaining:', invData.data?.invoices?.length || (Array.isArray(invData.data) ? invData.data.length : 0));

  console.log('\nVerifying Receipts count on live:');
  const recRes = await fetch('https://skyfall-financial-backend.onrender.com/api/v1/receipts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const recData: any = await recRes.json();
  console.log('Live Receipts remaining:', recData.data?.receipts?.length || (Array.isArray(recData.data) ? recData.data.length : 0));

  console.log('\nVerifying Proposals count on live:');
  const propRes = await fetch('https://skyfall-financial-backend.onrender.com/api/v1/proposals', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const propData: any = await propRes.json();
  console.log('Live Proposals remaining:', propData.data?.proposals?.length || (Array.isArray(propData.data) ? propData.data.length : 0));
}

check();
