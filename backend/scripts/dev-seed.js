// quick seed so you can try the app locally. this is temporary, the real db:init (D1) replaces it later.
// usage: npm run seed:dev          (refuses to run if the database already has data)
//        npm run seed:dev -- --reset   (wipes the 5 app collections first)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { MONGO_URL, ORG_ID } = process.env;
if (!MONGO_URL || !ORG_ID) {
  console.error('Missing MONGO_URL or ORG_ID, check your backend/.env');
  process.exit(1);
}

(async () => {
  await mongoose.connect(MONGO_URL);
  const db = mongoose.connection.db;
  const org = new mongoose.Types.ObjectId(ORG_ID);
  const id = () => new mongoose.Types.ObjectId();

  if (await db.collection('org').countDocuments()) {
    if (!process.argv.includes('--reset')) {
      console.error('Database already has data. Run with --reset to wipe it first.');
      process.exit(1);
    }
    for (const name of ['org', 'users', 'clients', 'events', 'services']) {
      await db.collection(name).deleteMany({});
    }
  }

  await db.collection('org').insertOne({ _id: org, name: 'Community Center' });
  // demo accounts from the project spec: admin = editor, user = viewer
  await db.collection('users').insertMany([
    { _id: id(), username: 'admin', role: 'editor', password: await bcrypt.hash('admin', 10), org },
    { _id: id(), username: 'user', role: 'viewer', password: await bcrypt.hash('user', 10), org }
  ]);

  const names = ['Ana', 'Ben', 'Cara', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kofi', 'Lena', 'Milo', 'Nia', 'Omar', 'Pia', 'Quin', 'Rosa', 'Sam', 'Tia'];
  const cities = ['Houston', 'Pasadena', 'Katy', 'Sugar Land', 'Bellaire'];
  const zips = ['77004', '77002', '77494', '77479', '77401'];

  // 20 of everything so sorting and pagination have something to chew on
  const clients = names.map((first, i) => ({
    _id: id(), firstName: first, lastName: 'Test' + String.fromCharCode(90 - i), email: first.toLowerCase() + '@example.com',
    phoneNumber: { primary: String(7135550100 + i * 7) },
    address: { line1: `${100 + i} Main St`, city: cities[i % 5], zip: zips[i % 5] },
    orgs: [org]
  }));
  const services = names.map((_, i) => ({
    _id: id(), name: 'Service ' + String(i + 1).padStart(2, '0'), description: 'Description for service ' + (i + 1),
    status: i % 4 === 3 ? 'Inactive' : 'Active', org
  }));
  // dates run from about 50 days ago to 45 days ahead so the dashboard has recent events
  const events = names.map((_, i) => ({
    _id: id(), org, name: 'Event ' + String.fromCharCode(65 + i), description: '',
    date: new Date(Date.now() + (i * 5 - 50) * 86400000),
    address: { line1: `${200 + i} Elm St`, city: cities[i % 5], zip: zips[i % 5] },
    services: [services[i]._id],
    attendees: clients.slice(0, i % 6).map((c) => c._id)
  }));

  await db.collection('clients').insertMany(clients);
  await db.collection('services').insertMany(services);
  await db.collection('events').insertMany(events);

  console.log('Seeded 1 org, 2 users (admin/admin, user/user), 20 clients, 20 services, 20 events');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
