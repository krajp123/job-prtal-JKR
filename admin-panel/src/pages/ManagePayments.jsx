import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

export default function ManagePayments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    adminAxiosInstance.get('/payments').then(({ data }) => setPayments(data));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Payments</h2>
      <table width="100%" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
            <th>Purpose</th>
            <th>Amount (Rs.)</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{p.purpose}</td>
              <td>{p.amount}</td>
              <td>{p.status}</td>
              <td>{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
