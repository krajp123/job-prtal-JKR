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
    <div className="w-full space-y-4">
      <h2>Manage Users</h2>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab('candidates')} disabled={tab === 'candidates'}>Candidates</button>
        <button onClick={() => setTab('recruiters')} disabled={tab === 'recruiters'} style={{ marginLeft: 8 }}>
          Recruiters
        </button>
      </div>

      <div className="overflow-x-auto border border-[#1D181A] bg-[#FFFDFB]">
      <table className="w-full min-w-[560px] border-collapse text-xs text-left">
        <thead>
          <tr className="border border-[#1D181A] bg-[#FFF4EF]">
            <th>Name</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border border-[#1D181A] hover:bg-[#FFF0E8]">
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
    </div>
  );
}
