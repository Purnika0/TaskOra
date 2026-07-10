# TaskOra

**TaskOra** is an academic task and course management platform built for the TU BIT curriculum, designed around real student, teacher, and admin workflows at Padmakanya Multiple Campus (PKMC). It combines conventional task/assignment tracking with a machine learning layer that surfaces student performance patterns, flags at-risk behaviour, and recommends tasks based on peer activity.

Final year project — BIT 7th Semester, Padmakanya Multiple Campus, Tribhuvan University.

---

## Features

**For students**
- Track assignments through a four-state lifecycle: `pending → submitted → completed` (or `overdue`)
- Join courses via a teacher-issued join code, with existing assignments auto-added as tasks
- Smart priority scoring on every task — urgency, teacher-set importance, workload, and upcoming holidays all factor into a live urgency score
- Personalized task recommendations, generated via collaborative filtering against same-batch peers
- Weekly progress charts and per-course workload breakdowns
- In-app notifications for new assignments, submission review outcomes, and deadlines

**For teachers**
- Create and manage courses, assignments, and join codes
- Review student submissions (approve/reject with feedback), with file upload support
- Class-wide analytics: completion/submission rates per assignment and per course, student rankings
- Balanced K-Means clustering — groups students into High Performer / Average / At-Risk tiers, constrained to realistic tier proportions rather than raw nearest-centroid assignment
- Outlier detection (Isolation Forest + Z-score) that flags students with unusual behaviour and explains why

**For admins**
- Create teacher accounts (teacher accounts are admin-provisioned, not self-registered)
- Full visibility across all courses and users
- Holiday calendar management (Bikram Sambat–aware)

**Platform-wide**
- JWT authentication with silent refresh
- OTP-based email verification and password reset (hashed, time-limited, single-use)
- Nepali academic calendar support (BS/AD conversion, TU holidays)

---

## Tech stack

**Backend**
- Django 6 + Django REST Framework
- PostgreSQL (SQLite supported as a local fallback — see below)
- SimpleJWT for authentication
- scikit-learn (K-Means, Isolation Forest), SciPy (Hungarian algorithm via `linear_sum_assignment`), pandas/NumPy — the ML layer in `backend/ml/`
- drf-spectacular for OpenAPI schema / Swagger docs

**Frontend**
- React 19 + Vite
- React Router
- Recharts for analytics visualizations
- Tailwind CSS

---

## Project structure

```
TaskOra/
├── backend/
│   ├── users/          # auth, JWT, OTP, roles (student/teacher/admin)
│   ├── courses/        # courses, enrollment, join codes
│   ├── tasks/           # assignments, tasks, smart priority scoring
│   ├── holidays/       # Nepali holiday calendar
│   ├── analytics/      # student & teacher facing analytics endpoints
│   ├── ml/             # clustering, outlier detection, recommendations
│   ├── notifications/  # in-app notification service
│   ├── contact/        # public contact form
│   └── taskora/        # project settings, root URLs
└── frontend/
    └── src/
        ├── pages/       # route-level views (auth, dashboards, analytics, etc.)
        ├── context/     # auth/notification context providers
        ├── services/    # API client layer
        └── routes/      # route protection & shell layout
```

---

## Getting started

### Prerequisites
- Python 3.13
- Node.js 18+
- PostgreSQL (or use the SQLite fallback below if you just want to run it locally without setting up Postgres)

### Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

**Database:** by default the project points at a local PostgreSQL database (`taskora_db` / `taskora_user`) configured in `taskora/settings.py`. Either:
- create a matching local Postgres database/user, or
- update the credentials in `taskora/settings.py` under `DATABASES`, or
- skip Postgres entirely for local dev by setting `USE_SQLITE=true` before running any `manage.py` command (see comment in `settings.py` for the exact command per shell).

```bash
python manage.py migrate
python manage.py runserver
```

**Seeding demo data** (optional, but recommended for exploring the app — run in this order, since each step depends on the last):

```bash
python manage.py seed_holidays
python manage.py seed_teachers_courses
python manage.py seed_students
python manage.py seed_enrollments
python manage.py seed_assignments
python manage.py seed_tasks
```

**Running the test suite:**

```bash
python manage.py test
```

(Requires your Postgres user to have `CREATEDB` permission, or run with `USE_SQLITE=true` prefixed as above to use a throwaway in-memory database instead.)

**API docs:** once the server is running, Swagger UI is available at `http://127.0.0.1:8000/api/`.

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and expects the backend API at `http://127.0.0.1:8000`.

---

## Team

| Name | Role |
|---|---|
| Sanchita | Backend development |
| Purnika Adhikari | Frontend development |
| Xenon Saud | UI/UX Design |

---

## Notes for reviewers

- `DEBUG = True` and hardcoded database credentials in `taskora/settings.py` are intentional for local development/demo purposes and would need to move to environment variables before any real deployment.
- The ML features (`backend/ml/`) require a minimum number of enrolled students per course to run (3 for clustering, 4 for outlier detection) — this is a deliberate guard against unreliable results on tiny sample sizes, not a bug.
