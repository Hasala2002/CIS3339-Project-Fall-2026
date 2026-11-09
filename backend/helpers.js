// Small helpers shared by the routes
const mongoose = require('mongoose');

// adds the logged in user's org to a query filter. the org comes from the JWT, never from the request.
// clients keep it in `orgs` (an array), events and services use `org`, so pass the field name for clients
const withOrg = (filter, req, field = 'org') => ({
  ...filter,
  [field]: new mongoose.Types.ObjectId(req.user.orgId)
});

// drops fields a request body shouldn't be able to set, so nobody can move a record into another org
const stripOrg = (body) => {
  const { _id, org, orgs, ...rest } = body;
  return rest;
};

// search text goes into a regex, so escape it to treat it as plain text
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { withOrg, stripOrg, escapeRegex };
