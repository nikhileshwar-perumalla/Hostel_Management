import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const statusBadges = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const RoomRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const res = await axios.get(`/api/room-requests${query}`);
      setRequests(res.data.requests || []);
    } catch (e) {
      console.error('Error fetching room requests', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [statusFilter]);

  const approve = async (id) => {
    setActionLoadingId(id);
    try {
      await axios.patch(`/api/room-requests/${id}/approve`);
      fetchRequests();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoadingId(null);
    }
  };

  const reject = async (id) => {
    const notes = prompt('Optional notes for rejection:') || undefined;
    setActionLoadingId(id);
    try {
      await axios.patch(`/api/room-requests/${id}/reject`, { notes });
      fetchRequests();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Clock className="h-6 w-6 text-blue-600" /> Room Requests
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={fetchRequests}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested At</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-gray-500">Loading...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-gray-500">No room requests found.</td>
              </tr>
            ) : (
              requests.map(r => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{r.student?.name}</div>
                    <div className="text-gray-500 text-xs">{r.student?.studentId}</div>
                    <div className="text-gray-400 text-xs">{r.student?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{r.room?.roomNumber}</div>
                    <div className="text-gray-500 text-xs">Floor {r.room?.floor} • {r.room?.roomType}</div>
                    <div className="text-gray-400 text-xs">{r.room?.currentOccupancy}/{r.room?.capacity}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusBadges[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approve(r._id)}
                          disabled={actionLoadingId === r._id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-4 w-4" /> {actionLoadingId === r._id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => reject(r._id)}
                          disabled={actionLoadingId === r._id}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" /> {actionLoadingId === r._id ? '...' : 'Reject'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomRequests;
