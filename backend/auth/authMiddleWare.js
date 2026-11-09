// Authorization middleware. requireAuth checks the JWT on every protected call, requireRole checks what the logged in user is allowed to do.

// import Node.js module for verifying JWTs (JSON Web Tokens)
const jwt = require('jsonwebtoken');

// rejects with 401 if there's no valid token, otherwise puts the decoded user (name, role, orgId) on req.user
const requireAuth = (req, res, next) => {
  // Read the header of API calls called "Authorization", then split the token from that header
  const token =
    req.header('Authorization') && req.header('Authorization').split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // tokens from before orgId was added can't be scoped to an org, so make them log in again
    if (!decoded.orgId) {
      return res.status(401).json({ error: 'Token is not valid' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// use after requireAuth. rejects with 403 if the logged in user doesn't have the role, e.g. requireRole('editor')
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ error: 'You do not have permission to do that' });
  }
  next();
};

module.exports = { requireAuth, requireRole };
