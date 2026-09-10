const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const token = data.data.accessToken;
      if (!token) throw new Error("No token");
      
      const req2 = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/employees',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'x-company-id': '000000000000000000000000' }
      }, (res2) => {
        let body2 = '';
        res2.on('data', chunk => body2 += chunk);
        res2.on('end', () => {
          console.log("Status:", res2.statusCode);
          console.log("Response:", body2.slice(0, 1000));
        });
      });
      req2.end();
    } catch(e) {
      console.error(e, body);
    }
  });
});
req.write(JSON.stringify({ email: 'superadmin@skyfall.ae', password: 'SecurePassword123!' }));
req.end();
