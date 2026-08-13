import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

export default function ManageUsers() {
  const [tab, setTab] = useState('candidates');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    load();
  }, [tab]);

  async function load() {
    const { data } = await adminAxiosInstance.get(`/users/${tab}`);
    setUsers(data);
  }

  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await adminAxiosInstance.patch(`/users/${tab}/${id}/status`, { status: newStatus });
    load();
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Manage Users</h2>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab('candidates')} disabled={tab === 'candidates'}>Candidates</button>
        <button onClick={() => setTab('recruiters')} disabled={tab === 'recruiters'} style={{ marginLeft: 8 }}>
          Recruiters
        </button>
      </div>

      <table width="100%" cellPadding="8" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>
            <th>Name</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{u.name || u.companyName}</td>
              <td>{u.accountStatus}</td>
              <td>
                <button onClick={() => toggleStatus(u._id, u.accountStatus)}>
                  {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
