# 📚 Personal Library

A full-stack personal library app — track books you own, are reading, 
have read, or want to read. Multi-user, with JWT authentication.

**Live demo (frontend only):** https://personal-library-r.netlify.app
> The demo shows the UI but needs the backend running locally for full 
> functionality. See "Run locally" below.

## Features
- Add / edit / delete books (title, author, status, cover)
- Search by title or author; filter by reading status
- Multi-user: each account sees only its own books
- JWT authentication (register, login, logout)
- Passwords hashed with pbkdf2:sha256; books scoped to user on every request
- XSS-safe rendering; parameterized SQL queries (no SQL injection)
- Responsive layout

## Tech stack
- **Frontend:** vanilla HTML/CSS/JavaScript (no framework), deployed on Netlify
- **Backend:** Python + Flask, SQLite, JWT via flask-jwt-extended
- **Auth:** JWT access tokens, per-request 401 handling

## Architecture
Browser (Netlify)
    │  fetch() with Authorization: Bearer <token>
    ▼
Flask API (localhost:5000)
    │  SQLAlchemy-less sqlite3, parameterized queries
    ▼
SQLite (library.db)

## Run locally
### Backend
    cd backend
    python -m venv venv
    source venv/bin/activate        # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    python db.py                    # create the database
    python app.py                   # starts on :5000

### Frontend
    cd frontend
    # open index.html with Live Server, or:
    python -m http.server 5500
    # visit http://localhost:5500

Register an account in the UI and start adding books.

## API
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | — | Create account, returns JWT |
| POST | /api/auth/login | — | Log in, returns JWT |
| GET | /api/books | ✅ | List current user's books |
| POST | /api/books | ✅ | Add a book |
| PATCH | /api/books/:id | ✅ | Update a book |
| DELETE | /api/books/:id | ✅ | Delete a book |

## What I learned
- State → render architecture in vanilla JS
- Event delegation for dynamic lists
- Async fetch, error handling, per-request 401 recovery
- JWT auth: hashing, token issuance, per-user scoping
- Parameterized SQL and XSS escaping (defense in depth)
- Git workflow and static deployment

## Roadmap
- Deploy backend (Render/VPS) for a live multi-user demo
- Replace prompt-based status edits with inline dropdowns
- Cover image upload (currently URL-only)
