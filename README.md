# Meridian Hiring — Job Application Portal

A full-stack, cloud-native job application portal. Candidates submit applications with a resume upload; recruiters review, filter, and manage submissions from a secure dashboard. Built on AWS (DynamoDB + S3) with a plain HTML/CSS/JS frontend and a Node.js/Express backend — no frontend build step required.

## Features

- **Candidate application form** — name, email, position, and PDF resume upload (max 5MB), with client-side validation and a drag-and-drop dropzone.
- **Recruiter dashboard** — search, filter by position/status, and update application status (Pending / Shortlisted / Selected / Rejected).
- **Resume storage** — uploaded PDFs are stored privately in S3 (AES256 server-side encryption) and accessed only via short-lived presigned URLs, never publicly exposed.
- **Admin authentication** — JWT-based login with httpOnly cookies (7-day expiry); the dashboard is inaccessible without a valid session.
- **About page** — a public-facing overview of what Meridian Hiring does and how the process works.

## Tech stack

| Layer        | Technology                                  |
|--------------|----------------------------------------------|
| Frontend     | Plain HTML / CSS / JavaScript (no build step) |
| Backend      | Node.js, Express, AWS SDK v3                  |
| Database     | Amazon DynamoDB (on-demand capacity)          |
| File storage | Amazon S3 (private bucket, presigned URLs)    |
| Auth         | JSON Web Tokens, httpOnly cookies             |
| Process mgmt | PM2                                           |
| Web server   | Nginx (static file serving + reverse proxy)   |
| Hosting      | AWS EC2 (Ubuntu 24.04 LTS)                    |

## Architecture

```
Browser
   │
   ▼
 Nginx (port 80)
   ├── /              → static files (frontend-public/)
   └── /api/*         → reverse proxy → Express (port 5000, via PM2)
                              │
                              ├── DynamoDB  (application records)
                              └── S3        (resume PDFs, presigned URLs)
```

## Project structure

```
.
├── backend/
│   ├── config/          # environment + AWS client config
│   ├── middleware/       # auth guard (JWT verification)
│   ├── routes/            # applications, admin, auth route handlers
│   ├── services/          # dynamoService, s3Service
│   ├── scripts/           # one-time setup (create-table)
│   └── server.js
└── frontend-public/
    ├── index.html         # candidate application form
    ├── about.html         # public company/portal overview
    ├── admin.html          # recruiter dashboard (protected)
    ├── login.html           # admin login
    ├── style.css
    ├── config.js             # API_URL definition
    ├── apply.js
    ├── admin.js
    └── login.js
```

## Local development

### Prerequisites

- Node.js 20+
- An AWS account with a DynamoDB table and an S3 bucket (see [Setup](#aws-setup) below)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your own values
npm run create-table   # one-time: creates the DynamoDB table if it doesn't exist
npm run dev             # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend-public
npx serve -p 8080       # or: python -m http.server 8080
```

Visit `http://localhost:8080`.

### Environment variables

```dotenv
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:8080

AWS_REGION=ap-south-1
# Omit AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY when running on EC2 with an
# attached IAM role — the SDK picks up credentials automatically.
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

S3_BUCKET_NAME=your-bucket-name
MAX_FILE_SIZE_BYTES=5242880

DYNAMODB_TABLE_NAME=your-table-name

ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-strong-password
JWT_SECRET=generate-with-crypto-randomBytes
```

> **Never commit `.env` or paste real credentials anywhere public.** Use an IAM role in production instead of static keys.

## AWS setup

1. **DynamoDB** — table with partition key `applicationId` (String), on-demand billing. Run `npm run create-table` to create it automatically.
2. **S3** — a private bucket with default encryption (AES256) enabled. Public access should be blocked entirely; the app uses presigned URLs for both uploads and downloads.
3. **IAM** — scope permissions to the specific table and bucket (avoid `*` resource wildcards). On EC2, attach an IAM role to the instance rather than using static access keys.

## Deployment

Deployed on a single EC2 instance (Ubuntu 24.04):

- **PM2** keeps the Express backend running and restarts it on crash or reboot.
- **Nginx** serves the static frontend directly and reverse-proxies `/api/*` to the backend on `localhost:5000`, so both frontend and API are served from the same origin on port 80.

```bash
# Backend
cd backend && npm install --production
pm2 start server.js --name job-portal-api
pm2 save && pm2 startup

# Nginx (excerpt)
server {
    listen 80;
    server_name <your-ip-or-domain>;
    root /path/to/frontend-public;
    index index.html;

    location / { try_files $uri $uri/ =404; }
    location /api/ { proxy_pass http://localhost:5000/api/; }
}
```

## Roadmap

- [ ] HTTPS via Let's Encrypt once a domain is attached
- [ ] Move admin credentials from `.env` to DynamoDB with hashed passwords
- [ ] Global Secondary Indexes for filtering by position/status without a full table scan

## License

This project is for educational/portfolio purposes.
