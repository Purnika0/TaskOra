# The analytics app is intentionally model-less: every endpoint in views.py
# computes its numbers on the fly (via aggregation over Task/Course/Enrollment)
# rather than persisting derived statistics, so results are always current.
