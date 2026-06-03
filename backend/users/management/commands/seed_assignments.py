"""
PKMC BIT — Assignments Seed Command (Updated)
===============================================
Place this file at:
    any_app/management/commands/seed_assignments.py

Run with:
    python manage.py seed_assignments           # create assignments
    python manage.py seed_assignments --clear   # delete and re-create

Notes:
    - BIT-coded courses get a Lab Report assignment (mandatory per TU evaluation policy)
    - Non-BIT courses (SCO, MGT, ENG, ORS, RSM) do not get lab reports
    - Semester is considered ~50% complete: mix of past and future due dates
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


def safe_past(days_min, days_max):
    """Return a random past date that is not a Saturday or holiday."""
    for _ in range(60):  # max attempts
        d = date.today() - timedelta(days=random.randint(days_min, days_max))
        if not is_off_day(d):
            return d
    # Fallback: walk backwards from days_min until a safe day is found
    d = date.today() - timedelta(days=days_min)
    while is_off_day(d):
        d -= timedelta(days=1)
    return d


def safe_future(days_min, days_max):
    """Return a random future date that is not a Saturday or holiday."""
    for _ in range(60):
        d = date.today() + timedelta(days=random.randint(days_min, days_max))
        if not is_off_day(d):
            return d
    # Fallback: walk forward from days_min until a safe day is found
    d = date.today() + timedelta(days=days_min)
    while is_off_day(d):
        d += timedelta(days=1)
    return d


# ---------------------------------------------------------------------------
# Assignment data per course
# Format: (title, task_type, due_date_fn, priority, estimated_hours)
# ---------------------------------------------------------------------------

COURSE_ASSIGNMENTS = {

    # -----------------------------------------------------------------------
    # BIT101 — Introduction to Information Technology (Sem 1)
    # Teacher: Subash Siwa
    # -----------------------------------------------------------------------
    "BIT101": [
        ("Lab Report: Hardware Components and OS Exploration",
         "assignment", lambda: safe_past(60, 75), 3, 6.0),
        ("Presentation: Generations of Computer and their Impact",
         "assignment", lambda: safe_past(45, 60), 3, 3.0),
        ("Homework: Number System Conversions (Binary, Octal, Hex)",
         "homework",   lambda: safe_past(30, 44), 1, 1.5),
        ("Quiz 1: Introduction to Computer and Hardware",
         "quiz",       lambda: safe_past(50, 65), 2, 1.0),
        ("Assignment: Research on ISPs in Nepal and Their Services",
         "assignment", lambda: safe_past(15, 29), 3, 2.5),
        ("Quiz 2: Computer Networks and Internet Services",
         "quiz",       lambda: safe_future(5, 15), 2, 1.0),
        ("Presentation: Applications and Societal Impact of IT",
         "assignment", lambda: safe_future(16, 30), 3, 3.0),
        ("Homework: Database Systems — DBMS vs File System Comparison",
         "homework",   lambda: safe_future(10, 20), 1, 1.5),
    ],

    # -----------------------------------------------------------------------
    # BIT102 — C Programming (Sem 1)
    # Teacher: Arjun Lamichhane
    # -----------------------------------------------------------------------
    "BIT102": [
        ("Lab Report: C Programming Exercises (Units 1–5)",
         "assignment", lambda: safe_past(55, 70), 3, 8.0),
        ("Homework: Write a C Program using Control Structures",
         "homework",   lambda: safe_past(40, 54), 1, 2.0),
        ("Assignment: Implement Array and String Manipulation Programs",
         "assignment", lambda: safe_past(25, 39), 3, 3.0),
        ("Quiz 1: Elements of C, Operators, and Control Structures",
         "quiz",       lambda: safe_past(45, 60), 2, 1.0),
        ("Homework: Recursive Functions — Factorial, Fibonacci, Tower of Hanoi",
         "homework",   lambda: safe_past(10, 24), 1, 2.0),
        ("Assignment: Pointer and Dynamic Memory Allocation Programs",
         "assignment", lambda: safe_future(5, 18), 3, 3.5),
        ("Quiz 2: Functions, Pointers, and Structures",
         "quiz",       lambda: safe_future(10, 20), 2, 1.0),
        ("Lab Report: File Handling and Structures in C (Units 9–10)",
         "assignment", lambda: safe_future(20, 35), 3, 6.0),
    ],

    # -----------------------------------------------------------------------
    # BIT103 — Digital Logic (Sem 1)
    # Teacher: Kumar Prasun
    # -----------------------------------------------------------------------
    "BIT103": [
        ("Lab Report: Logic Gates and Combinational Circuit Design",
         "assignment", lambda: safe_past(60, 75), 3, 6.0),
        ("Homework: Number System Conversions and Binary Arithmetic",
         "homework",   lambda: safe_past(50, 65), 1, 1.5),
        ("Assignment: Boolean Algebra Simplification using K-Map",
         "assignment", lambda: safe_past(35, 49), 3, 2.5),
        ("Quiz 1: Number Systems, Boolean Algebra, and Logic Gates",
         "quiz",       lambda: safe_past(45, 58), 2, 1.0),
        ("Lab Report: Multiplexer, Demultiplexer, Encoder, and Decoder",
         "assignment", lambda: safe_past(20, 34), 3, 5.0),
        ("Homework: Design Flip-Flop Circuits (SR, JK, D, T)",
         "homework",   lambda: safe_future(5, 15), 1, 2.0),
        ("Quiz 2: Sequential Logic and Counters",
         "quiz",       lambda: safe_future(8, 18), 2, 1.0),
        ("Assignment: Design of ALU and Processor Logic",
         "assignment", lambda: safe_future(20, 35), 3, 4.0),
    ],

    # -----------------------------------------------------------------------
    # SCO105 — Sociology (Sem 1)
    # Teacher: Bishnu Bhusal | No lab report
    # -----------------------------------------------------------------------
    "SCO105": [
        ("Presentation: Introduction to Sociology and its Scope",
         "assignment", lambda: safe_past(55, 70), 3, 2.5),
        ("Homework: Write a Note on Social Norms and Values",
         "homework",   lambda: safe_past(40, 54), 1, 1.5),
        ("Assignment: Research Report on Social Institutions in Nepal",
         "assignment", lambda: safe_past(20, 39), 3, 4.0),
        ("Quiz 1: Introduction and Fundamentals of Society",
         "quiz",       lambda: safe_past(45, 60), 2, 1.0),
        ("Presentation: Social Stratification and Caste System in Nepal",
         "assignment", lambda: safe_future(5, 18), 3, 3.0),
        ("Homework: Essay on Social Change and IT's Role in Nepal",
         "homework",   lambda: safe_future(15, 28), 1, 2.0),
        ("Quiz 2: Social Structure and Institutions",
         "quiz",       lambda: safe_future(10, 20), 2, 1.0),
    ],

    # -----------------------------------------------------------------------
    # BIT151 — Microprocessor and Computer Architecture (Sem 2)
    # Teacher: Kumar Prasun
    # -----------------------------------------------------------------------
    "BIT151": [
        ("Lab Report: Intel 8085 Assembly Language Programs",
         "assignment", lambda: safe_past(60, 75), 3, 8.0),
        ("Homework: Microprocessor Architecture — Register Organization",
         "homework",   lambda: safe_past(50, 65), 1, 1.5),
        ("Assignment: Write and Trace 8085 Assembly Programs for Arithmetic Operations",
         "assignment", lambda: safe_past(35, 49), 3, 4.0),
        ("Quiz 1: Introduction to Microprocessor and Intel 8085",
         "quiz",       lambda: safe_past(48, 62), 2, 1.0),
        ("Assignment: Presentation on Control Unit Design and CPU Organization",
         "assignment", lambda: safe_past(20, 34), 3, 3.0),
        ("Homework: Fixed Point Arithmetic — Multiplication and Division",
         "homework",   lambda: safe_future(5, 15), 1, 2.0),
        ("Quiz 2: CPU Architecture, Pipelining, and Memory Organization",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Assignment: Research on I/O Organization and Interrupt Handling",
         "assignment", lambda: safe_future(20, 35), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # BIT153 — Object Oriented Programming (Sem 2)
    # Teacher: Subash Siwa
    # -----------------------------------------------------------------------
    "BIT153": [
        ("Lab Report: OOP Concepts Using C++ (Classes, Objects, Inheritance)",
         "assignment", lambda: safe_past(60, 75), 3, 8.0),
        ("Homework: Implement Class and Object Programs in C++",
         "homework",   lambda: safe_past(48, 63), 1, 2.0),
        ("Assignment: Operator Overloading Programs in C++",
         "assignment", lambda: safe_past(33, 47), 3, 3.5),
        ("Quiz 1: Introduction to OOP, Classes, and Objects",
         "quiz",       lambda: safe_past(50, 65), 2, 1.0),
        ("Assignment: Implement Inheritance and Polymorphism in C++",
         "assignment", lambda: safe_past(18, 32), 3, 4.0),
        ("Homework: Virtual Functions and Runtime Polymorphism",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Inheritance, Polymorphism, and Exception Handling",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: File Handling and Templates in C++",
         "assignment", lambda: safe_future(22, 38), 3, 5.0),
    ],

    # -----------------------------------------------------------------------
    # BIT201 — Data Structures and Algorithms (Sem 3)
    # Teacher: Ramesh Singh Saud
    # -----------------------------------------------------------------------
    "BIT201": [
        ("Lab Report: Implementation of Stack, Queue, and Linked List",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Algorithm Analysis — Big O Notation Practice Problems",
         "homework",   lambda: safe_past(48, 60), 1, 1.5),
        ("Assignment: Implement Binary Search Tree Operations",
         "assignment", lambda: safe_past(33, 47), 3, 4.0),
        ("Quiz 1: Arrays, Stacks, Queues, and Recursion",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Sorting Algorithms — Implement and Compare Performance",
         "assignment", lambda: safe_past(18, 32), 3, 4.5),
        ("Homework: Graph Traversal — BFS and DFS Trace",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Trees, Sorting, Searching, and Graphs",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Graph and Hashing Implementation",
         "assignment", lambda: safe_future(22, 38), 3, 6.0),
    ],

    # -----------------------------------------------------------------------
    # BIT202 — Database Management System (Sem 3)
    # Teacher: Mohan Ayer
    # -----------------------------------------------------------------------
    "BIT202": [
        ("Lab Report: SQL Queries and Database Design",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Draw ER Diagram for a Library Management System",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Normalization — Convert Relations to 3NF and BCNF",
         "assignment", lambda: safe_past(33, 47), 3, 3.5),
        ("Quiz 1: Database Concepts, ER Model, and Relational Model",
         "quiz",       lambda: safe_past(50, 64), 2, 1.0),
        ("Assignment: Write Complex SQL Queries (Joins, Subqueries, Aggregates)",
         "assignment", lambda: safe_past(18, 32), 3, 4.0),
        ("Homework: Research on NoSQL Databases — MongoDB vs PostgreSQL",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: SQL, Normalization, and Transaction Processing",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Transaction Management and Concurrency Control",
         "assignment", lambda: safe_future(22, 38), 3, 5.0),
    ],

    # -----------------------------------------------------------------------
    # BIT203 — Numerical Methods (Sem 3)
    # Teacher: Arjun Lamichhane
    # -----------------------------------------------------------------------
    "BIT203": [
        ("Lab Report: Numerical Solutions using C/Python Programs",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Solve Nonlinear Equations using Bisection and Newton-Raphson",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Interpolation Problems — Newton Forward and Backward",
         "assignment", lambda: safe_past(33, 47), 3, 3.0),
        ("Quiz 1: Solution of Nonlinear Equations and Interpolation",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Homework: Numerical Differentiation and Integration Problems",
         "homework",   lambda: safe_past(18, 32), 1, 2.0),
        ("Assignment: Solve System of Linear Equations using Gauss Elimination",
         "assignment", lambda: safe_future(5, 18), 3, 3.5),
        ("Quiz 2: Numerical Integration and Linear Systems",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Homework: Solve ODEs using Euler's and Runge-Kutta Methods",
         "homework",   lambda: safe_future(22, 36), 1, 2.5),
    ],

    # -----------------------------------------------------------------------
    # BIT204 — Operating Systems (Sem 3)
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT204": [
        ("Lab Report: Process Scheduling Simulation Programs",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Compare FCFS, SJF, and Round Robin Scheduling",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Presentation on Deadlock — Detection, Prevention, Avoidance",
         "assignment", lambda: safe_past(33, 47), 3, 3.0),
        ("Quiz 1: OS Introduction, System Structures, and Process Management",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Memory Management — Paging and Segmentation Problems",
         "assignment", lambda: safe_past(15, 32), 3, 3.5),
        ("Homework: Research on File System — FAT, NTFS, ext4 Comparison",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Memory Management, File Systems, and I/O Management",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Inter-Process Communication and Synchronization",
         "assignment", lambda: safe_future(22, 36), 3, 6.0),
    ],

    # -----------------------------------------------------------------------
    # MGT205 — Principles of Management (Sem 3)
    # Teacher: Niraj Panta | No lab report
    # -----------------------------------------------------------------------
    "MGT205": [
        ("Presentation: Evolution of Management Theories",
         "assignment", lambda: safe_past(55, 70), 3, 2.5),
        ("Homework: Analyze a Nepali Organization's Culture and Environment",
         "homework",   lambda: safe_past(42, 58), 1, 2.0),
        ("Assignment: Case Study — Decision Making in IT Companies",
         "assignment", lambda: safe_past(28, 42), 3, 4.0),
        ("Quiz 1: Introduction to Management and Organizational Culture",
         "quiz",       lambda: safe_past(48, 62), 2, 1.0),
        ("Assignment: Prepare an Organizational Chart and Explain Design",
         "assignment", lambda: safe_past(14, 27), 3, 3.0),
        ("Homework: Essay on Motivation Theories — Maslow vs Herzberg",
         "homework",   lambda: safe_future(5, 18), 1, 2.0),
        ("Quiz 2: Planning, Organizing, Motivation, and Leadership",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Presentation: Leadership Styles and Communication in IT Teams",
         "assignment", lambda: safe_future(20, 35), 3, 3.0),
    ],

    # -----------------------------------------------------------------------
    # BIT251 — Web Technology I (Sem 4)
    # Teacher: Sagar K.C.
    # -----------------------------------------------------------------------
    "BIT251": [
        ("Lab Report: HTML, CSS, and JavaScript Web Pages",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Create a Structured Web Page using HTML5 Semantic Tags",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Style a Multi-Page Website using CSS (Flexbox and Grid)",
         "assignment", lambda: safe_past(33, 47), 3, 4.0),
        ("Quiz 1: HTML Markup, CSS Styles, and Box Model",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Build an Interactive Form with JavaScript Validation",
         "assignment", lambda: safe_past(15, 30), 3, 4.5),
        ("Homework: Research on XML and its Use in Web Technologies",
         "homework",   lambda: safe_future(5, 16), 1, 1.5),
        ("Quiz 2: JavaScript DOM, Events, and XML",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Complete Static Website Project using HTML, CSS, JS",
         "assignment", lambda: safe_future(22, 38), 4, 10.0),
    ],

    # -----------------------------------------------------------------------
    # BIT252 — Artificial Intelligence (Sem 4)
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT252": [
        ("Lab Report: Implement Search Algorithms in Python",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Trace BFS and DFS on a State Space Graph",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Presentation on Knowledge Representation — Frames and Logic",
         "assignment", lambda: safe_past(33, 47), 3, 3.0),
        ("Quiz 1: Introduction to AI, Search Strategies, and Heuristics",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Research Report on Machine Learning Applications in Nepal",
         "assignment", lambda: safe_past(15, 30), 3, 4.0),
        ("Homework: Compare Expert Systems and Neural Networks",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Knowledge Representation, Expert Systems, and ML Introduction",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Build a Simple Rule-Based Expert System",
         "assignment", lambda: safe_future(22, 38), 3, 8.0),
    ],

    # -----------------------------------------------------------------------
    # BIT253 — Systems Analysis and Design (Sem 4)
    # Teacher: Santosh Dhungana
    # -----------------------------------------------------------------------
    "BIT253": [
        ("Lab Report: Use Case Diagrams and DFDs for a Case Study System",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Compare Waterfall, Agile, and Spiral SDLC Models",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Prepare a Feasibility Report for a Proposed IT System",
         "assignment", lambda: safe_past(33, 47), 3, 5.0),
        ("Quiz 1: Foundations of Systems Development and Planning",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Draw ERD, DFD, and System Flowchart for a College System",
         "assignment", lambda: safe_past(15, 30), 3, 5.0),
        ("Homework: Research on Agile and Scrum Methodologies",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Analysis, Design, and System Implementation",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Complete System Design Document for a Mini Project",
         "assignment", lambda: safe_future(22, 38), 4, 10.0),
    ],

    # -----------------------------------------------------------------------
    # BIT254 — Network and Data Communications (Sem 4)
    # Teacher: Bhim Bahadur Rawat
    # -----------------------------------------------------------------------
    "BIT254": [
        ("Lab Report: Network Configuration and Protocol Analysis using Packet Tracer",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Compare Transmission Media — Twisted Pair, Coaxial, Fiber",
         "homework",   lambda: safe_past(48, 62), 1, 1.5),
        ("Assignment: Presentation on OSI Model vs TCP/IP Model",
         "assignment", lambda: safe_past(33, 47), 3, 3.0),
        ("Quiz 1: Data Communication Fundamentals and Physical Layer",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Subnet a Network — VLSM and CIDR Problems",
         "assignment", lambda: safe_past(15, 30), 3, 3.5),
        ("Homework: Research on IPv4 vs IPv6 Transition in Nepal",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Data Link, Network, and Transport Layers",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Configure Routing Protocols (RIP, OSPF) in Packet Tracer",
         "assignment", lambda: safe_future(22, 38), 3, 6.0),
    ],

    # -----------------------------------------------------------------------
    # ORS255 — Operations Research (Sem 4)
    # Teacher: Kishor Luitel | No lab report
    # -----------------------------------------------------------------------
    "ORS255": [
        ("Homework: Solve Linear Programming Problems using Graphical Method",
         "homework",   lambda: safe_past(55, 70), 1, 2.0),
        ("Assignment: Solve Transportation and Assignment Problems",
         "assignment", lambda: safe_past(42, 56), 3, 3.5),
        ("Quiz 1: Introduction to OR and Linear Programming",
         "quiz",       lambda: safe_past(48, 62), 2, 1.0),
        ("Homework: Solve Queuing Theory Problems (M/M/1 Queue)",
         "homework",   lambda: safe_past(28, 42), 1, 2.0),
        ("Assignment: Game Theory — Solve Two-Person Zero-Sum Games",
         "assignment", lambda: safe_past(14, 27), 3, 3.0),
        ("Quiz 2: Transportation, Queuing Theory, and Game Theory",
         "quiz",       lambda: safe_future(8, 20), 2, 1.0),
        ("Homework: Network Analysis — Critical Path Method (CPM) Problems",
         "homework",   lambda: safe_future(15, 28), 1, 2.5),
        ("Assignment: Decision Theory — Apply Maximin, Maximax, EMV Criteria",
         "assignment", lambda: safe_future(22, 36), 3, 3.5),
    ],

    # -----------------------------------------------------------------------
    # BIT301 — Web Technology II (Sem 5)
    # Teacher: Sagar K.C.
    # -----------------------------------------------------------------------
    "BIT301": [
        ("Lab Report: PHP Web Application with Database Integration",
         "assignment", lambda: safe_past(58, 72), 3, 10.0),
        ("Homework: Write PHP Functions for String and Array Manipulation",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Build a User Registration and Login System in PHP",
         "assignment", lambda: safe_past(33, 47), 3, 5.0),
        ("Quiz 1: PHP Introduction, Functions, and Strings",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Create a CRUD Application using PHP and MySQL",
         "assignment", lambda: safe_past(15, 30), 3, 6.0),
        ("Homework: Research on PHP Frameworks — Laravel vs CodeIgniter",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: PHP OOP, Database, and Session Management",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Complete PHP MVC Project with Authentication",
         "assignment", lambda: safe_future(22, 38), 4, 12.0),
    ],

    # -----------------------------------------------------------------------
    # BIT302 — Software Engineering (Sem 5)
    # Teacher: Ramesh Singh Saud
    # -----------------------------------------------------------------------
    "BIT302": [
        ("Lab Report: UML Diagrams for a Software System",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Compare Waterfall and Agile Process Models",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Write a Software Requirements Specification (SRS) Document",
         "assignment", lambda: safe_past(33, 47), 3, 6.0),
        ("Quiz 1: Introduction to SE, Process Models, and Requirements Engineering",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Design Architecture using UML (Class, Sequence, Activity Diagrams)",
         "assignment", lambda: safe_past(15, 30), 3, 5.0),
        ("Homework: Research on Software Testing Techniques — Black Box vs White Box",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: System Modeling, Design, Testing, and Quality Assurance",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Prepare a Complete Software Design Document",
         "assignment", lambda: safe_future(22, 38), 4, 10.0),
    ],

    # -----------------------------------------------------------------------
    # BIT303 — Information Security (Sem 5)
    # Teacher: Bhim Bahadur Rawat
    # -----------------------------------------------------------------------
    "BIT303": [
        ("Lab Report: Implement Encryption and Decryption Algorithms",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Compare Symmetric and Asymmetric Encryption (AES vs RSA)",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Presentation on Digital Signatures and PKI",
         "assignment", lambda: safe_past(33, 47), 3, 3.0),
        ("Quiz 1: Introduction to Security and Encryption Algorithms",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Research Report on Malware Types and Prevention in Nepal",
         "assignment", lambda: safe_past(15, 30), 3, 4.0),
        ("Homework: Study Access Control Models — DAC, MAC, RBAC",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Authentication, Access Control, and Malicious Software",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Network Security Tools — Firewall Configuration and IDS",
         "assignment", lambda: safe_future(22, 38), 3, 8.0),
    ],

    # -----------------------------------------------------------------------
    # BIT304 — Computer Graphics (Sem 5)
    # Teacher: Shrilata Wagle
    # -----------------------------------------------------------------------
    "BIT304": [
        ("Lab Report: Implement Line, Circle, and Ellipse Drawing Algorithms",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Derive Bresenham's Line Drawing Algorithm",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Apply 2D Transformations — Translation, Rotation, Scaling",
         "assignment", lambda: safe_past(33, 47), 3, 3.5),
        ("Quiz 1: Graphics System Overview and Output Primitives",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Implement 2D Viewing and Clipping Algorithms",
         "assignment", lambda: safe_past(15, 30), 3, 4.0),
        ("Homework: Research on 3D Projection — Orthographic vs Perspective",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: 2D/3D Transformations, Viewing, and Visible Surface Detection",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: 3D Object Rendering and OpenGL Introduction",
         "assignment", lambda: safe_future(22, 38), 3, 8.0),
    ],

    # -----------------------------------------------------------------------
    # ENG305 — Technical Writing (Sem 5)
    # Teacher: Saraswoti Katwal | No lab report
    # -----------------------------------------------------------------------
    "ENG305": [
        ("Assignment: Write a Technical Email and Formal Memo",
         "assignment", lambda: safe_past(55, 70), 3, 2.0),
        ("Homework: Rewrite Unclear Technical Sentences for Clarity",
         "homework",   lambda: safe_past(42, 58), 1, 1.5),
        ("Assignment: Write a Short Technical Proposal for a Software Project",
         "assignment", lambda: safe_past(28, 42), 3, 4.0),
        ("Quiz 1: Technical Sentences, Emails, Letters, and Memos",
         "quiz",       lambda: safe_past(48, 62), 2, 1.0),
        ("Assignment: Prepare a Formal Report on a Technical Topic",
         "assignment", lambda: safe_past(14, 27), 3, 5.0),
        ("Homework: Prepare an Oral Presentation Outline on an IT Topic",
         "homework",   lambda: safe_future(5, 18), 1, 2.0),
        ("Quiz 2: Formal Reports, Technical Graphics, and Oral Presentations",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Assignment: Write a Job Application Package (CV + Cover Letter)",
         "assignment", lambda: safe_future(20, 35), 3, 3.0),
    ],

    # -----------------------------------------------------------------------
    # BIT351 — NET Centric Computing (Sem 6)
    # Teacher: Sagar K.C.
    # -----------------------------------------------------------------------
    "BIT351": [
        ("Lab Report: Build and Deploy a Web Service using ASP.NET Core",
         "assignment", lambda: safe_past(58, 72), 3, 10.0),
        ("Homework: Explain SOA Architecture and its Components",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Create a RESTful API using ASP.NET Core MVC",
         "assignment", lambda: safe_past(33, 47), 3, 6.0),
        ("Quiz 1: Language Preliminaries, ASP.NET Introduction, and HTTP",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Implement Database Integration in ASP.NET Core Application",
         "assignment", lambda: safe_past(15, 30), 3, 6.0),
        ("Homework: Research on Cloud-Based .NET Deployment (Azure/AWS)",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: MVC, Database, State Management, and Client-side Development",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Complete ASP.NET Core MVC Application with Authentication",
         "assignment", lambda: safe_future(22, 38), 4, 12.0),
    ],

    # -----------------------------------------------------------------------
    # BIT352 — Database Administration (Sem 6)
    # Teacher: Yograj Joshi
    # -----------------------------------------------------------------------
    "BIT352": [
        ("Lab Report: Oracle/PostgreSQL Administration Tasks",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Explain Database Storage Structures and Tablespaces",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Create Users, Assign Roles, and Manage Privileges in Oracle",
         "assignment", lambda: safe_past(33, 47), 3, 4.0),
        ("Quiz 1: Introduction to DBA, Network Environment, and Storage",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Implement Backup and Recovery Strategy for a Database",
         "assignment", lambda: safe_past(15, 30), 3, 5.0),
        ("Homework: Research on Database Performance Tuning Techniques",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Concurrency, Backup, Recovery, and Performance Management",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Database Audit, Resource Management, and Scheduling Tasks",
         "assignment", lambda: safe_future(22, 38), 3, 7.0),
    ],

    # -----------------------------------------------------------------------
    # BIT353 — Management Information System (Sem 6)
    # Teacher: Anil Lamichhane
    # -----------------------------------------------------------------------
    "BIT353": [
        ("Lab Report: Design an MIS for a Nepali Organization",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Research on Role of IS in Nepali Government Organizations",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Presentation on ERP Systems — SAP vs Oracle",
         "assignment", lambda: safe_past(33, 47), 3, 3.0),
        ("Quiz 1: IS in Global Business and Organizational Strategy",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Case Study on Ethical Issues in Information Systems in Nepal",
         "assignment", lambda: safe_past(15, 30), 3, 4.0),
        ("Homework: Compare BI Tools — Tableau vs Power BI",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Business Intelligence, Decision Making, and Digital Applications",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Assignment: Propose an MIS Solution for a Real Business Problem",
         "assignment", lambda: safe_future(22, 38), 4, 8.0),
    ],

    # -----------------------------------------------------------------------
    # RSM354 — Research Methodology (Sem 6)
    # Teacher: Bimal Acharya | No lab report
    # -----------------------------------------------------------------------
    "RSM354": [
        ("Homework: Identify a Research Problem and Write a Research Question",
         "homework",   lambda: safe_past(55, 70), 1, 2.0),
        ("Assignment: Prepare a Research Proposal on an IT Topic",
         "assignment", lambda: safe_past(42, 56), 3, 5.0),
        ("Quiz 1: Introduction to Research, Types, and Research Design",
         "quiz",       lambda: safe_past(48, 62), 2, 1.0),
        ("Assignment: Write a Literature Review on a Chosen IT Research Area",
         "assignment", lambda: safe_past(28, 42), 3, 6.0),
        ("Homework: Design a Questionnaire for Primary Data Collection",
         "homework",   lambda: safe_past(14, 27), 1, 2.5),
        ("Quiz 2: Data Collection, Sampling, and Measurement",
         "quiz",       lambda: safe_future(8, 20), 2, 1.0),
        ("Assignment: Analyze Sample Data and Prepare a Statistical Report",
         "assignment", lambda: safe_future(15, 30), 3, 5.0),
        ("Assignment: Write a Complete Research Report Following APA Format",
         "assignment", lambda: safe_future(25, 42), 4, 8.0),
    ],

    # -----------------------------------------------------------------------
    # BIT356 — Multimedia Computing, Elective I (Sem 6)
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT356": [
        ("Lab Report: Audio and Image Processing Programs",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Compare Lossy vs Lossless Compression Formats",
         "homework",   lambda: safe_past(48, 62), 1, 1.5),
        ("Assignment: Create a Multimedia Presentation using Animation and Sound",
         "assignment", lambda: safe_past(33, 47), 3, 4.0),
        ("Quiz 1: Introduction to Multimedia, Text, Sound, and Audio Systems",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Implement Image Processing Techniques (Grayscale, Filtering)",
         "assignment", lambda: safe_past(15, 30), 3, 4.5),
        ("Homework: Research on Video Compression Standards — H.264 vs H.265",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Image, Video, Compression, and Multimedia Design",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Build a Multimedia Application with User Interface",
         "assignment", lambda: safe_future(22, 38), 3, 8.0),
    ],

    # -----------------------------------------------------------------------
    # BIT401 — Advanced Java Programming (Sem 7)
    # Teacher: Janak Raj Joshi
    # -----------------------------------------------------------------------
    "BIT401": [
        ("Lab Report: Java Swing GUI Application",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Implement Java Collections Framework — List, Set, Map",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Build a GUI Application using Java Swing Components",
         "assignment", lambda: safe_past(33, 47), 3, 5.0),
        ("Quiz 1: Java Programming Review, Collections, and Swing Basics",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Implement JDBC — Connect Java Application to PostgreSQL",
         "assignment", lambda: safe_past(15, 30), 3, 5.0),
        ("Homework: Research on Java Servlets vs JSP vs Spring MVC",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Event Handling, JDBC, Network Programming, and Servlets",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Build a Java Web Application using Servlets and JSP",
         "assignment", lambda: safe_future(22, 38), 4, 12.0),
    ],

    # -----------------------------------------------------------------------
    # BIT402 — Software Project Management (Sem 7)
    # Teacher: Sudarshan Sharma
    # -----------------------------------------------------------------------
    "BIT402": [
        ("Lab Report: Prepare a Complete Project Plan using MS Project or similar tool",
         "assignment", lambda: safe_past(58, 72), 3, 7.0),
        ("Homework: Compare COCOMO and Function Point Estimation Models",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Prepare a Project Charter and Scope Statement",
         "assignment", lambda: safe_past(33, 47), 3, 4.0),
        ("Quiz 1: Introduction to SPM, Project Evaluation, and Planning Overview",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Create a Gantt Chart and Network Diagram for a Software Project",
         "assignment", lambda: safe_past(15, 30), 3, 4.5),
        ("Homework: Identify and Analyze Risks for a Software Project",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Effort Estimation, Activity Planning, and Risk Management",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Agile Sprint Planning and Retrospective Documentation",
         "assignment", lambda: safe_future(22, 38), 4, 8.0),
    ],

    # -----------------------------------------------------------------------
    # BIT403 — E-commerce (Sem 7)
    # Teacher: Anil Lamichhane
    # -----------------------------------------------------------------------
    "BIT403": [
        ("Lab Report: Design and Prototype an E-commerce Website",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Compare B2B, B2C, C2C, and C2B E-commerce Models",
         "homework",   lambda: safe_past(48, 62), 1, 2.0),
        ("Assignment: Research Report on E-commerce Security Threats and Solutions",
         "assignment", lambda: safe_past(33, 47), 3, 4.0),
        ("Quiz 1: Introduction to E-commerce and Business Models",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Analyze E-payment Systems Used in Nepal (eSewa, Khalti, etc.)",
         "assignment", lambda: safe_past(15, 30), 3, 3.5),
        ("Homework: Research on Digital Marketing Strategies for E-commerce",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: E-commerce Security, Payment Systems, and Marketing",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Complete E-commerce System with Cart and Payment Flow",
         "assignment", lambda: safe_future(22, 38), 4, 12.0),
    ],

    # -----------------------------------------------------------------------
    # BIT408 — Cloud Computing, Elective II (Sem 7)
    # Teacher: Rakesh Bachhan
    # -----------------------------------------------------------------------
    "BIT408": [
        ("Lab Report: Deploy an Application on AWS/Azure/GCP",
         "assignment", lambda: safe_past(58, 72), 3, 8.0),
        ("Homework: Compare IaaS, PaaS, and SaaS with Real-world Examples",
         "homework",   lambda: safe_past(48, 62), 1, 1.5),
        ("Assignment: Presentation on Virtualization Technologies — VMware vs Docker",
         "assignment", lambda: safe_past(33, 47), 3, 3.0),
        ("Quiz 1: Introduction to Cloud Computing and Service Models",
         "quiz",       lambda: safe_past(50, 63), 2, 1.0),
        ("Assignment: Design a Cloud Architecture for a Web Application",
         "assignment", lambda: safe_past(15, 30), 3, 5.0),
        ("Homework: Research on Cloud Security Challenges and Best Practices",
         "homework",   lambda: safe_future(5, 16), 1, 2.0),
        ("Quiz 2: Virtualization, SOA, Cloud Programming, and Security",
         "quiz",       lambda: safe_future(10, 22), 2, 1.0),
        ("Lab Report: Implement Cloud-Based Analytics Pipeline",
         "assignment", lambda: safe_future(22, 38), 3, 8.0),
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

    @transaction.atomic
    def handle(self, *args, **options):
        from tasks.models import Assignment
        from courses.models import Course

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

        for course_code, assignments in COURSE_ASSIGNMENTS.items():
            course = Course.objects.filter(title__startswith=course_code).first()
            if not course:
                self.stdout.write(
                    self.style.WARNING(f"  ⚠ Course {course_code} not found — skipping.")
                )
                total_errors += 1
                continue

            teacher = course.teacher
            course_created = 0
            course_skipped = 0

            self.stdout.write(f"\n  {course_code} — {teacher.full_name}")
            self.stdout.write("  " + "-" * 50)

            for title, task_type, due_fn, priority, est_hours in assignments:
                if Assignment.objects.filter(title=title, course=course).exists():
                    self.stdout.write(f"    ~ Exists  : {title[:65]}")
                    course_skipped += 1
                    total_skipped += 1
                    continue

                due_date = due_fn()
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
        self.stdout.write(f"  Grand total         : {total_created + total_skipped}")
        self.stdout.write("=" * 60 + "\n")