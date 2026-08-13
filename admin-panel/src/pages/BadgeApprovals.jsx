import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

export default function BadgeApprovals() {
  const [pending, setPending] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await adminAxiosInstance.get('/badges/pending');
    setPending(data);
  }

  async function approve(offerLetterId) {
    await adminAxiosInstance.patch(`/badges/${offerLetterId}/approve`);
    load();
  }

  async function reject(offerLetterId) {
    const reason = prompt('Reason for rejection:');
    if (reason === null) return;
    await adminAxiosInstance.patch(`/badges/${offerLetterId}/reject`, { reason });
    load();
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Pending Hired Badge Approvals</h2>

      {pending.length === 0 && <p>No pending approvals.</p>}

      {pending.map((item) => (
        <div key={item._id} style={{ border: '1px solid #ddd', padding: 16, marginBottom: 12 }}>
          <p><strong>Candidate:</strong> {item.application?.candidate?.name}</p>
          <p><strong>Job:</strong> {item.application?.job?.title}</p>
          <a href={item.signedAcceptanceUrl} target="_blank" rel="noreferrer">
            View signed acceptance letter
          </a>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => approve(item._id)}>Approve</button>
            <button onClick={() => reject(item._id)} style={{ marginLeft: 8 }}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
