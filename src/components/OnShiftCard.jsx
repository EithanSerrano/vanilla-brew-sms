import { useEffect, useState } from 'react';
import { Maximize2, X, Plus } from 'lucide-react';
import {
  getSession, subscribeTimeclock, loadEmployees, clockIn, clockOut,
  formatDuration, formatClockDay, formatClockTime,
} from '../utils/shifts';

// Dashboard card: who is clocked in right now. Reads the same `timeclock` entries as the
// POS Time Clock screen, live. The expand button shows the full attendance log.
export default function OnShiftCard() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showClockIn, setShowClockIn] = useState(false);
  const [pickUid, setPickUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [endTarget, setEndTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeTimeclock((next) => { setRows(next); setLoading(false); });
    loadEmployees().then(setEmployees).catch(err => console.error('Employees error:', err));
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => { unsubscribe(); clearInterval(id); };
  }, []);

  const active = rows.filter(r => !r.clockOut).reverse();
  const empIds = Object.fromEntries(employees.map(e => [e.uid, e.empId]));
  const onShiftUids = new Set(active.map(r => r.uid));
  const available = employees
    .filter(e => !e.inactive && e.role && !onShiftUids.has(e.uid))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleClockInEmployee = async () => {
    const employee = employees.find(e => e.uid === pickUid);
    if (!employee) { setError('Select an employee.'); return; }
    setBusy(true);
    setError('');
    try {
      await clockIn(employee, getSession());
      setShowClockIn(false);
      setPickUid('');
    } catch (err) {
      console.error('Clock in employee error:', err);
      setError('Could not clock in. Check the Firestore rules for timeclock.');
    } finally {
      setBusy(false);
    }
  };

  const handleForceEnd = async () => {
    setBusy(true);
    setError('');
    try {
      await clockOut(endTarget, getSession());
      setEndTarget(null);
    } catch (err) {
      console.error('Force clock out error:', err);
      setError('Could not end the shift. Check the Firestore rules for timeclock.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-hidden min-h-0 shadow-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">On Shift</h2>
            <p className="text-base text-gray-400 mt-0.5">{active.length} clocked in</p>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <button
              onClick={() => { setError(''); setPickUid(''); setShowClockIn(true); }}
              title="Clock in an employee"
            >
              <Plus size={20} className="cursor-pointer hover:text-gray-600 transition-colors" />
            </button>
            <button onClick={() => setShowLog(true)} title="Attendance log">
              <Maximize2 size={18} className="cursor-pointer hover:text-gray-600 transition-colors" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ scrollbarGutter: 'stable' }}>
          {loading ? (
            <p className="text-xl text-gray-400 text-center py-8">Loading…</p>
          ) : active.length === 0 ? (
            <p className="text-xl text-gray-400 text-center py-8">Nobody is on shift.</p>
          ) : active.map((s, idx) => (
            <div key={s.id} className={`flex items-center px-5 py-3 gap-3 ${idx < active.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xl text-gray-700 truncate">{s.name}</p>
                <p className="text-base text-gray-400 truncate">
                  {empIds[s.uid] ? `${empIds[s.uid]} · ` : ''}Clocked in since {formatClockTime(s.clockIn)}
                </p>
              </div>
              <span className="text-xl font-semibold text-gray-800">{formatDuration(s.clockIn)}</span>
              <button
                onClick={() => { setError(''); setEndTarget(s); }}
                className="text-base text-red-500 hover:text-red-700 transition-colors"
                title="End this shift"
              >
                End
              </button>
            </div>
          ))}
        </div>
      </div>

      {showClockIn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] p-8 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">Clock in an employee</h3>
            <p className="text-xl text-gray-600">Start a shift for someone who is not clocked in yet.</p>
            <select
              value={pickUid}
              onChange={e => { setPickUid(e.target.value); setError(''); }}
              className="border border-gray-300 rounded-lg px-4 py-2.5 text-xl text-gray-700 bg-white outline-none focus:border-[#3ca4c7]"
            >
              <option value="">{available.length ? 'Select an employee…' : 'Everyone is already clocked in'}</option>
              {available.map(e => (
                <option key={e.uid} value={e.uid}>{e.name}{e.empId ? ` (${e.empId})` : ''}</option>
              ))}
            </select>
            {error && <p className="text-lg text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClockIn(false)}
                disabled={busy}
                className="px-6 py-2.5 rounded-full text-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClockInEmployee}
                disabled={busy || !pickUid}
                className="px-6 py-2.5 rounded-full text-xl bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white transition-colors disabled:opacity-60"
              >
                {busy ? 'Clocking in…' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {endTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-8 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold text-gray-800">End shift?</h3>
            <p className="text-xl text-gray-600">Clock out {endTarget.name} now? Use this when someone forgot to clock out.</p>
            {error && <p className="text-lg text-red-500">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEndTarget(null)}
                disabled={busy}
                className="px-6 py-2.5 rounded-full text-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForceEnd}
                disabled={busy}
                className="px-6 py-2.5 rounded-full text-xl bg-[#C0392B] hover:bg-[#a53125] text-white transition-colors disabled:opacity-60"
              >
                {busy ? 'Ending…' : 'End Shift'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[1000px] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 shrink-0">
              <h3 className="text-2xl font-semibold text-gray-800">Attendance Log</h3>
              <button onClick={() => setShowLog(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={22} />
              </button>
            </div>
            <div className="flex items-center px-8 py-3 border-b border-gray-200 text-xl font-semibold text-gray-700 shrink-0">
              <span className="w-[26%]">Employee</span>
              <span className="w-[12%]">ID</span>
              <span className="w-[18%]">Date</span>
              <span className="w-[16%]">In</span>
              <span className="w-[16%]">Out</span>
              <span className="w-[12%] text-right">Duration</span>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-2">
              {rows.length === 0 && <p className="text-xl text-gray-400 text-center py-10">No entries yet.</p>}
              {rows.slice(0, 200).map(r => (
                <div key={r.id} className="flex items-center py-3 border-b border-gray-100 text-xl text-gray-700">
                  <span className="w-[26%] truncate">{r.name}</span>
                  <span className="w-[12%]">{empIds[r.uid] || '—'}</span>
                  <span className="w-[18%]">{formatClockDay(r.clockIn)}</span>
                  <span className="w-[16%]">{formatClockTime(r.clockIn)}</span>
                  <span className="w-[16%]">{r.clockOut ? formatClockTime(r.clockOut) : '—'}</span>
                  <span className={`w-[12%] text-right font-medium ${r.clockOut ? '' : 'text-green-600'}`}>
                    {r.clockOut ? formatDuration(r.clockIn, r.clockOut) : 'On shift'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
