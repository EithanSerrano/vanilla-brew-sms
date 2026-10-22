// Role definitions. The role lives on the user's Firestore document:
// users/{uid}.role  ->  'admin' | 'manager' | 'staff'
// ('staff' is the least-privileged role; the POS app treats it as 'employee'.)

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.STAFF]: 'Staff',
});

// Admins and managers share the admin area; staff use the staff area.
export const ROLE_HOME = Object.freeze({
  [ROLES.ADMIN]: '/admin',
  [ROLES.MANAGER]: '/admin',
  [ROLES.STAFF]: '/staff',
});

// Unknown or missing roles get no access (login refuses them).
export const isValidRole = (role) => Object.values(ROLES).includes(role);

export const getHomeRoute = (role) => ROLE_HOME[role] || null;

export const hasRole = (role, allowed) => {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(role);
};

// What each role may open. Routes and the sidebar both read from here.
export const ACCESS = Object.freeze({
  adminArea:   [ROLES.ADMIN, ROLES.MANAGER],
  analytics:   [ROLES.ADMIN, ROLES.MANAGER],
  accounts:    [ROLES.ADMIN],
  auditLogs:   [ROLES.ADMIN],
  paymentQR:   [ROLES.ADMIN],
  backup:      [ROLES.ADMIN],
  staffArea:   [ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF],
});

export const can = (role, feature) => hasRole(role, ACCESS[feature] || []);

export const getSessionRole = () => {
  try {
    return JSON.parse(localStorage.getItem('sessionUser') || '{}').role || '';
  } catch {
    return '';
  }
};
