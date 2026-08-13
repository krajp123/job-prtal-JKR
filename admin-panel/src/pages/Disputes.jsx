import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

export default function Disputes() {
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await adminAxiosInstance.get('/disputes');
    setDisputes(data);
  }

  async function resolve(id) {
    const notes = prompt('Resolution notes:');
    if (notes === null) return;
    await adminAxiosInstance.patch(`/disputes/${id}/resolve`, { status: 'resolved', resolutionNotes: notes });
    load();
  }

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>Disputes</h2>

      {disputes.length === 0 && <p>No disputes.</p>}

      {disputes.map((d) => (
        <div key={d._id} style={{ border: '1px solid #ddd', padding: 16, marginBottom: 12 }}>
          <p><strong>{d.subject}</strong> — {d.status}</p>
          <p>{d.description}</p>
          {d.status !== 'resolved' && (
            <button onClick={() => resolve(d._id)}>Mark Resolved</button>
          )}
        </div>
      ))}
    </div>
  );
}
