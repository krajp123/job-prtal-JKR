import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

export default function ManagePayments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    adminAxiosInstance.get('/payments').then(({ data }) => setPayments(data));
  }, []);

  return (
    <div className="w-full space-y-4">
      <h2>Payments</h2>
      <div className="overflow-x-auto border border-[#1D181A] bg-[#FFFDFB]">
      <table className="w-full min-w-[640px] border-collapse text-xs text-left">
        <thead>
          <tr className="border border-[#1D181A] bg-[#FFF4EF]">
            <th>Purpose</th>
            <th>Amount (Rs.)</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p._id} className="border border-[#1D181A] hover:bg-[#FFF0E8]">
              <td>{p.purpose}</td>
              <td>{p.amount}</td>
              <td>{p.status}</td>
              <td>{new Date(p.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
