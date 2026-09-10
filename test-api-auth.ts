import axios from 'axios';
async function test() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'superadmin@skyfall.ae',
      password: 'SecurePassword123!'
    });
    const token = login.data.data.accessToken;
    console.log("Logged in");
    
    const emps = await axios.get('http://localhost:5000/api/employees', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(emps.data, null, 2));
  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}
test();
