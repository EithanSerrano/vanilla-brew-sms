import { useEffect, useState } from 'react';
import AdminSidebar from '../layouts/AdminSidebar';
import OnShiftCard from '../components/OnShiftCard';
import {
  subscribeTimeclock, loadEmployees, formatDuration, formatClockDay, formatClockTime,
} from '../utils/shifts';

// Manager/admin view of the shared POS time clock: clock employees in or out and read the log.
export default function Attendance() {
  const [rows, setRows] = useState([]);
  const [empIds, setEmpIds] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeTimeclock(setRows);
    loadEmployees()
      .then(list => setEmpIds(Object.fromEntries(list.map(e => [e.uid, e.empId]))))
      .catch(err => console.error('Employees error:', err));
    return unsubscribe;
  }, []);

  const q = search.trim().toLowerCase();
  const visible = rows.filter(r =>
    !q || r.name.toLowerCase().includes(q) || (empIds[r.uid] || '').toLowerCase().includes(q));

  return (
    <div className="flex w-full h-full">
      <AdminSidebar />
      <main className="flex-1 bg-white overflow-hidden flex flex-col p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-5 shrink-0">Attendance</h1>
        <div className="flex gap-5 flex-1 min-h-0">
          <div className="w-[34%] flex flex-col min-h-0">
            <OnShiftCard />
          </div>

          <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden min-h-0 shadow-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 gap-4">
              <h2 className="text-2xl font-semibold text-gray-800">Attendance Log</h2>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or ID"
                className="border border-gray-300 rounded-lg px-4 py-2 text-xl w-72 outline-none focus:border-[#3ca4c7]"
              />
            </div>
            <div className="flex items-center px-6 py-3 border-b border-gray-200 text-xl font-semibold text-gray-700 shrink-0">
              <span className="w-[28%]">Employee</span>
              <span className="w-[13%]">ID</span>
              <span className="w-[19%]">Date</span>
              <span className="w-[14%]">In</span>
              <span className="w-[14%]">Out</span>
              <span className="w-[12%] text-right">Duration</span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-1 min-h-0">
              {visible.length === 0 && <p className="text-xl text-gray-400 text-center py-10">No entries yet.</p>}
              {visible.slice(0, 300).map(r => (
                <div key={r.id} className="flex items-center py-3 border-b border-gray-100 text-xl text-gray-700">
                  <span className="w-[28%] truncate">{r.name}</span>
                  <span className="w-[13%]">{empIds[r.uid] || '—'}</span>
                  <span className="w-[19%]">{formatClockDay(r.clockIn)}</span>
                  <span className="w-[14%]">{formatClockTime(r.clockIn)}</span>
                  <span className="w-[14%]">{r.clockOut ? formatClockTime(r.clockOut) : '—'}</span>
                  <span className={`w-[12%] text-right font-medium ${r.clockOut ? '' : 'text-green-600'}`}>
                    {r.clockOut ? formatDuration(r.clockIn, r.clockOut) : 'On shift'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
