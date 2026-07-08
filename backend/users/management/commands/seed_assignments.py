"""
PKMC BIT — Assignments Seed Command (Updated)
===============================================
Place this file at:
    any_app/management/commands/seed_assignments.py

Run with:
    python manage.py seed_assignments             # create assignments
    python manage.py seed_assignments --refresh   # also refresh due dates on existing assignments
    python manage.py seed_assignments --clear     # delete and re-create everything

Notes:
    - Practical-heavy courses (BIT-coded) get 4 items: 1 major end-of-semester
        Lab Report (covers all practical work for the course, submitted to both
        the internal teacher and external invigilator) + 3 minor items (a mix
        of assignment/homework)
    - Theory-only courses (SCO, MGT, ENG, ORS, RSM) get 5 items: 1 written
        assignment + 2 presentation-style assignments + 1 quiz + 1 homework
    - Due dates are calculated as a PERCENTAGE OF EACH COURSE'S ACTUAL TERM
        (course.start_date -> course.end_date), not relative to "today". This
        means due dates stay correctly positioned within the semester no
        matter when you run this command.
    - Because assignments are matched by title+course, re-running this
        command normally SKIPS existing assignments and does not touch their
        due dates. Use --refresh to recompute and update due_date (and
        task_type/estimated_hours/priority) on existing assignments -- safe
        to run any time before a demo/presentation, and does not delete
        student Task history the way --clear would.
    - Due dates never fall on Saturday or a Nepali public holiday
    - Priority: Exam=5, Project=4, Assignment=3, Quiz=2, Homework=1
    - Estimated hours vary by task type and topic complexity
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import date, timedelta
import random

User = get_user_model()

# ---------------------------------------------------------------------------
# Nepali public holidays (AD dates) — hardcoded so due dates can avoid them
# even before seed_holidays has been run.
# ---------------------------------------------------------------------------
HOLIDAY_DATES = {
    # 2025
    date(2025, 4, 14), date(2025, 5, 1),  date(2025, 5, 12), date(2025, 5, 29),
    date(2025, 8, 9),  date(2025, 8, 10), date(2025, 8, 16), date(2025, 8, 26),
    date(2025, 8, 31), date(2025, 9, 6),  date(2025, 9, 15), date(2025, 9, 19),
    date(2025, 9, 22), date(2025, 9, 29), date(2025, 9, 30), date(2025, 10, 1),
    date(2025, 10, 2), date(2025, 10, 3), date(2025, 10, 4), date(2025, 10, 20),
    date(2025, 10, 21),date(2025, 10, 22),date(2025, 10, 23),date(2025, 10, 24),
    date(2025, 10, 27),date(2025, 12, 25),
    # 2026
    date(2026, 1, 15), date(2026, 1, 30), date(2026, 2, 15), date(2026, 2, 19),
    date(2026, 3, 2),  date(2026, 3, 3),  date(2026, 3, 8),  date(2026, 4, 14),
    date(2026, 5, 1),  date(2026, 5, 29), date(2026, 8, 28), date(2026, 8, 29),
    date(2026, 9, 4),  date(2026, 9, 14), date(2026, 9, 19), date(2026, 9, 25),
    date(2026, 10, 4), date(2026, 10, 11),date(2026, 10, 17),date(2026, 10, 18),
    date(2026, 10, 20),date(2026, 10, 21),date(2026, 10, 22),date(2026, 11, 8),
    date(2026, 11, 10),date(2026, 11, 11),date(2026, 11, 15),date(2026, 12, 3),
    date(2026, 12, 24),date(2026, 12, 25),date(2026, 12, 30),
    # 2027
    date(2027, 1, 11), date(2027, 1, 15), date(2027, 1, 30), date(2027, 2, 7),
    date(2027, 2, 19), date(2027, 3, 6),  date(2027, 3, 8),  date(2027, 3, 9),
    date(2027, 3, 21), date(2027, 3, 22), date(2027, 4, 6),
}


def is_off_day(d):
    """Return True if the date is a Saturday (weekday=5) or a holiday."""
    return d.weekday() == 5 or d in HOLIDAY_DATES


def term_pct(course, pct_min, pct_max):
    """
    Return a random date that falls between pct_min and pct_max of the way
    through the given course's term (course.start_date -> course.end_date),
    skipping Saturdays and holidays.

    This is calculated relative to the COURSE'S ACTUAL TERM DATES, not to
    "today" -- so due dates stay correctly positioned within the semester
    no matter when this command is run, and re-running the command with
    the --refresh behavior below will recompute a fresh (but still
    correctly-positioned) date rather than going stale.
    """
    span_days = (course.end_date - course.start_date).days
    if span_days <= 0:
        return course.start_date

    lo = int(span_days * pct_min)
    hi = int(span_days * pct_max)
    if hi <= lo:
        hi = lo + 1

    for _ in range(60):  # max attempts
        offset = random.randint(lo, hi)
        d = course.start_date + timedelta(days=offset)
        if not is_off_day(d):
            return d

    # Fallback: walk forward from the low end until a safe day is found
    d = course.start_date + timedelta(days=lo)
    while is_off_day(d):
        d += timedelta(days=1)
    return d


# ---------------------------------------------------------------------------
# Assignment data per course
# Format: (title, task_type, due_date_fn, priority, estimated_hours)
# ---------------------------------------------------------------------------

COURSE_ASSIGNMENTS = {

    # -----------------------------------------------------------------------
    # BIT101 — Introduction to Information Technology (Sem 1) — Practical
    # Teacher: Subash Siwa
    # -----------------------------------------------------------------------
    "BIT101": [
        ("Lab Report: Hardware Components and OS Exploration (Complete Semester Lab)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 9.0),
        ("Homework: Number System Conversions (Binary, Octal, Hex)",
         "homework",   lambda c: term_pct(c, 0.26, 0.35), 1, 1.5),
        ("Assignment: Research on ISPs in Nepal and Their Services",
         "assignment", lambda c: term_pct(c, 0.36, 0.45), 3, 2.5),
        ("Homework: Database Systems — DBMS vs File System Comparison",
         "homework",   lambda c: term_pct(c, 0.62, 0.68), 1, 1.5),
    ],

    # -----------------------------------------------------------------------
    # BIT102 — C Programming (Sem 1) — Practical
    # Teacher: Arjun Lamichhane
    # -----------------------------------------------------------------------
    "BIT102": [
        ("Lab Report: Complete C Programming Lab (All Units)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Write a C Program using Control Structures",
         "homework",   lambda c: term_pct(c, 0.19, 0.28), 1, 2.0),
        ("Assignment: Implement Array and String Manipulation Programs",
         "assignment", lambda c: term_pct(c, 0.29, 0.38), 3, 3.0),
        ("Assignment: Pointer and Dynamic Memory Allocation Programs",
         "assignment", lambda c: term_pct(c, 0.58, 0.67), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # BIT103 — Digital Logic (Sem 1) — Practical
    # Teacher: Kumar Prasun
    # -----------------------------------------------------------------------
    "BIT103": [
        ("Lab Report: Complete Digital Logic Lab (Combinational & Sequential Circuits)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 9.0),
        ("Homework: Number System Conversions and Binary Arithmetic",
         "homework",   lambda c: term_pct(c, 0.12, 0.22), 1, 1.5),
        ("Assignment: Boolean Algebra Simplification using K-Map",
         "assignment", lambda c: term_pct(c, 0.22, 0.32), 3, 2.5),
        ("Assignment: Design of ALU and Processor Logic",
         "assignment", lambda c: term_pct(c, 0.68, 0.78), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # MTH104 — Basic Mathematics (Sem 1) — Practical
    # Teacher: Kishor Luitel
    # -----------------------------------------------------------------------
    "MTH104": [
        ("Lab Report: Solve Calculus and Matrix Problems using Python/MATLAB",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 8.0),
        ("Homework: Differentiation and Integration Practice Problems",
         "homework",   lambda c: term_pct(c, 0.15, 0.25), 1, 1.5),
        ("Assignment: Application of Matrices — Solve Systems of Linear Equations",
         "assignment", lambda c: term_pct(c, 0.26, 0.35), 3, 3.0),
        ("Assignment: Vector Calculus — Gradient, Divergence, and Curl Problems",
         "assignment", lambda c: term_pct(c, 0.62, 0.70), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # SCO105 — Sociology (Sem 1) — Theory | No lab report
    # Teacher: Bishnu Bhusal
    # -----------------------------------------------------------------------
    "SCO105": [
        ("Assignment: Research Report on Social Institutions in Nepal",
         "assignment", lambda c: term_pct(c, 0.29, 0.42), 3, 4.0),
        ("Presentation: Introduction to Sociology and its Scope",
         "assignment", lambda c: term_pct(c, 0.08, 0.18), 3, 2.5),
        ("Presentation: Social Stratification and Caste System in Nepal",
         "assignment", lambda c: term_pct(c, 0.58, 0.67), 3, 3.0),
        ("Quiz 2: Social Structure and Institutions",
         "quiz",       lambda c: term_pct(c, 0.62, 0.68), 2, 1.0),
        ("Homework: Write a Note on Social Norms and Values",
         "homework",   lambda c: term_pct(c, 0.19, 0.28), 1, 1.5),
    ],

    # -----------------------------------------------------------------------
    # BIT151 — Microprocessor and Computer Architecture (Sem 2) — Practical
    # Teacher: Kumar Prasun
    # -----------------------------------------------------------------------
    "BIT151": [
        ("Lab Report: Complete Intel 8085 Assembly Language Lab",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Microprocessor Architecture — Register Organization",
         "homework",   lambda c: term_pct(c, 0.12, 0.22), 1, 1.5),
        ("Assignment: Write and Trace 8085 Assembly Programs for Arithmetic Operations",
         "assignment", lambda c: term_pct(c, 0.22, 0.32), 3, 4.0),
        ("Assignment: Research on I/O Organization and Interrupt Handling",
         "assignment", lambda c: term_pct(c, 0.68, 0.78), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # BIT152 — Discrete Structure (Sem 2) — Practical
    # Teacher: Santosh Dhungana
    # -----------------------------------------------------------------------
    "BIT152": [
        ("Lab Report: Implement Set, Relation, and Graph Operations in Python",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 8.0),
        ("Homework: Propositional Logic — Truth Tables and Logical Equivalences",
         "homework",   lambda c: term_pct(c, 0.15, 0.25), 1, 1.5),
        ("Assignment: Prove Statements using Mathematical Induction",
         "assignment", lambda c: term_pct(c, 0.26, 0.35), 3, 3.0),
        ("Assignment: Graph Theory — Trees, Traversals, and Shortest Path Problems",
         "assignment", lambda c: term_pct(c, 0.62, 0.70), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # BIT153 — Object Oriented Programming (Sem 2) — Practical
    # Teacher: Subash Siwa
    # -----------------------------------------------------------------------
    "BIT153": [
        ("Lab Report: Complete OOP Lab using C++ (Classes, Inheritance, Templates, File Handling)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 11.0),
        ("Homework: Implement Class and Object Programs in C++",
         "homework",   lambda c: term_pct(c, 0.13, 0.23), 1, 2.0),
        ("Assignment: Operator Overloading Programs in C++",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.5),
        ("Assignment: Implement Inheritance and Polymorphism in C++",
         "assignment", lambda c: term_pct(c, 0.34, 0.43), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # STA154 — Basic Statistics (Sem 2) — Practical
    # Teacher: Bimal Acharya
    # -----------------------------------------------------------------------
    "STA154": [
        ("Lab Report: Descriptive Statistics and Regression Analysis using Excel/R",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 7.0),
        ("Homework: Measures of Central Tendency and Dispersion Practice Problems",
         "homework",   lambda c: term_pct(c, 0.15, 0.25), 1, 1.5),
        ("Assignment: Probability Distributions — Binomial and Normal Distribution Problems",
         "assignment", lambda c: term_pct(c, 0.26, 0.35), 3, 3.0),
        ("Assignment: Hypothesis Testing and Correlation Analysis on Sample Data",
         "assignment", lambda c: term_pct(c, 0.62, 0.70), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # ECO155 — Economics (Sem 2) — Theory | No lab report
    # Teacher: Niraj Panta
    # -----------------------------------------------------------------------
    "ECO155": [
        ("Assignment: Analyze Demand and Supply Trends in the Nepali IT Market",
         "assignment", lambda c: term_pct(c, 0.26, 0.35), 3, 3.5),
        ("Presentation: Market Structures — Perfect Competition vs Monopoly",
         "assignment", lambda c: term_pct(c, 0.12, 0.22), 3, 2.5),
        ("Presentation: Macroeconomic Indicators and Their Impact on Nepal's Economy",
         "assignment", lambda c: term_pct(c, 0.60, 0.68), 3, 3.0),
        ("Quiz 1: Fundamentals of Micro and Macro Economics",
         "quiz",       lambda c: term_pct(c, 0.15, 0.25), 2, 1.0),
        ("Homework: Write a Note on Opportunity Cost and Scarcity",
         "homework",   lambda c: term_pct(c, 0.65, 0.74), 1, 1.5),
    ],

    # -----------------------------------------------------------------------
    # BIT201 — Data Structures and Algorithms (Sem 3) — Practical
    # Teacher: Ramesh Singh Saud
    # -----------------------------------------------------------------------
    "BIT201": [
        ("Lab Report: Complete DSA Lab (Stacks, Queues, Trees, Graphs, Sorting, Hashing)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 11.0),
        ("Homework: Algorithm Analysis — Big O Notation Practice Problems",
         "homework",   lambda c: term_pct(c, 0.15, 0.23), 1, 1.5),
        ("Assignment: Implement Binary Search Tree Operations",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.0),
        ("Assignment: Sorting Algorithms — Implement and Compare Performance",
         "assignment", lambda c: term_pct(c, 0.34, 0.43), 3, 4.5),
    ],

    # -----------------------------------------------------------------------
    # BIT202 — Database Management System (Sem 3) — Practical
    # Teacher: Mohan Ayer
    # -----------------------------------------------------------------------
    "BIT202": [
        ("Lab Report: Complete DBMS Lab (SQL, Normalization, Transactions, Concurrency)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 11.0),
        ("Homework: Draw ER Diagram for a Library Management System",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Normalization — Convert Relations to 3NF and BCNF",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.5),
        ("Assignment: Write Complex SQL Queries (Joins, Subqueries, Aggregates)",
         "assignment", lambda c: term_pct(c, 0.34, 0.43), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # BIT203 — Numerical Methods (Sem 3) — Practical
    # Teacher: Arjun Lamichhane
    # -----------------------------------------------------------------------
    "BIT203": [
        ("Lab Report: Complete Numerical Methods Lab using C/Python Programs",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Solve Nonlinear Equations using Bisection and Newton-Raphson",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Interpolation Problems — Newton Forward and Backward",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.0),
        ("Homework: Solve ODEs using Euler's and Runge-Kutta Methods",
         "homework",   lambda c: term_pct(c, 0.70, 0.79), 1, 2.5),
    ],

    # -----------------------------------------------------------------------
    # BIT204 — Operating Systems (Sem 3) — Practical
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT204": [
        ("Lab Report: Complete OS Lab (Scheduling, IPC, Synchronization)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Compare FCFS, SJF, and Round Robin Scheduling",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Memory Management — Paging and Segmentation Problems",
         "assignment", lambda c: term_pct(c, 0.34, 0.45), 3, 3.5),
        ("Assignment: Presentation on Deadlock — Detection, Prevention, Avoidance",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.0),
    ],

    # -----------------------------------------------------------------------
    # MGT205 — Principles of Management (Sem 3) — Theory | No lab report
    # Teacher: Niraj Panta
    # -----------------------------------------------------------------------
    "MGT205": [
        ("Assignment: Case Study — Decision Making in IT Companies",
         "assignment", lambda c: term_pct(c, 0.27, 0.36), 3, 4.0),
        ("Presentation: Evolution of Management Theories",
         "assignment", lambda c: term_pct(c, 0.08, 0.18), 3, 2.5),
        ("Presentation: Leadership Styles and Communication in IT Teams",
         "assignment", lambda c: term_pct(c, 0.68, 0.78), 3, 3.0),
        ("Quiz 2: Planning, Organizing, Motivation, and Leadership",
         "quiz",       lambda c: term_pct(c, 0.62, 0.70), 2, 1.0),
        ("Homework: Essay on Motivation Theories — Maslow vs Herzberg",
         "homework",   lambda c: term_pct(c, 0.58, 0.67), 1, 2.0),
    ],

    # -----------------------------------------------------------------------
    # BIT251 — Web Technology I (Sem 4) — Practical
    # Teacher: Sagar K.C.
    # -----------------------------------------------------------------------
    "BIT251": [
        ("Lab Report: Complete Static Website Project using HTML, CSS, JS",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 12.0),
        ("Homework: Create a Structured Web Page using HTML5 Semantic Tags",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Style a Multi-Page Website using CSS (Flexbox and Grid)",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.0),
        ("Assignment: Build an Interactive Form with JavaScript Validation",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.5),
    ],

    # -----------------------------------------------------------------------
    # BIT252 — Artificial Intelligence (Sem 4) — Practical
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT252": [
        ("Lab Report: Complete AI Lab (Search Algorithms and Rule-Based Expert System)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Trace BFS and DFS on a State Space Graph",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Presentation on Knowledge Representation — Frames and Logic",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.0),
        ("Assignment: Research Report on Machine Learning Applications in Nepal",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # BIT253 — Systems Analysis and Design (Sem 4) — Practical
    # Teacher: Santosh Dhungana
    # -----------------------------------------------------------------------
    "BIT253": [
        ("Lab Report: Complete System Design Document for a Mini Project",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 12.0),
        ("Homework: Compare Waterfall, Agile, and Spiral SDLC Models",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Prepare a Feasibility Report for a Proposed IT System",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 5.0),
        ("Assignment: Draw ERD, DFD, and System Flowchart for a College System",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 5.0),
    ],

    # -----------------------------------------------------------------------
    # BIT254 — Network and Data Communications (Sem 4) — Practical
    # Teacher: Bhim Bahadur Rawat
    # -----------------------------------------------------------------------
    "BIT254": [
        ("Lab Report: Complete Networking Lab (Configuration, Subnetting, Routing Protocols)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Compare Transmission Media — Twisted Pair, Coaxial, Fiber",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 1.5),
        ("Assignment: Presentation on OSI Model vs TCP/IP Model",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.0),
        ("Assignment: Subnet a Network — VLSM and CIDR Problems",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # ORS255 — Operations Research (Sem 4) — Theory | No lab report
    # Teacher: Kishor Luitel
    # -----------------------------------------------------------------------
    "ORS255": [
        ("Assignment: Solve Transportation and Assignment Problems",
         "assignment", lambda c: term_pct(c, 0.18, 0.27), 3, 3.5),
        ("Assignment: Game Theory — Solve Two-Person Zero-Sum Games",
         "assignment", lambda c: term_pct(c, 0.37, 0.46), 3, 3.0),
        ("Assignment: Decision Theory — Apply Maximin, Maximax, EMV Criteria",
         "assignment", lambda c: term_pct(c, 0.70, 0.79), 3, 3.5),
        ("Quiz 2: Transportation, Queuing Theory, and Game Theory",
         "quiz",       lambda c: term_pct(c, 0.60, 0.68), 2, 1.0),
        ("Homework: Solve Queuing Theory Problems (M/M/1 Queue)",
         "homework",   lambda c: term_pct(c, 0.27, 0.36), 1, 2.0),
    ],

    # -----------------------------------------------------------------------
    # BIT301 — Web Technology II (Sem 5) — Practical
    # Teacher: Sagar K.C.
    # -----------------------------------------------------------------------
    "BIT301": [
        ("Lab Report: Complete PHP MVC Project with Authentication",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 14.0),
        ("Homework: Write PHP Functions for String and Array Manipulation",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Build a User Registration and Login System in PHP",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 5.0),
        ("Assignment: Create a CRUD Application using PHP and MySQL",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 6.0),
    ],

    # -----------------------------------------------------------------------
    # BIT302 — Software Engineering (Sem 5) — Practical
    # Teacher: Ramesh Singh Saud
    # -----------------------------------------------------------------------
    "BIT302": [
        ("Lab Report: Complete Software Design Document (UML, Architecture, SRS)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 12.0),
        ("Homework: Compare Waterfall and Agile Process Models",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Write a Software Requirements Specification (SRS) Document",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 6.0),
        ("Assignment: Design Architecture using UML (Class, Sequence, Activity Diagrams)",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 5.0),
    ],

    # -----------------------------------------------------------------------
    # BIT303 — Information Security (Sem 5) — Practical
    # Teacher: Bhim Bahadur Rawat
    # -----------------------------------------------------------------------
    "BIT303": [
        ("Lab Report: Complete Security Lab (Encryption, Firewall Configuration, IDS)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Compare Symmetric and Asymmetric Encryption (AES vs RSA)",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Presentation on Digital Signatures and PKI",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.0),
        ("Assignment: Research Report on Malware Types and Prevention in Nepal",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # BIT304 — Computer Graphics (Sem 5) — Practical
    # Teacher: Shrilata Wagle
    # -----------------------------------------------------------------------
    "BIT304": [
        ("Lab Report: Complete Graphics Lab (Drawing Algorithms, Transformations, 3D Rendering)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Derive Bresenham's Line Drawing Algorithm",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Apply 2D Transformations — Translation, Rotation, Scaling",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.5),
        ("Assignment: Implement 2D Viewing and Clipping Algorithms",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # ENG305 — Technical Writing (Sem 5) — Theory | No lab report
    # Teacher: Saraswoti Katwal
    # -----------------------------------------------------------------------
    "ENG305": [
        ("Assignment: Prepare a Formal Report on a Technical Topic",
         "assignment", lambda c: term_pct(c, 0.37, 0.46), 3, 5.0),
        ("Presentation: Prepare an Oral Presentation Outline on an IT Topic",
         "assignment", lambda c: term_pct(c, 0.58, 0.67), 3, 2.0),
        ("Presentation: Write a Short Technical Proposal for a Software Project",
         "assignment", lambda c: term_pct(c, 0.27, 0.36), 3, 4.0),
        ("Quiz 1: Technical Sentences, Emails, Letters, and Memos",
         "quiz",       lambda c: term_pct(c, 0.14, 0.23), 2, 1.0),
        ("Homework: Rewrite Unclear Technical Sentences for Clarity",
         "homework",   lambda c: term_pct(c, 0.16, 0.27), 1, 1.5),
    ],

    # -----------------------------------------------------------------------
    # BIT351 — NET Centric Computing (Sem 6) — Practical
    # Teacher: Sagar K.C.
    # -----------------------------------------------------------------------
    "BIT351": [
        ("Lab Report: Complete ASP.NET Core MVC Application with Authentication",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 14.0),
        ("Homework: Explain SOA Architecture and its Components",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Create a RESTful API using ASP.NET Core MVC",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 6.0),
        ("Assignment: Implement Database Integration in ASP.NET Core Application",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 6.0),
    ],

    # -----------------------------------------------------------------------
    # BIT352 — Database Administration (Sem 6) — Practical
    # Teacher: Yograj Joshi
    # -----------------------------------------------------------------------
    "BIT352": [
        ("Lab Report: Complete DBA Lab (Administration, Backup, Recovery, Auditing)",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 11.0),
        ("Homework: Explain Database Storage Structures and Tablespaces",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Create Users, Assign Roles, and Manage Privileges in Oracle",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.0),
        ("Assignment: Implement Backup and Recovery Strategy for a Database",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 5.0),
    ],

    # -----------------------------------------------------------------------
    # BIT353 — Management Information System (Sem 6) — Practical
    # Teacher: Anil Lamichhane
    # -----------------------------------------------------------------------
    "BIT353": [
        ("Lab Report: Design a Complete MIS for a Nepali Organization",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 11.0),
        ("Homework: Research on Role of IS in Nepali Government Organizations",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Presentation on ERP Systems — SAP vs Oracle",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.0),
        ("Assignment: Case Study on Ethical Issues in Information Systems in Nepal",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # RSM354 — Research Methodology (Sem 6) — Theory | No lab report
    # Teacher: Bimal Acharya
    # -----------------------------------------------------------------------
    "RSM354": [
        ("Assignment: Write a Literature Review on a Chosen IT Research Area",
         "assignment", lambda c: term_pct(c, 0.27, 0.36), 3, 6.0),
        ("Presentation: Prepare a Research Proposal on an IT Topic",
         "assignment", lambda c: term_pct(c, 0.18, 0.27), 3, 5.0),
        ("Presentation: Analyze Sample Data and Prepare a Statistical Report",
         "assignment", lambda c: term_pct(c, 0.65, 0.75), 3, 5.0),
        ("Quiz 1: Introduction to Research, Types, and Research Design",
         "quiz",       lambda c: term_pct(c, 0.14, 0.23), 2, 1.0),
        ("Homework: Design a Questionnaire for Primary Data Collection",
         "homework",   lambda c: term_pct(c, 0.37, 0.46), 1, 2.5),
    ],

    # -----------------------------------------------------------------------
    # BIT356 — Multimedia Computing, Elective I (Sem 6) — Practical
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT356": [
        ("Lab Report: Build a Multimedia Application with User Interface",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 12.0),
        ("Homework: Compare Lossy vs Lossless Compression Formats",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 1.5),
        ("Assignment: Create a Multimedia Presentation using Animation and Sound",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.0),
        ("Assignment: Implement Image Processing Techniques (Grayscale, Filtering)",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.5),
    ],

    # -----------------------------------------------------------------------
    # BIT401 — Advanced Java Programming (Sem 7) — Practical
    # Teacher: Janak Raj Joshi
    # -----------------------------------------------------------------------
    "BIT401": [
        ("Lab Report: Build a Java Web Application using Servlets and JSP",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 14.0),
        ("Homework: Implement Java Collections Framework — List, Set, Map",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Build a GUI Application using Java Swing Components",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 5.0),
        ("Assignment: Implement JDBC — Connect Java Application to PostgreSQL",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 5.0),
    ],

    # -----------------------------------------------------------------------
    # BIT402 — Software Project Management (Sem 7) — Practical
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT402": [
        ("Lab Report: Agile Sprint Planning and Retrospective Documentation",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Compare COCOMO and Function Point Estimation Models",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Prepare a Project Charter and Scope Statement",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.0),
        ("Assignment: Create a Gantt Chart and Network Diagram for a Software Project",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.5),
    ],

    # -----------------------------------------------------------------------
    # BIT403 — E-commerce (Sem 7) — Practical
    # Teacher: Anil Lamichhane
    # -----------------------------------------------------------------------
    "BIT403": [
        ("Lab Report: Complete E-commerce System with Cart and Payment Flow",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 14.0),
        ("Homework: Compare B2B, B2C, C2C, and C2B E-commerce Models",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Research Report on E-commerce Security Threats and Solutions",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.0),
        ("Assignment: Analyze E-payment Systems Used in Nepal (eSewa, Khalti, etc.)",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # BIT408 — Cloud Computing, Elective II (Sem 7) — Practical
    # Teacher: Rakesh Bachhan
    # -----------------------------------------------------------------------
    "BIT408": [
        ("Lab Report: Implement Cloud-Based Analytics Pipeline",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Compare IaaS, PaaS, and SaaS with Real-world Examples",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 1.5),
        ("Assignment: Presentation on Virtualization Technologies — VMware vs Docker",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 3.0),
        ("Assignment: Design a Cloud Architecture for a Web Application",
         "assignment", lambda c: term_pct(c, 0.65, 0.75), 3, 5.0),
    ],

    # -----------------------------------------------------------------------
    # BIT451 — Network and System Administration (Sem 8) — Practical
    # Teacher: Rakesh Bachhan
    # -----------------------------------------------------------------------
    "BIT451": [
        ("Lab Report: Complete Linux/Windows Server Administration Lab",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Compare Linux and Windows Server User/Permission Models",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Configure DNS, DHCP, and File Sharing Services",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.5),
        ("Assignment: System Monitoring and Log Analysis for Troubleshooting",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # BIT452 — E Governance (Sem 8) — Practical
    # Teacher: Anil Lamichhane
    # -----------------------------------------------------------------------
    "BIT452": [
        ("Lab Report: Design a Prototype E-Governance Citizen Service Portal",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 9.0),
        ("Homework: Compare E-Governance Models — G2C, G2B, G2G",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Case Study on a Nepali Government Digital Service (Nagarik App, etc.)",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 4.0),
        ("Assignment: Analyze ICT Policy and Digital Nepal Framework",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # BIT454 — Data Warehousing and Data Mining (Sem 8) — Practical
    # Teacher: Bhim Rawat
    # -----------------------------------------------------------------------
    "BIT454": [
        ("Lab Report: Build a Data Warehouse Schema and ETL Pipeline",
         "assignment", lambda c: term_pct(c, 0.75, 0.85), 4, 10.0),
        ("Homework: Compare Star Schema and Snowflake Schema Designs",
         "homework",   lambda c: term_pct(c, 0.14, 0.23), 1, 2.0),
        ("Assignment: Implement Classification Algorithms (Decision Tree, Naive Bayes)",
         "assignment", lambda c: term_pct(c, 0.24, 0.33), 3, 5.0),
        ("Assignment: Apply Clustering and Association Rule Mining on a Sample Dataset",
         "assignment", lambda c: term_pct(c, 0.35, 0.45), 3, 5.0),
    ],
}


class Command(BaseCommand):
    help = "Seed assignments for all active PKMC BIT courses (due dates avoid Saturdays and holidays)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all seeded assignments before re-creating.",
        )
        parser.add_argument(
            "--refresh",
            action="store_true",
            help=(
                "Recompute and update due_date/task_type/estimated_hours/priority "
                "for assignments that already exist, instead of skipping them. "
                "Safe to run before a demo/presentation to fix stale due dates "
                "without needing --clear (keeps existing student Task history)."
            ),
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from tasks.models import Assignment
        from courses.models import Course, Enrollment

        refresh_dates = options["refresh"]

        if options["clear"]:
            self.stdout.write(self.style.WARNING("Clearing seeded assignments..."))
            seeded_courses = Course.objects.filter(
                title__regex=r'^BIT[0-9]|^SCO|^MGT|^ENG|^ORS|^RSM'
            )
            deleted, _ = Assignment.objects.filter(course__in=seeded_courses).delete()
            self.stdout.write(self.style.SUCCESS(f"  Deleted {deleted} assignments.\n"))

        self.stdout.write("\nCreating assignments...")
        self.stdout.write("=" * 60)

        total_created = 0
        total_skipped = 0
        total_errors = 0
        total_no_students = 0

        for course_code, assignments in COURSE_ASSIGNMENTS.items():
            course = Course.objects.filter(title__startswith=course_code).first()
            if not course:
                self.stdout.write(
                    self.style.WARNING(f"  ⚠ Course {course_code} not found — skipping.")
                )
                total_errors += 1
                continue

            if not Enrollment.objects.filter(course=course).exists():
                self.stdout.write(
                    f"  ~ {course_code} — no enrolled students (course not currently running) — skipping."
                )
                total_no_students += 1
                continue

            teacher = course.teacher
            course_created = 0
            course_skipped = 0

            self.stdout.write(f"\n  {course_code} — {teacher.full_name}")
            self.stdout.write("  " + "-" * 50)

            for title, task_type, due_fn, priority, est_hours in assignments:
                due_date = due_fn(course)
                existing = Assignment.objects.filter(title=title, course=course).first()

                if existing:
                    if refresh_dates:
                        existing.due_date = due_date
                        existing.task_type = task_type
                        existing.estimated_hours = est_hours
                        existing.priority = priority
                        existing.save()
                        self.stdout.write(
                            f"    ~ Refreshed: {title[:58]} — due {due_date}"
                        )
                    else:
                        self.stdout.write(f"    ~ Exists  : {title[:65]}")
                    course_skipped += 1
                    total_skipped += 1
                    continue

                Assignment.objects.create(
                    title=title,
                    description=(
                        f"{title}. Submitted as part of "
                        f"{course.title.split('(')[0].strip()} coursework."
                    ),
                    course=course,
                    created_by=teacher,
                    due_date=due_date,
                    task_type=task_type,
                    estimated_hours=est_hours,
                    priority=priority,
                )
                self.stdout.write(
                    f"    ✓ [{task_type.upper()[:3]}] {title[:58]} — due {due_date}"
                )
                course_created += 1
                total_created += 1

            self.stdout.write(
                f"\n    Created: {course_created}  |  Already existed: {course_skipped}"
            )

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("  SUMMARY")
        self.stdout.write("=" * 60)
        self.stdout.write(f"  Assignments created : {total_created}")
        self.stdout.write(f"  Already existed     : {total_skipped}")
        self.stdout.write(f"  Courses not found   : {total_errors}")
        self.stdout.write(f"  Courses skipped (no students yet): {total_no_students}")
        self.stdout.write(f"  Grand total         : {total_created + total_skipped}")
        self.stdout.write("=" * 60 + "\n")