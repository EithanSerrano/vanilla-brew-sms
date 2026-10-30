import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getSession, subscribeTimeclock, clockIn, clockOut, formatDuration } from '../utils/shifts';

// Sidebar button to start or end the signed-in user's shift.
export default function ShiftClock() {
  const [shift, setShift] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Live, so a clock in/out made on the POS shows up here too.
    return subscribeTimeclock((rows) => {
      setShift(rows.find(r => !r.clockOut) || null);
      setLoaded(true);
    }, getSession().uid);
  }, []);

  useEffect(() => {
    if (!shift) return undefined;
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, [shift]);

  // Both directions ask first: the button sits next to Log Out and is easy to hit by mistake.
  const handleClick = () => {
    if (busy || !getSession().uid) return;
    if (shift) setConfirmEnd(true);
    else setConfirmStart(true);
  };

  const handleStart = async () => {
    setBusy(true);
    try {
      await clockIn();
      setConfirmStart(false);
    } catch (err) {
      console.error('Clock in error:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = async () => {
    setBusy(true);
    try {
      await clockOut(shift);
      setConfirmEnd(false);
    } catch (err) {
      console.error('Clock out error:', err);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy}
        className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-white text-xl tracking-widest uppercase hover:bg-white/10 transition-all disabled:opacity-60"
      >
        <span className="flex items-center gap-3">
          <Clock size={17} />
          {shift ? 'Clock Out' : 'Clock In'}
        </span>
        {shift && (
          <span className="flex items-center gap-2 text-sm normal-case tracking-normal text-teal-300">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            {formatDuration(shift.clockIn)}
          </span>
        )}
      </button>

      {confirmStart && !shift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-8 flex flex-col gap-4 normal-case tracking-normal">
            <h3 className="text-2xl font-semibold text-gray-800">Start your shift?</h3>
            <p className="text-xl text-gray-600">
              You will be clocked in at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmStart(false)}
                disabled={busy}
                className="px-6 py-2.5 rounded-full text-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStart}
                disabled={busy}
                className="px-6 py-2.5 rounded-full text-xl bg-[#0A5A3A] hover:bg-[#084a30] text-white transition-colors disabled:opacity-60"
              >
                {busy ? 'Clocking in…' : 'Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmEnd && shift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-2xl shadow-2xl w-[440px] p-8 flex flex-col gap-4 normal-case tracking-normal">
            <h3 className="text-2xl font-semibold text-gray-800">End your shift?</h3>
            <p className="text-xl text-gray-600">
              You have been on shift for {formatDuration(shift.clockIn)}.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmEnd(false)}
                disabled={busy}
                className="px-6 py-2.5 rounded-full text-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Stay On
              </button>
              <button
                onClick={handleEnd}
                disabled={busy}
                className="px-6 py-2.5 rounded-full text-xl bg-[#3ca4c7] hover:bg-[#2b8aa8] text-white transition-colors disabled:opacity-60"
              >
                {busy ? 'Clocking out…' : 'Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
