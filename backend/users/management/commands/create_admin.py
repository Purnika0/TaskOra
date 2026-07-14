"""
TaskOra — Create Admin Account
===============================
Creates the single TaskOra admin account. TaskOra only ever allows one
admin (see User.save() in users/models.py for the enforced guarantee),
so this command refuses to run if an admin already exists.

This replaces the old "createsuperuser, then hand-edit the role in the
database" workflow with a single, repeatable, documented step — meant
to be run once, right after `migrate`, outside of any HTTP-exposed flow.
Admin accounts are never created through the API.

Run with:
    python manage.py create_admin --username admin --email admin@taskora.com --password ********

If you omit --password, you'll be prompted for one (and it won't echo to
the terminal), which avoids leaving the password in your shell history.
"""

import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Create the single TaskOra admin account. Refuses if one already exists."

    def add_arguments(self, parser):
        parser.add_argument("--username", required=True, help="Login username for the admin account.")
        parser.add_argument("--email", required=True, help="Email address for the admin account.")
        parser.add_argument(
            "--password",
            required=False,
            help="Password for the admin account. If omitted, you'll be prompted (input hidden).",
        )
        parser.add_argument(
            "--full-name",
            default="",
            dest="full_name",
            help="Optional display name for the admin account.",
        )

    def handle(self, *args, **options):
        # Fail fast with a clear message rather than letting User.save()'s
        # guard raise a lower-level ValidationError further down.
        if User.objects.filter(role=User.Role.ADMIN).exists():
            existing = User.objects.filter(role=User.Role.ADMIN).first()
            raise CommandError(
                f"An admin account already exists ('{existing.username}'). "
                "TaskOra only allows one. Delete it first if you need to replace it."
            )

        username = options["username"]
        email    = options["email"]
        password = options["password"] or self._prompt_for_password()

        if User.objects.filter(username=username).exists():
            raise CommandError(f"A user with username '{username}' already exists.")
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError(f"A user with email '{email}' already exists.")

        try:
            validate_password(password)
        except DjangoValidationError as exc:
            raise CommandError(" ".join(exc.messages))

        with transaction.atomic():
            user = User.objects.create_superuser(
                username=username,
                email=email,
                password=password,
            )
            user.role              = User.Role.ADMIN
            user.full_name         = options["full_name"]
            user.is_email_verified = True  # admin bootstrap — no OTP flow needed
            user.save()

        self.stdout.write(self.style.SUCCESS(
            f"Admin account '{user.username}' created successfully."
        ))

    def _prompt_for_password(self):
        while True:
            password = getpass.getpass("Admin password: ")
            confirm  = getpass.getpass("Confirm password: ")
            if password != confirm:
                self.stderr.write(self.style.ERROR("Passwords didn't match. Try again."))
                continue
            if not password:
                self.stderr.write(self.style.ERROR("Password cannot be empty."))
                continue
            return password