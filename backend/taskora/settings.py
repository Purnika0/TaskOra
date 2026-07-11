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

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ── Core / security ──────────────────────────────────────────────────────
# Quick-start development settings - unsuitable for production as-is.
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/
#
# NOTE (known issue, tracked for future cleanup): SECRET_KEY, the database
# password below, and the email credentials further down are all hardcoded
# in this file rather than read from environment variables. That's fine for
# local development/demo purposes but would need to move to env vars (e.g.
# via python-decouple or django-environ) before any real deployment, since
# this file is committed to version control.

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-0_a3ny-w&ro7434pfr52e&4=2zknlkmpd_a^s=@nw%#skj5tgk'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


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

if os.environ.get('USE_SQLITE', '').lower() == 'true':
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
            'NAME': 'taskora_db',
            'USER': 'taskora_user',
            'PASSWORD': 'admin123',
            'HOST': 'localhost',
            'PORT': '5432',
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
EMAIL_BACKEND = 'users.backends.IPv4EmailBackend'
EMAIL_HOST          = 'smtp.gmail.com'
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = 'taskora2083@gmail.com'
EMAIL_HOST_PASSWORD = 'dnex lnin hypa fdwr'
DEFAULT_FROM_EMAIL  = 'TaskOra <taskora2083@gmail.com>'

# Contact form submissions are emailed to this address (the admin's Gmail).
ADMIN_NOTIFICATION_EMAIL = EMAIL_HOST_USER

# Prevents the whole request from hanging indefinitely if the SMTP server
# is unreachable (e.g. a firewall silently drops the connection rather than
# refusing it) — caps any socket operation at 10 seconds.
socket.setdefaulttimeout(10)
