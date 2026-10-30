import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// Shared with the POS app (its Time Clock screen). One document per shift in `timeclock`:
//   { uid, name, clockIn, clockOut }   clockOut is null while the person is still on shift.
// Keep the fields identical to the POS so entries made on either side show up on both.

const toDate = (ts) => (ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null);

export const getSession = () => JSON.parse(localStorage.getItem('sessionUser') || '{}');

export const formatDuration = (from, to) => {
  const start = toDate(from);
  const end = toDate(to) || new Date();
  if (!start) return '—';
  const totalMin = Math.max(Math.floor((end - start) / 60000), 0);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const formatClockTime = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';
};

export const formatClockDay = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—';
};

const normalize = (d) => {
  const data = d.data();
  return {
    id: d.id,
    uid: data.uid,
    name: data.name || 'Unknown',
    clockIn: toDate(data.clockIn),
    clockOut: toDate(data.clockOut),
  };
};

const logAudit = (action, session, details) =>
  addDoc(collection(db, 'auditlog'), {
    action,
    performedBy: session.name || session.email || 'Unknown',
    userId: session.uid,
    userName: session.name || '',
    role: session.role || '',
    details,
    timestamp: new Date(),
  });

// Live list of entries, newest first. Pass a uid to limit to one employee.
export function subscribeTimeclock(onRows, uid = null) {
  const source = uid
    ? query(collection(db, 'timeclock'), where('uid', '==', uid))
    : collection(db, 'timeclock');
  return onSnapshot(
    source,
    (snap) => onRows(
      snap.docs.map(normalize).filter(r => r.clockIn).sort((a, b) => b.clockIn - a.clockIn),
    ),
    (err) => console.error('Time clock load error:', err),
  );
}

// `employee` is who goes on shift ({ uid, name }); `actor` is who pressed the button.
// They differ when a manager clocks an employee in from the SMS.
export async function clockIn(employee = getSession(), actor = getSession()) {
  const name = employee.name || employee.email || '';
  const byOther = actor.uid !== employee.uid;
  await addDoc(collection(db, 'timeclock'), {
    uid: employee.uid,
    name,
    clockIn: serverTimestamp(),
    clockOut: null,
    ...(byOther ? { clockedInBy: actor.name || actor.email || 'Unknown' } : {}),
  });
  await logAudit('CLOCK_IN', actor, byOther
    ? `${actor.name || 'Manager'} clocked in ${name}.`
    : `${name} clocked in.`);
}

// `closer` is whoever ends the shift: the employee, or an admin ending it for them.
export async function clockOut(entry, closer = getSession()) {
  await updateDoc(doc(db, 'timeclock', entry.id), {
    clockOut: serverTimestamp(),
    ...(closer.uid !== entry.uid ? { closedBy: closer.name || closer.email || 'Unknown' } : {}),
  });
  await logAudit('CLOCK_OUT', closer, closer.uid !== entry.uid
    ? `${closer.name || 'Admin'} clocked out ${entry.name}.`
    : `${entry.name} clocked out after ${formatDuration(entry.clockIn)}.`);
}

// All employee accounts, for the ID column and the manager's "clock in" picker.
export async function loadEmployees() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => {
    const u = d.data();
    return {
      uid: d.id,
      name: u.name || u.fullName || u.email || '',
      empId: u.empId || '',
      role: u.role || '',
      inactive: (u.status || '').toLowerCase() === 'inactive',
    };
  });
}
