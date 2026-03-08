from fastapi import APIRouter, Query
from typing import Optional
from services.ai_service import vector_store
from urllib.parse import quote_plus

router = APIRouter()


@router.get("/search")
async def search_courses(
    q: str = Query("", description="Search query"),
    platform: Optional[str] = Query(None, description="Filter by platform: Coursera, Udemy, edX, Skillshare"),
    level: Optional[str] = Query(None, description="Filter by level: Beginner, Intermediate, Advanced"),
    target_role: Optional[str] = Query(None, description="Filter for specific role matching"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(30, ge=1, le=100),
):
    """Search and filter courses across all platforms using FAISS similarity search."""
    if not vector_store:
        return {"courses": [], "total": 0, "page": page, "total_pages": 0, "message": "Vector store not initialized"}

    # Include target_role in the semantic search if provided
    base_query = q.strip()
    if target_role:
        search_query = f"{base_query} {target_role} skills training".strip()
    else:
        search_query = base_query if base_query else "programming technology software"

    # FAISS similarity search - fetch a larger pool for pagination
    pool_size = max(300, page * limit * 2)
    docs = vector_store.similarity_search(query=search_query, k=pool_size)

    filtered_courses = []
    for doc in docs:
        content = doc.page_content
        lines = content.split('\n')

        course_data = {}
        for line in lines:
            if ':' in line:
                key, val = line.split(':', 1)
                course_data[key.strip().lower()] = val.strip()

        course_platform = course_data.get('platform', 'Coursera')
        course_level = course_data.get('level', 'All Levels').strip()
        title = course_data.get('title', course_data.get('course', course_data.get('name', 'Unknown')))
        direct_link = course_data.get('link', '').strip()

        # Apply filters
        if platform and course_platform.lower() != platform.lower():
            continue
        if level and level.lower() not in course_level.lower():
            continue

        # Build URL
        if direct_link and direct_link.startswith('http'):
            url = direct_link
        elif course_platform == "Udemy":
            url = f"https://www.udemy.com/courses/search/?q={quote_plus(title)}"
        elif course_platform == "Skillshare":
            url = f"https://www.skillshare.com/search?query={quote_plus(title)}"
        else:
            url = f"https://www.coursera.org/search?query={quote_plus(title)}"

        rating_raw = course_data.get('rating', '0')
        try:
            rating = float(rating_raw) if rating_raw not in ['None', '', None] else 0.0
        except (ValueError, TypeError):
            rating = 0.0

        filtered_courses.append({
            "title": title,
            "platform": course_platform,
            "level": course_level,
            "duration": course_data.get('duration', ''),
            "rating": rating,
            "instructor": course_data.get('instructor', ''),
            "description": course_data.get('description', ''),
            "url": url,
            "skills": course_data.get('skills', ''),
        })

    # Pagination slicing
    total_matches = len(filtered_courses)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_courses = filtered_courses[start_idx:end_idx]
    total_pages = (total_matches + limit - 1) // limit

    return {
        "courses": paginated_courses,
        "total": total_matches,
        "page": page,
        "total_pages": total_pages
    }


@router.get("/platforms")
async def get_platforms():
    """Return available platforms and their counts."""
    if not vector_store:
        return {"platforms": []}

    # Quick scan of all docs
    docs = vector_store.similarity_search(query="course", k=200)
    platform_counts: dict = {}
    for doc in docs:
        for line in doc.page_content.split('\n'):
            if line.strip().lower().startswith('platform:'):
                p = line.split(':', 1)[1].strip()
                platform_counts[p] = platform_counts.get(p, 0) + 1

    platforms = [{"name": k, "count": v} for k, v in sorted(platform_counts.items())]
    return {"platforms": platforms}
