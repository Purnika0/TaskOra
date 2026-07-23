"""
Django settings for the TaskOra project.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/6.0/ref/settings/
"""

import os
import socket
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Loads variables from a local .env file (BASE_DIR/.env) into os.environ, if
# one exists. In real deployments there usually is no .env file — the host
# platform (Docker, systemd, Render/Railway/etc.) injects real environment
# variables directly — so this is purely a local-dev convenience and is a
# no-op if the file is missing. See .env.example for the variables this
# project expects.
load_dotenv(BASE_DIR / '.env')


def env(key, default=None, required=False):
    """
    Small helper around os.environ.get with a clear failure message.
    required=True means "there is no safe default — fail loudly at startup
    rather than silently running with an empty/placeholder secret."
    """
    value = os.environ.get(key, default)
    if required and not value:
        raise ImproperlyConfigured(
            f"Environment variable {key} is required but not set. "
            f"Copy .env.example to .env and fill it in (see backend/README "
            f"or .env.example for details)."
        )
    return value


# ── Core / security ──────────────────────────────────────────────────────
# Quick-start development settings - unsuitable for production as-is.
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
#
# SECRET_KEY, the database password, and the email credentials are all read
# from environment variables (via a local .env file in development — see
# .env.example) rather than hardcoded here, since this settings.py file is
# committed to version control.

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('DJANGO_SECRET_KEY', required=True)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env('DJANGO_DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = [h.strip() for h in env('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()]


# ── Application definition ───────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'drf_spectacular',

    # TaskOra apps
    'users',
    'courses',
    'tasks',
    'holidays',
    'analytics',
    'ml',
    'contact',
    'notifications',
]

MIDDLEWARE = [
    # Must be near the top so CORS headers are added before other
    # middleware can short-circuit the response.
    'corsheaders.middleware.CorsMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # Keeps Task.status in sync with due dates on every request cycle
    # (throttled internally) since no external scheduler is configured.
    # See tasks/middleware.py for details.
    'tasks.middleware.OverdueSyncMiddleware',
]

# Frontend runs on a different origin (Vite dev server) than the API during
# development, so CORS needs to be wide open here. Tighten this to a
# specific allowed origin list before deploying anywhere real.
CORS_ALLOW_ALL_ORIGINS = True  # Change later in production


ROOT_URLCONF = 'taskora.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'taskora.wsgi.application'


# ── Database ──────────────────────────────────────────────────────────────
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases
#
# By default, uses PostgreSQL.
# To use SQLite locally instead (e.g. PostgreSQL not installed/working),
# set an environment variable before running manage.py:
#
#   Windows (PowerShell):  $env:USE_SQLITE="true"
#   Windows (cmd):         set USE_SQLITE=true
#   Mac/Linux:             export USE_SQLITE=true
#
# This only affects your local machine — do not commit this change
# or set it permanently, so the rest of the team keeps using PostgreSQL.

if env('USE_SQLITE', '').lower() == 'true':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': env('DB_NAME', 'taskora_db'),
            'USER': env('DB_USER', 'taskora_user'),
            'PASSWORD': env('DB_PASSWORD', required=True),
            'HOST': env('DB_HOST', 'localhost'),
            'PORT': env('DB_PORT', '5432'),
        }
    }


# ── Auth ──────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = 'users.User'

AUTHENTICATION_BACKENDS = [
    # Custom backend first: lets users log in with either username or email.
    'users.backends.UsernameOrEmailBackend',
    'django.contrib.auth.backends.ModelBackend',  # keep as fallback
]

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ── Internationalization ─────────────────────────────────────────────────
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

# Nepal Standard Time — matters for anything date-based (task due dates,
# holiday calendar, "today" in the BS calendar conversion, etc.).
TIME_ZONE = 'Asia/Kathmandu'

USE_I18N = True

USE_TZ = True


# ── Static & media files ─────────────────────────────────────────────────
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'

# User-uploaded files: assignment reference documents and student
# submissions (see tasks/models.py). Served via taskora/urls.py's
# static() helper in development only (DEBUG=True).
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# ── Django REST Framework / JWT / API schema ─────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        # JWT first for the SPA frontend; session auth kept second so the
        # browsable API / Django admin session still works when browsing
        # the API directly (e.g. via Swagger UI).
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        "rest_framework.authentication.SessionAuthentication",
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_RATES': {
        'otp_request': '5/hour',   # max 5 OTP sends/resends per email per hour
        'otp_verify':  '10/hour',  # max 10 verify attempts per email per hour
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'TaskOra API',
    'DESCRIPTION': 'API for the TaskOra student task management platform',
    'VERSION': '1.0.0',
}


# ── Email — Gmail SMTP ───────────────────────────────────────────────────
# Custom backend (users/backends.py) forces IPv4-only SMTP connections,
# since some networks silently fail to reach Gmail over IPv6.
EMAIL_HOST_USER     = env('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', '')

if DEBUG and not (EMAIL_HOST_USER and EMAIL_HOST_PASSWORD):
    # Local dev without Gmail creds configured yet: print emails (OTP codes,
    # admin notifications, etc.) to the console instead of sending them, so
    # `manage.py runserver` still works. Never falls back like this outside
    # DEBUG — real deployments must set both env vars.
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    EMAIL_HOST_USER = EMAIL_HOST_USER or 'taskora-dev@example.com'
else:
    EMAIL_BACKEND = 'users.backends.IPv4EmailBackend'
    if not (EMAIL_HOST_USER and EMAIL_HOST_PASSWORD):
        raise ImproperlyConfigured(
            "EMAIL_HOST_USER and EMAIL_HOST_PASSWORD are required when DEBUG=False."
        )

EMAIL_HOST          = 'smtp.gmail.com'
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
DEFAULT_FROM_EMAIL  = f'TaskOra <{EMAIL_HOST_USER}>'

# Contact form submissions are emailed to this address (the admin's Gmail).
ADMIN_NOTIFICATION_EMAIL = EMAIL_HOST_USER

# Prevents the whole request from hanging indefinitely if the SMTP server
# is unreachable (e.g. a firewall silently drops the connection rather than
# refusing it) — caps any socket operation at 10 seconds.
socket.setdefaulttimeout(10)