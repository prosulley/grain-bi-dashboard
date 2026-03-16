const protect = (req, res, next) => {
  // Demo mode: bypass JWT requirement and attach a default admin user.
  req.user = {
    id: null,
    email: 'demo@grain.local',
    role: 'admin',
  };
  return next();
};

const adminOnly = (req, res, next) => {
  // Demo mode: role checks are disabled.
  return next();
};

module.exports = { protect, adminOnly };
