from fastapi import APIRouter
from models import RoadmapRequest, RoadmapResponse
from services.ai_service import perform_gap_analysis, generate_roadmap, extract_transferable_skills, generate_mentorship_guide, extract_skills_from_jd, calculate_ml_match_percentage

router = APIRouter()

@router.post("/generate", response_model=RoadmapResponse)
async def generate_user_roadmap(request: RoadmapRequest):
    current_skills = request.current_skills.copy()
    transferable_skills = []
    mentorship_guide = ""

    # Persona Logic
    if request.persona == "switcher" and request.current_role:
        transferable_skills = extract_transferable_skills(request.current_role, request.target_role, current_skills)
        current_skills.extend(transferable_skills)
        
    # 1. Gap Analysis
    target_role = request.target_role
    if request.target_job_description and request.target_job_description.strip():
        # Use custom Job Description parsing
        jd_data = extract_skills_from_jd(
            jd_text=request.target_job_description,
            current_skills=current_skills
        )
        missing_skills = jd_data.get("missing_skills", [])
        # Dynamically override the role name with the one found in the JD
        target_role = jd_data.get("role", target_role)
    else:
        # Fallback to standard synthetic role data
        missing_skills = perform_gap_analysis(
            current_skills=current_skills,
            target_role=target_role
        )
    
    if request.persona == "mentor" and request.current_role:
        mentorship_guide = generate_mentorship_guide(request.current_role, target_role, missing_skills)

    # 2. Roadmap Generation
    generated_data = generate_roadmap(
        target_role=target_role,
        missing_skills=missing_skills,
        time_investment=request.time_investment
    )
    
    courses = generated_data.get("courses", [])
    projects = generated_data.get("projects", [])
    certifications = generated_data.get("certifications", [])
    
    # 3. Compute Analytics
    match_pct = calculate_ml_match_percentage(current_skills, target_role, missing_skills)
    total_skills_required = len(missing_skills) + len(current_skills)
    matched_skills = len(current_skills)
    
    # Build skill radar data
    all_skills = list(set([s.title() for s in current_skills] + [s.title() for s in missing_skills]))
    skill_radar = []
    for skill in all_skills[:8]:  # cap at 8 for readability
        has_it = any(s.lower() == skill.lower() for s in current_skills)
        skill_radar.append({
            "skill": skill,
            "current": 80 if has_it else 10,
            "required": 80
        })
    
    analytics = {
        "total_required": total_skills_required,
        "matched": matched_skills,
        "match_pct": match_pct,
        "gap_count": len(missing_skills),
        "skill_radar": skill_radar,
        "estimated_weeks": len(courses) * 4,
        "hours_per_week": request.time_investment,
        "current_skills": current_skills,
        "all_required_skills": [s.title() for s in missing_skills] + [s.title() for s in current_skills]
    }
    
    if transferable_skills:
        analytics["transferable_skills"] = transferable_skills
    if mentorship_guide:
        analytics["mentorship_guide"] = mentorship_guide
    
    is_fallback = len(courses) > 0 and courses[0].platform == "Generic"
    
    return RoadmapResponse(
        role=target_role,
        missing_skills=missing_skills,
        courses=courses,
        projects=projects,
        certifications=certifications,
        confidence_score=0.85 if not is_fallback else 0.40,
        is_fallback=is_fallback,
        analytics=analytics
    )
