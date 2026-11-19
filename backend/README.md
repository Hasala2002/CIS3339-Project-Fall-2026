# Backend

This implementation is for NodeJS based on [Express](https://expressjs.com/) and [MongoDB](https://www.mongodb.com/) and uses [mongoose](https://mongoosejs.com/) as the ODM.

Needs Node 18 or newer (built and tested on Node 25).

## Project setup

    npm install

### Environment variables

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored and never committed, it gets uploaded through Canvas instead.

| Variable | What it does |
| --- | --- |
| `MONGO_URL` | MongoDB connection string |
| `PORT` | port the API listens on (3000 if unset) |
| `ORG_ID` | id of the organization this instance serves, a 24 character hex string |
| `JWT_SECRET` | random string used to sign and check login tokens |
| `CORS_ORIGIN` | the one origin allowed to call the API from a browser, i.e. where the frontend is served |
| `SEED_VIEWER_USERNAME`, `SEED_VIEWER_PASSWORD` | demo viewer account `db:init` creates (default `user` / `user`) |
| `SEED_EDITOR_USERNAME`, `SEED_EDITOR_PASSWORD` | demo editor account `db:init` creates (default `admin` / `admin`) |

The server won't start if `MONGO_URL`, `ORG_ID`, `JWT_SECRET` or `CORS_ORIGIN` is missing.

### Initialize the database

    npm run db:init

This creates everything the app needs in an empty database: the organization matching `ORG_ID`, the two demo accounts, 20 sample clients, services and events (most events have attendees), and the indexes. Passwords are stored as bcrypt hashes.

It checks the config first and exits with an error if something is wrong. It's safe to run again, it only adds what's missing and never deletes anything. To wipe the app collections and start over, use the reset flag (the extra `--` is needed so npm passes it along):

    npm run db:init -- --reset

### Start the server

    npm start

## How access works

Every client, event and service route needs a login (`Authorization: Bearer <token>`, from `POST /users/login`). The token carries the user's role and organization, and every database query is scoped to that organization, so one organization can never see or change another's records.

| Operation | Requires |
| --- | --- |
| Read clients, events, services, dashboard data | any logged in user |
| Create, update, delete, register, deregister | logged in as an editor, viewers get `403` |
| `GET /health`, `GET /org`, `POST /users/login` | nothing |

## Responses

Errors always look like `{ "error": "message" }`: `400` for bad input, `401` for a missing or bad token, `403` for a viewer trying to change data, `404` for something that doesn't exist (or belongs to another organization), `409` for a delete blocked by existing links, and `500` for anything unexpected. Stack traces and database details are never sent.

`PUT /events/register` and `PUT /events/deregister` return `{ "event", "client" }` the first time, then `{ "message": "Already registered" }` or `{ "message": "Not registered" }` on repeats.

`GET /health` returns `{ "status": "ok", "db": "connected" }` (or `"disconnected"`).

## Postman Documentation

More details about the API endpoints can be be found at <https://documenter.getpostman.com/view/25012176/2s9Y5Zv1xz>
