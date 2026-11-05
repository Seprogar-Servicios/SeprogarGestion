const SUPER_ADMIN = 'super_admin';
const ADMIN = 'admin';
const MAX_SUPER_ADMINS = 2;

const isSuperAdmin = (userOrRol) => {
  const rol = typeof userOrRol === 'string' ? userOrRol : userOrRol?.rol;
  return rol === SUPER_ADMIN;
};

/** Admin o Super Admin (poder operativo completo) */
const isPrivilegedAdmin = (userOrRol) => {
  const rol = typeof userOrRol === 'string' ? userOrRol : userOrRol?.rol;
  return rol === SUPER_ADMIN || rol === ADMIN;
};

module.exports = {
  SUPER_ADMIN,
  ADMIN,
  MAX_SUPER_ADMINS,
  isSuperAdmin,
  isPrivilegedAdmin,
};
