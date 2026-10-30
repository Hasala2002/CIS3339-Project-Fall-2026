# Data Platform Project Setup

This project has been developed over time by students in the CIS 4339 course.

The current iteration is based on development done by:
* Jeremy Griffith and Edwin Charly in Spring of 2023
* Elliot Farmer Garcia, Agatha	Molski and Chris Blanco in Fall of 2022.

## Requirements

This project uses NodeJS, VUEJS and MongoDB.

## Backend Node Application
```
cd backend
```
Follow instructions in backend README for setup and running as a local instance.

## Frontend Vue 3 Application
```
cd frontend
```
Follow instructions in frontend README for setup and running as a local instance.

## Running the whole app locally (to test it)

You need Node 18+ and either Docker or a MongoDB you can reach. These steps use Docker so nobody has to install Mongo.

### 1. Start MongoDB

```
docker run -d --name cis3339-mongo -p 27018:27017 mongo:7
```

Port 27018 on purpose, so it doesn't clash with a Mongo you may already have on 27017. If Docker says the name is taken, run `docker start cis3339-mongo` instead. If Docker commands hang, restart Docker Desktop.

### 2. Backend

```
cd backend
npm install
```

Create a file called `backend/.env` (it's gitignored, never commit it) with:

```
MONGO_URL=mongodb://localhost:27018/cis3339
PORT=3000
ORG_ID=64e0380b3cc28d087655693b
JWT_SECRET=any-random-string-you-like
```

Then load the demo data and start the server:

```
npm run seed:dev
npm start
```

You should see "Server listening on port 3000" and "Database connection Success!". The seed creates one organization, the two demo accounts, and 20 clients, 20 services and 20 events (so sorting and pagination have something to show). It refuses to run if the database already has data, and `npm run seed:dev -- --reset` wipes it and starts over. This script is temporary and gets replaced by `npm run db:init` later.

### 3. Frontend (in a second terminal)

```
cd frontend
npm install
cp .env.example .env
npm run dev
```

(On Windows PowerShell use `copy .env.example .env`.) Open http://localhost:5173. If your backend isn't on port 3000, change `VITE_ROOT_API` in `frontend/.env` to match.

### Demo logins

| Role | Username | Password |
| --- | --- | --- |
| Editor (can create, edit, delete) | `admin` | `admin` |
| Viewer (read only) | `user` | `user` |

### What to check

- **Lists (Find Client / Event / Service):** each shows "Showing 1-10 of 20". Click a column header three times (ascending, descending, back to normal). Go to page 2, then search, and you should land back on page 1 with only the matches.
- **Errors:** stop the backend (Ctrl+C) and click "Clear Search" on a list. You should see "Unable to reach the server" with a Retry button. Start the backend again and click Retry.
- **Login session:** log in and refresh the page, you should stay logged in. Log out and refresh, you should stay logged out.
- **Roles:** log in as `user` and type `localhost:5173/clientform` in the address bar, you should end up on the dashboard. The Update and Delete buttons on detail pages should be greyed out. Log in as `admin` and the same URL opens the form.
- **Forms:** as `admin`, create a client, event and service (try submitting them empty first for the validation messages), then update and delete them. An event with attendees and a service used by an event can't be deleted.
- **Production build:** `cd frontend`, then `npm run build` and `npm run serve`, and open http://localhost:4173. Refreshing on a page like `/findclient` should still work.

### Known gaps right now

The backend doesn't check roles yet, so a viewer is only blocked in the UI (that's the backend security task). Registering a client for an event twice shows an error instead of "Already registered" until that task lands too. The description box on Create Event isn't saved.

### Stopping and cleaning up

Press Ctrl+C in both terminals, then `docker stop cis3339-mongo`. To delete the test data entirely, `docker rm -f cis3339-mongo`.


