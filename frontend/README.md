# Data Platform Frontend

This project uses [VueJS 3](https://vuejs.org/) with [Vite](https://vitejs.dev/) and [TailwindCSS](https://tailwindcss.com/).
For form validation [Vuelidate](https://vuelidate-next.netlify.app/) is used.

State management is done via [Pinia](https://pinia.vuejs.org/).

## Project setup

    npm install

### Before startup
You need to either have a local backend running and or use a cloud deployed backend.

Setup a .env file with following variables, e.g.:

    VITE_ROOT_API=http://localhost:3000

VITE_ROOT_API is the URL for the backend API, either on localhost or in the cloud.
`frontend/.env` is committed so graders can run the app without extra setup. It only holds the backend URL (nothing secret), so change it if your backend isn't on port 3000.

### Compiles and hot-reloads for development

    npm run dev

## Production build

Needs Node 18 or newer (built and tested on Node 25).

    npm install
    npm run build

This writes the static site to `frontend/dist`. `VITE_ROOT_API` is read at build time, so rebuild after changing it. There's no localhost URL hard-coded in the source.

To check the build locally (this is what the demo should run, not `npm run dev`):

    npm run serve

then open <http://localhost:4173>. Refreshing a nested page like `/clientdetails/<id>` works here because the preview server falls back to `index.html`.

### Deploying the static build

Upload the contents of `frontend/dist` to any static host serving the site from the root path (`/`). The app uses history-mode routes, so the host must send `index.html` for any path that isn't a real file, otherwise refreshing a nested route returns a 404:

- nginx: `location / { try_files $uri /index.html; }`
- Netlify: add `/*  /index.html  200` to a `_redirects` file in `dist`
- Apache: use a rewrite rule that falls back to `index.html`

The backend's `CORS_ORIGIN` has to be set to the address the frontend is served from, and `VITE_ROOT_API` has to be the backend's address when you build.

## Session and roles

The login token is kept in `localStorage`. On a page refresh the app restores the login if the token is still valid, and logs the user out cleanly if it's expired or corrupted. Routes marked `requiresEditor` (the three create forms) redirect viewers to the dashboard.

## API shapes the frontend expects

- Errors: `{ "error": "message" }` (older plain-text and `{ message }` responses still work). A `401` clears the session and goes to `/login`, a `403` just shows the message.
- Register an attendee: the created record the first time, `{ "message": "Already registered" }` on repeats.
- Deregister an attendee: the removed record, or `{ "message": "Not registered" }` if they weren't registered.
- The current template backend still sends plain strings for register/deregister, and the frontend handles both (see `registrationMessage` in `src/api/api.js`).

## Known limitations

- The Vite dev server and `vite preview` handle the history fallback on their own, but any other host needs the fallback set up as above.
- The create-event form's description box isn't saved yet.
