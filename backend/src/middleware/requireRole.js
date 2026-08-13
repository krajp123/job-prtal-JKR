// Use after verifyToken. Restricts a route to a specific public role.
// Usage: router.post('/jobs', verifyToken, requireRole('recruiter'), jobController.create)
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Forbidden: ${role} access only` });
    }
    next();
  };
}

module.exports = requireRole;
