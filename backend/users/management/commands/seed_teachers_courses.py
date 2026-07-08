"""
PKMC BIT — Teachers & Courses Seed Command
===========================================
Place this file at:
    any_app/management/commands/seed_teachers_courses.py

Run with:
    python manage.py seed_teachers_courses           # create teachers & courses
    python manage.py seed_teachers_courses --clear   # delete seeded data and re-create
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import date, timedelta
import random

User = get_user_model()

# ---------------------------------------------------------------------------
# Teacher data
# Format: (full_name, username, email)
# ---------------------------------------------------------------------------
TEACHERS = [
    ("Subash Siwa",        "subash.siwa",        "subash.siwa@pkmc.edu.np"),
    ("Arjun Lamichhane",   "arjun.lamichhane",   "arjun.lamichhane@pkmc.edu.np"),
    ("Kumar Prasun",       "kumar.prasun",        "kumar.prasun@pkmc.edu.np"),
    ("Bishnu Bhusal",      "bishnu.bhusal",       "bishnu.bhusal@pkmc.edu.np"),
    ("Ramesh Singh Saud",  "ramesh.saud",         "ramesh.saud@pkmc.edu.np"),
    ("Mohan Ayer",         "mohan.ayer",          "mohan.ayer@pkmc.edu.np"),
    ("Sudarshan Sharma",   "sudarshan.sharma",    "sudarshan.sharma@pkmc.edu.np"),
    ("Niraj Panta",        "niraj.panta",         "niraj.panta@pkmc.edu.np"),
    ("Sagar K.C.",         "sagar.kc",            "sagar.kc@pkmc.edu.np"),
    ("Santosh Dhungana",   "santosh.dhungana",    "santosh.dhungana@pkmc.edu.np"),
    ("Bhim Bahadur Rawat", "bhim.rawat",          "bhim.rawat@pkmc.edu.np"),
    ("Kishor Luitel",      "kishor.luitel",       "kishor.luitel@pkmc.edu.np"),
    ("Shrilata Wagle",     "shrilata.wagle",      "shrilata.wagle@pkmc.edu.np"),
    ("Saraswoti Katwal",   "saraswoti.katwal",    "saraswoti.katwal@pkmc.edu.np"),
    ("Yograj Joshi",       "yograj.joshi",        "yograj.joshi@pkmc.edu.np"),
    ("Anil Lamichhane",    "anil.lamichhane",     "anil.lamichhane@pkmc.edu.np"),
    ("Bimal Acharya",      "bimal.acharya",       "bimal.acharya@pkmc.edu.np"),
    ("Janak Raj Joshi",    "janak.joshi",         "janak.joshi@pkmc.edu.np"),
    ("Rakesh Bachhan",     "rakesh.bachhan",      "rakesh.bachhan@pkmc.edu.np"),
]

# ---------------------------------------------------------------------------
# Course data
# Format: (code, title, semester, teacher_username, description)
# ---------------------------------------------------------------------------
COURSES = [
    # Semester I
    ("BIT101", "Introduction to Information Technology", 1, "subash.siwa",
     "Fundamental concepts of information technology, computer systems, and digital tools."),
    ("BIT102", "C Programming", 1, "arjun.lamichhane",
     "Introduction to structured programming using the C language, covering syntax, control flow, functions, arrays, and pointers."),
    ("BIT103", "Digital Logic", 1, "kumar.prasun",
     "Boolean algebra, logic gates, combinational and sequential circuits, and digital system design."),
    ("SCO105", "Sociology", 1, "bishnu.bhusal",
     "Introduction to sociology, social structures, institutions, and the relationship between technology and society."),
    # Semester I (addition)
    ("MTH104", "Basic Mathematics", 1, "kishor.luitel",
     "Differential and integral calculus, matrices, vectors, and their applications to engineering and computing problems."),

    # Semester II
    ("BIT151", "Microprocessor and Computer Architecture", 2, "kumar.prasun",
     "Microprocessor architecture, instruction sets, assembly language programming, memory and I/O interfacing."),
    ("BIT153", "Object Oriented Programming", 2, "subash.siwa",
     "Principles of OOP using Java: classes, objects, inheritance, polymorphism, encapsulation, and exception handling."),
    # Semester II (additions)
    ("BIT152", "Discrete Structure", 2, "santosh.dhungana",
     "Set theory, relations, functions, propositional logic, graph theory, and combinatorics as applied to computer science."),
    ("STA154", "Basic Statistics", 2, "bimal.acharya",
     "Descriptive statistics, probability distributions, correlation, regression, and hypothesis testing for data analysis."),
    ("ECO155", "Economics", 2, "niraj.panta",
     "Microeconomic and macroeconomic principles, demand and supply, market structures, and their relevance to IT industry decisions."),

    # Semester III
    ("BIT201", "Data Structures and Algorithms", 3, "ramesh.saud",
     "Arrays, linked lists, stacks, queues, trees, graphs, sorting and searching algorithms, and algorithm complexity."),
    ("BIT202", "Database Management System", 3, "mohan.ayer",
     "Relational database concepts, ER modelling, normalization, SQL, transactions, and concurrency control."),
    ("BIT203", "Numerical Methods", 3, "arjun.lamichhane",
     "Numerical solutions of equations, interpolation, numerical differentiation and integration, and linear systems."),
    ("BIT204", "Operating Systems", 3, "sudarshan.sharma",
     "OS concepts: process management, scheduling, memory management, file systems, and deadlocks."),
    ("MGT205", "Principles of Management", 3, "niraj.panta",
     "Fundamentals of management: planning, organizing, leading, controlling, and organizational behaviour."),

    # Semester IV
    ("BIT251", "Web Technology I", 4, "sagar.kc",
     "HTML, CSS, JavaScript fundamentals, and introduction to client-side web development."),
    ("BIT252", "Artificial Intelligence", 4, "sudarshan.sharma",
     "AI concepts: search algorithms, knowledge representation, expert systems, and introduction to machine learning."),
    ("BIT253", "Systems Analysis and Design", 4, "santosh.dhungana",
     "SDLC, requirements analysis, structured and object-oriented design methods, and UML modelling."),
    ("BIT254", "Network and Data Communications", 4, "bhim.rawat",
     "Network models, data transmission, protocols, LAN/WAN technologies, and the TCP/IP stack."),
    ("ORS255", "Operations Research", 4, "kishor.luitel",
     "Linear programming, transportation, assignment problems, queuing theory, and decision analysis."),

    # Semester V
    ("BIT301", "Web Technology II", 5, "sagar.kc",
     "Server-side web development: PHP/frameworks, REST APIs, session management, and web security basics."),
    ("BIT302", "Software Engineering", 5, "ramesh.saud",
     "Software development models, requirements engineering, design patterns, testing, and project management."),
    ("BIT303", "Information Security", 5, "bhim.rawat",
     "Cryptography, network security, firewalls, intrusion detection, and ethical hacking fundamentals."),
    ("BIT304", "Computer Graphics", 5, "shrilata.wagle",
     "2D/3D graphics, transformations, clipping, projection, rendering, and OpenGL basics."),
    ("ENG305", "Technical Writing", 5, "saraswoti.katwal",
     "Technical communication skills: reports, documentation, proposals, and academic writing for IT professionals."),

    # Semester VI
    ("BIT351", "NET Centric Computing", 6, "sagar.kc",
     "Distributed computing, web services, SOA, XML, and cloud-based application development."),
    ("BIT352", "Database Administration", 6, "yograj.joshi",
     "Database administration tasks: installation, backup, recovery, performance tuning, and security management."),
    ("BIT353", "Management Information System", 6, "anil.lamichhane",
     "MIS concepts, decision support systems, ERP, and the role of information systems in organisations."),
    ("RSM354", "Research Methodology", 6, "bimal.acharya",
     "Research design, data collection methods, statistical analysis, and academic report writing."),
    ("BIT356", "Multimedia Computing (Elective I)", 6, "sudarshan.sharma",
     "Multimedia components, compression techniques, audio/video processing, and multimedia application development."),

    # Semester VII
    ("BIT401", "Advanced Java Programming", 7, "janak.joshi",
     "Advanced Java: collections, multithreading, JDBC, servlets, JSP, and Spring framework introduction."),
    ("BIT402", "Software Project Management", 7, "sudarshan.sharma",
     "Project planning, estimation, scheduling, risk management, and agile/scrum methodologies."),
    ("BIT403", "E-commerce", 7, "anil.lamichhane",
     "E-commerce models, payment systems, digital marketing, security, and legal aspects of online business."),
    ("BIT408", "Cloud Computing (Elective II)", 7, "rakesh.bachhan",
     "Cloud service models (IaaS/PaaS/SaaS), virtualization, deployment models, and major cloud platforms."),

    # Semester VIII (new)
    ("BIT451", "Network and System Administration", 8, "rakesh.bachhan",
     "Server administration, network configuration, user/permission management, system monitoring, and troubleshooting on Linux/Windows platforms."),
    ("BIT452", "E Governance", 8, "anil.lamichhane",
     "E-governance models, digital government services, ICT policy in Nepal, citizen service delivery systems, and case studies of government IT projects."),
    ("BIT454", "Data Warehousing and Data Mining", 8, "bhim.rawat",
     "Data warehouse architecture, OLAP, ETL processes, data mining techniques including classification, clustering, and association rule mining."),
]

# Approximate semester start and end dates (AD)
# Based on TU academic calendar pattern
# ---------------------------------------------------------------------------
# Current academic term (BS: ~1 Falgun 2082 – end of Shrawan 2083)
# Term shifted later than the usual Baishakh end due to 2082 election
# disruption. Only semesters 1, 3, 5, 7 are actively running (one batch per
# year, alternating odd/even semesters) — each starts a few days apart from
# the others rather than all on the same calendar day.
# ---------------------------------------------------------------------------
TERM_START = date(2026, 2, 13)   # ~1 Falgun 2082
TERM_END   = date(2026, 8, 16)    # ~end of Shrawan 2083

ACTIVE_SEMESTERS = [1, 3, 5, 7]

def _build_active_semester_dates():
    dates = {}
    for sem in ACTIVE_SEMESTERS:
        start = TERM_START + timedelta(days=random.randint(5, 20))
        dates[sem] = (start, TERM_END)
    return dates

SEMESTER_DATES = {
    **_build_active_semester_dates(),
    # Not currently active this cycle — placeholders until that batch's term begins
    2: (date(2022, 5, 1), date(2022, 10, 31)),
    4: (date(2023, 5, 1), date(2023, 10, 31)),
    6: (date(2024, 5, 1), date(2024, 10, 31)),
    8: (date(2025, 5, 1), date(2025, 10, 31)),
}


class Command(BaseCommand):
    help = "Seed PKMC BIT teacher accounts and courses."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all seeded teachers and courses before re-creating.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from courses.models import Course

        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing seeded teachers and courses..."))
            seeded_usernames = [t[1] for t in TEACHERS]
            deleted_courses, _ = Course.objects.filter(
                teacher__username__in=seeded_usernames
            ).delete()
            deleted_users, _ = User.objects.filter(
                username__in=seeded_usernames
            ).delete()
            self.stdout.write(self.style.SUCCESS(
                f"  Deleted {deleted_users} teachers and {deleted_courses} courses.\n"
            ))

        teachers_map = self._seed_teachers()
        self._seed_courses(teachers_map)

    # ------------------------------------------------------------------
    # Teachers
    # ------------------------------------------------------------------
    def _seed_teachers(self):
        self.stdout.write("\n[1/2] Creating teacher accounts...")
        teachers_map = {}
        created_count = 0
        skipped_count = 0

        for full_name, username, email in TEACHERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "full_name": full_name,
                    "role": User.Role.TEACHER,
                    "is_staff": False,
                },
            )
            if created:
                user.set_password("Teacher@123")
                user.save()
                self.stdout.write(f"    ✓ Created  — {full_name} ({username})")
                created_count += 1
            else:
                self.stdout.write(f"    ~ Exists   — {full_name} ({username})")
                skipped_count += 1

            teachers_map[username] = user

        self.stdout.write(
            f"\n    Created: {created_count}  |  Already existed: {skipped_count}  |  Total: {len(teachers_map)}"
        )
        return teachers_map

    # ------------------------------------------------------------------
    # Courses
    # ------------------------------------------------------------------
    def _seed_courses(self, teachers_map):
        from courses.models import Course

        self.stdout.write("\n[2/2] Creating courses...")
        created_count = 0
        skipped_count = 0
        updated_count = 0

        for code, title, semester, teacher_username, description in COURSES:
            teacher = teachers_map.get(teacher_username)
            if not teacher:
                self.stdout.write(
                    self.style.WARNING(f"    ⚠ Teacher '{teacher_username}' not found — skipping {code}.")
                )
                continue

            start_date, end_date = SEMESTER_DATES.get(semester, (date(2021, 11, 1), date(2025, 4, 30)))

            course, created = Course.objects.get_or_create(
                title=f"{code} — {title}",
                defaults={
                    "description": description,
                    "teacher": teacher,
                    "start_date": start_date,
                    "end_date": end_date,
                },
            )
            if created:
                self.stdout.write(f"    ✓ Sem {semester}  {code} — {title}")
                created_count += 1
            else:
                # get_or_create only applies `defaults` on creation, so an
                # existing course's start_date/end_date would otherwise stay
                # frozen at whatever they were the first time this ran --
                # always sync them here so changes to SEMESTER_DATES (e.g.
                # the Falgun-Shrawan term shift) actually take effect.
                if course.start_date != start_date or course.end_date != end_date:
                    course.start_date = start_date
                    course.end_date = end_date
                    course.save(update_fields=["start_date", "end_date"])
                    self.stdout.write(
                        f"    ~ Updated dates  {code} — {title}  ({start_date} to {end_date})"
                    )
                    updated_count += 1
                else:
                    self.stdout.write(f"    ~ Exists  {code} — {title}")
                skipped_count += 1

        self.stdout.write(
            f"\n    Created: {created_count}  |  Dates updated: {updated_count}  |  "
            f"Unchanged: {skipped_count - updated_count}  |  Total: {created_count + skipped_count}"
        )

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Teachers : {len(teachers_map)}")
        self.stdout.write(f"  Courses  : {created_count + skipped_count}")
        self.stdout.write(f"  Dates refreshed on existing courses: {updated_count}")
        self.stdout.write("\n  Default teacher password: Teacher@123")
        self.stdout.write("=" * 60 + "\n")