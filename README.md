# Data Platform Project Setup

This project has been developed over time by students in the CIS 4339 course.

The current iteration is based on development done by:
* Jeremy Griffith and Edwin Charly in Spring of 2023
* Elliot Farmer Garcia, Agatha	Molski and Chris Blanco in Fall of 2022.

## Requirements

This project uses NodeJS, VUEJS and MongoDB.

- Node 18 or newer (built and tested on Node 25)
- A MongoDB the backend can reach. The grading setup uses a hosted MongoDB Atlas cluster (see "Database: MongoDB Atlas" below), so the `backend/.env` from Canvas works on any machine with no database to install. For your own local copy you can use Docker instead.

## Backend Node Application
```
cd backend
```
See the backend README for the environment variables, database setup, and how access and errors work.

## Frontend Vue 3 Application
```
cd frontend
```
See the frontend README for the build, how the static site is hosted, and what the frontend expects from the API.

## Database: MongoDB Atlas

The project's data lives in a MongoDB Atlas cluster, so it can be reached from any machine. The `backend/.env` uploaded to Canvas already points at it, and the database has been set up with `npm run db:init`. To use your own Atlas cluster instead:

1. Create a free cluster at mongodb.com/atlas.
2. Under **Database Access**, add a user with read and write access to this project's database only, with a password made of letters and numbers (other characters have to be %-encoded in the URL).
3. Under **Network Access**, allow `0.0.0.0/0` so the backend can connect from anywhere, graders included.
4. Click **Connect → Drivers** to get the connection string, add the database name `cis3339` after the host, and put it in `MONGO_URL` in `backend/.env`.
5. From `backend`, run `npm run db:init`, then `npm start`. `GET /health` should say `"db":"connected"`.

Atlas gives you a `mongodb+srv://` string. If `db:init` says it can't reach MongoDB and the real error is `querySrv ECONNREFUSED`, your machine's DNS setup is blocking the lookup that `+srv` needs (we hit this on Windows with a local DNS proxy). Use the standard form instead, which lists the servers directly and works everywhere: in Atlas pick **Connect → Drivers** and choose an older driver version to see it, or build it from the three `...shard-00-0N...mongodb.net:27017` hosts. It looks like

```
mongodb://<user>:<password>@<host1>:27017,<host2>:27017,<host3>:27017/cis3339?ssl=true&replicaSet=<replica set>&authSource=admin&retryWrites=true&w=majority
```

"bad auth : authentication failed" means the connection works but the database user's password is wrong. That's the user from Database Access, not your Atlas login. Reset it there and paste the new one into `MONGO_URL`.

## Running the whole app locally

With the Canvas `backend/.env` (Atlas) you can skip step 1 and go straight to step 2. Step 1 is only for running against a database on your own machine.

### 1. Start MongoDB (only for a local database)

```
docker run -d --name cis3339-mongo -p 27018:27017 mongo:7
```

Port 27018 on purpose, so it doesn't clash with a Mongo you may already have on 27017. If Docker says the name is taken, run `docker start cis3339-mongo` instead. If Docker commands hang, restart Docker Desktop.

### 2. Backend

```
cd backend
npm install
```

The `.env` files aren't committed (this repo is public). For grading they come from Canvas, so put them at `backend/.env` and `frontend/.env`. To make your own, copy the examples (on Windows PowerShell use `copy` instead of `cp`):

```
cp .env.example .env
```

and change `JWT_SECRET` to any long random string. The defaults in `backend/.env.example` already match the Docker command above (`MONGO_URL`, `PORT=3000`, `ORG_ID`, `CORS_ORIGIN=http://localhost:5173`). The backend README explains each variable.

Then set up the database and start the server:

```
npm run db:init
npm start
```

`db:init` creates the organization, the two demo accounts, and 20 clients, 20 services and 20 events (some with registrations). It's safe to run again, it only adds what's missing. `npm run db:init -- --reset` wipes the data and starts over.

You should see "Server listening on port 3000" and "Database connection Success!". `http://localhost:3000/health` should answer `{"status":"ok","db":"connected"}`.

### 3. Frontend (in a second terminal)

```
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. If your backend isn't on port 3000, change `VITE_ROOT_API` in `frontend/.env` to match.

### Demo logins

| Role | Username | Password |
| --- | --- | --- |
| Editor (can create, edit, delete) | `admin` | `admin` |
| Viewer (read only) | `user` | `user` |

### Production build

This is what the final demo runs, not the dev server:

```
cd frontend
npm run build
npm run serve
```

Then open http://localhost:5173 (stop `npm run dev` first, they use the same port on purpose so the backend's `CORS_ORIGIN` works for both). `VITE_ROOT_API` is read when you build, so rebuild after changing it.

## What to check

**In the browser**

- **Lists (Find Client / Event / Service):** each shows "Showing 1-10 of 20". Click a column header three times (ascending, descending, back to normal). Go to page 2, then search, and you should land back on page 1 with only the matches.
- **Errors:** stop the backend (Ctrl+C) and click "Clear Search" on a list. You should see "Unable to reach the server" with a Retry button. Start the backend again and click Retry.
- **Login session:** log in and refresh the page, you should stay logged in. Log out and refresh, you should stay logged out. The dashboard needs a login too.
- **Roles:** log in as `user` and type `localhost:5173/clientform` in the address bar, you should end up on the dashboard. The Update and Delete buttons on detail pages should be greyed out. Log in as `admin` and the same URL opens the form.
- **Forms:** as `admin`, create a client, event and service (try submitting them empty first for the validation messages), then update and delete them. An event with attendees and a service used by an event can't be deleted.
- **Registration:** open a client as `admin`, add them to an event with the dropdown and it shows up in their list. Hover a row and click the X to remove it again. (The viewer can't do either.)

**Against the API directly** (Postman, or any HTTP client)

- **Viewer is denied:** log in as `user` (`POST /users/login`), copy the token, and send `POST /clients` with the header `Authorization: Bearer <token>`. You get `403` and `{"error": "..."}`. The same goes for every create, update, delete, register and deregister call. With no token every call except login, `/health` and `/org` gives `401`.
- **Registration rules:** send `PUT /events/register?event=<event id>&client=<client id>` as `admin` twice. The first answer is `{"event": ..., "client": ...}` and the second is `{"message": "Already registered"}`, and the event still lists the client once. `PUT /events/deregister` with the same ids does the opposite, answering `{"message": "Not registered"}` the second time. An event or client id that doesn't exist (or belongs to another organization) gives `404`.
- **Organization isolation:** create a second organization in the same database with `ORG_ID=64e0380b3cc28d087655693c npm run db:init` (run from `backend`, with your usual `MONGO_URL`). The database now holds two organizations, but logged in as `admin` the lists still show only your 20 of each. Get the id of one of the other organization's clients (on Atlas: **Browse Collections → cis3339 → clients**, filter with `{ orgs: ObjectId('64e0380b3cc28d087655693c') }` and copy an `_id`; on a local Docker database: `docker exec cis3339-mongo mongosh cis3339 --quiet --eval "print(db.clients.findOne({orgs: ObjectId('64e0380b3cc28d087655693c')})._id.toString())"`) and ask for it with `GET /clients/id/<that id>`. You get `404`, and updating or deleting it fails the same way.
- **Error shape:** `GET /clients/id/abc` gives `400`, `GET /clients/id/000000000000000000000001` gives `404`, and `GET /nothing` gives `404`, all as `{"error": "..."}`.

## Deployment

The database is hosted on MongoDB Atlas (see above). The backend and frontend aren't deployed to a public host: the final demo runs the backend and the production build of the frontend locally, against Atlas. To put the rest online:

1. **Database:** already on Atlas. If you use a new cluster, follow "Database: MongoDB Atlas" above and run `npm run db:init` once against it.
2. **Backend:** deploy `backend/` to any Node host with `npm install` and `npm start`, and set the environment variables from the backend README on the host. Set `CORS_ORIGIN` to the exact address the frontend will be served from, and check `GET /health` on the deployed URL.
3. **Frontend:** set `VITE_ROOT_API` to the deployed backend's address, run `npm run build`, and upload `frontend/dist` to a static host. The host has to send `index.html` for any path that isn't a real file, otherwise refreshing a page like `/clientdetails/<id>` returns a 404. The frontend README has the nginx, Netlify and Apache settings.

## Tests

There are no automated tests (that part is optional). The checks above are done by hand, and we ran them as we built each piece.

## Known limitations

- The description box on Create Event isn't saved.
- Login tokens last 30 days and there's no way to revoke one before then.
- Sorting and pagination happen in the browser on the rows already loaded, so they don't scale to very large lists.
- One running backend serves one organization (the one in `ORG_ID`), and there's no screen for managing users or organizations.
- The database is on Atlas but the backend and frontend aren't deployed publicly, see Deployment above.

## Stopping and cleaning up

Press Ctrl+C in both terminals, then `docker stop cis3339-mongo`. To delete the test data entirely, `docker rm -f cis3339-mongo`.
