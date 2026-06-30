# Job Portal — Simple Frontend (Plain HTML/CSS/JS)

No build step, no npm install, no React. Just static files that call the same Node.js/Express + AWS backend with `fetch()`.

```
job-portal-html-version/
├── backend/              Node.js/Express + AWS SDK v3 backend (same as the React version)
└── frontend-public/
    ├── index.html        Candidate application form
    ├── admin.html        Recruiter dashboard
    ├── style.css          Shared styling for both pages
    ├── config.js          Sets the backend API URL
    ├── apply.js           Form logic for index.html
    └── admin.js           Dashboard logic for admin.html
```

## How to run it

**1. Start the backend:**
```bash
cd backend
npm install
cp .env.example .env
# fill in AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME, DYNAMODB_TABLE_NAME
npm run create-table
npm run dev
```
Leave it running on `http://localhost:5000`.

**2. Serve the `frontend-public/` folder** as static files. You can't just double-click `index.html` and open it as a `file://` URL — browsers block `fetch()` calls from `file://` pages in ways that cause confusing errors. Instead, serve it with any simple static server:

```bash
cd frontend-public
npx serve -p 8080 .
```
(or, if you have Python installed: `python -m http.server 8080`)

**3. Open your browser** to `http://localhost:8080/index.html` (the candidate form) and `http://localhost:8080/admin.html` (the dashboard).

## Important: match your backend's CORS_ORIGIN

In `job-portal/backend/.env`, make sure:
```
CORS_ORIGIN=http://localhost:8080
```
This must exactly match the URL/port you're serving this `public/` folder from, or the browser will block the requests with a CORS error.

## If `config.js` needs to point somewhere else

Open `config.js` and change:
```js
const API_URL = 'http://localhost:5000/api';
```
to wherever your backend is actually running (e.g. your EC2 IP once deployed: `http://<EC2_PUBLIC_IP>/api`).
