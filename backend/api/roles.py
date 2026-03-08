from fastapi import APIRouter, Query
import json
import os

router = APIRouter()

# Extended role list beyond synthetic_jobs.json
COMMON_ROLES = [
    "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
    "Data Scientist", "DevOps Engineer", "Machine Learning Engineer",
    "Cloud Architect", "Mobile Developer", "iOS Developer", "Android Developer",
    "Data Engineer", "Site Reliability Engineer", "Security Engineer",
    "QA Engineer", "Test Automation Engineer", "Product Manager",
    "UI/UX Designer", "Database Administrator", "Systems Administrator",
    "Network Engineer", "Blockchain Developer", "Game Developer",
    "Embedded Systems Engineer", "AI Research Engineer", "NLP Engineer",
    "Computer Vision Engineer", "Robotics Engineer", "Solutions Architect",
    "Technical Lead", "Engineering Manager", "CTO",
    "Data Analyst", "Business Intelligence Analyst", "Quantitative Analyst",
    "Platform Engineer", "Infrastructure Engineer", "Release Engineer",
]

_all_roles = None


def _load_roles():
    global _all_roles
    if _all_roles is not None:
        return _all_roles

    roles_set = set(COMMON_ROLES)

    # Also pull from synthetic_jobs.json
    jobs_path = os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_jobs.json")
    if os.path.exists(jobs_path):
        try:
            with open(jobs_path, "r") as f:
                jobs = json.load(f)
            for job in jobs:
                roles_set.add(job.get("title", ""))
        except Exception:
            pass

    _all_roles = sorted(roles_set)
    return _all_roles


@router.get("/suggest")
async def suggest_roles(q: str = Query("", min_length=0)):
    """Fuzzy autocomplete for target role selection."""
    roles = _load_roles()
    if not q.strip():
        return {"roles": roles[:15]}

    query_lower = q.strip().lower()
    # Score by: starts with > contains
    starts = [r for r in roles if r.lower().startswith(query_lower)]
    contains = [r for r in roles if query_lower in r.lower() and r not in starts]
    results = starts + contains
    return {"roles": results[:15]}
