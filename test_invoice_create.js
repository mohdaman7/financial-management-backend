async function run() {
  try {
    const loginRes = await fetch('http://localhost:5001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@skyfall.ae', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    const invoicePayload = {
      invoice_number: "TEST-" + Math.floor(Math.random() * 10000),
      customer_name: "Test Customer API",
      lead_by: "",
      amount: 100,
      total: 100,
      items: [{ description: "API Test", qty: 1, rate: 100, amount: 100 }]
    };

    const res = await fetch('http://localhost:5001/api/v1/finance/invoices', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invoicePayload)
    });
    
    const resData = await res.json();
    console.log("Response data:", JSON.stringify(resData.data, null, 2));

  } catch (err) {
    console.error(err);
  }
}
run();
