// Gets an empty database ready to use: the org, the demo accounts, some sample data and the indexes.
// npm run db:init               safe to run again, it only adds what's missing
// npm run db:init -- --reset    wipes the five app collections first (never happens unless you ask)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// check the config before touching anything
const { MONGO_URL, ORG_ID } = process.env;
const problems = [];
if (!MONGO_URL) problems.push('MONGO_URL is missing');
if (!ORG_ID) problems.push('ORG_ID is missing');
else if (!/^[0-9a-f]{24}$/i.test(ORG_ID)) problems.push('ORG_ID has to be a 24 character hex id');
if (problems.length) {
  console.error('db:init can\'t run:\n  - ' + problems.join('\n  - ') + '\nCheck your backend/.env');
  process.exit(1);
}

// demo accounts, the defaults match the ones in the project spec
const accounts = [
  {
    username: process.env.SEED_VIEWER_USERNAME || 'user',
    password: process.env.SEED_VIEWER_PASSWORD || 'user',
    role: 'viewer'
  },
  {
    username: process.env.SEED_EDITOR_USERNAME || 'admin',
    password: process.env.SEED_EDITOR_PASSWORD || 'admin',
    role: 'editor'
  }
];

const added = {};
const existing = {};
const collections = ['org', 'users', 'clients', 'events', 'services'];

(async () => {
  try {
    // timeout is short so a wrong MONGO_URL fails fast instead of hanging
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error('db:init can\'t reach MongoDB, check MONGO_URL and that the database is running');
    process.exit(1);
  }

  const db = mongoose.connection.db;
  const org = new mongoose.Types.ObjectId(ORG_ID);

  if (process.argv.includes('--reset')) {
    console.log('--reset given, wiping the app collections first');
    for (const name of collections) await db.collection(name).deleteMany({});
  }

  // adds the doc unless something matching the filter is already there, and says which happened
  async function ensure(collection, filter, doc) {
    const found = await db.collection(collection).findOne(filter);
    if (found) {
      existing[collection] = (existing[collection] || 0) + 1;
      return found;
    }
    const { insertedId } = await db.collection(collection).insertOne(doc);
    added[collection] = (added[collection] || 0) + 1;
    return { ...doc, _id: insertedId };
  }

  await ensure('org', { _id: org }, { _id: org, name: process.env.SEED_ORG_NAME || 'Community Center' });

  // passwords only ever get written as bcrypt hashes
  for (const account of accounts) {
    await ensure(
      'users',
      { username: account.username, org },
      { username: account.username, role: account.role, password: await bcrypt.hash(account.password, 10), org }
    );
  }

  // 20 of everything so sorting and pagination have something to show
  const names = ['Ana', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kofi', 'Lena', 'Milo', 'Nia', 'Omar', 'Pia', 'Quin', 'Rosa', 'Sam', 'Tia'];
  const cities = ['Houston', 'Pasadena', 'Katy', 'Sugar Land', 'Bellaire'];
  const zips = ['77004', '77002', '77494', '77479', '77401'];

  const services = [];
  const clients = [];
  for (let i = 0; i < names.length; i++) {
    const serviceName = 'Service ' + String(i + 1).padStart(2, '0');
    services.push(await ensure('services', { name: serviceName, org }, {
      name: serviceName,
      description: 'Description for service ' + (i + 1),
      status: i % 4 === 3 ? 'Inactive' : 'Active',
      org
    }));

    const phone = String(7135550100 + i * 7);
    clients.push(await ensure('clients', { 'phoneNumber.primary': phone, orgs: org }, {
      firstName: names[i],
      lastName: 'Test' + String.fromCharCode(90 - i),
      email: names[i].toLowerCase() + '@example.com',
      phoneNumber: { primary: phone },
      address: { line1: `${100 + i} Main St`, city: cities[i % 5], zip: zips[i % 5] },
      orgs: [org]
    }));
  }

  // events run from about 50 days ago to 45 days ahead so the dashboard has recent ones.
  // most have attendees so there are registrations to look at
  for (let i = 0; i < names.length; i++) {
    const eventName = 'Event ' + String.fromCharCode(65 + i);
    await ensure('events', { name: eventName, org }, {
      name: eventName,
      description: '',
      date: new Date(Date.now() + (i * 5 - 50) * 86400000),
      address: { line1: `${200 + i} Elm St`, city: cities[i % 5], zip: zips[i % 5] },
      services: [services[i]._id],
      attendees: clients.slice(0, i % 6).map((c) => c._id),
      org
    });
  }

  // creating an index that's already there does nothing
  await db.collection('users').createIndex({ username: 1, org: 1 }, { unique: true });
  await db.collection('clients').createIndex({ orgs: 1 });
  await db.collection('events').createIndex({ org: 1, date: -1 });
  await db.collection('services').createIndex({ org: 1 });

  console.log('db:init done');
  for (const name of collections) {
    console.log(`  ${name}: ${added[name] || 0} added, ${existing[name] || 0} already there`);
  }
  console.log('Demo logins: ' + accounts.map((a) => `${a.username} (${a.role})`).join(', '));
  await mongoose.disconnect();
})().catch((err) => {
  console.error('db:init failed: ' + err.message);
  process.exit(1);
});
