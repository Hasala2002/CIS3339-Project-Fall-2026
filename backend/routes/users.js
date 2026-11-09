// This file contains all API endpoints for interacting with the "users" collection in the MongoDB database
const express = require('express');
const router = express.Router();
// import bcrypt for comparing password to hashed password
const bcrypt = require('bcrypt');
// import JWT (JSON Web Token) to create a web token to the user after a successful login - allows user to make API calls
const jwt = require('jsonwebtoken');

// import users data model schema
const { users } = require('../models/models');

const org = process.env.ORG_ID;

// API endpoint to handle login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await users.findOne({ username: username, org: org });
    // same message for a bad username and a bad password so nobody can tell which usernames exist
    const isMatch = user && (await bcrypt.compare(password, user.password));
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    // orgId rides along in the token so every route can scope its queries to the user's org
    const payload = {
      name: user.name,
      role: user.role,
      orgId: user.org
    };

    // token expires in 30 days. This is not best security practice but still demonstrates how JWT work
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
