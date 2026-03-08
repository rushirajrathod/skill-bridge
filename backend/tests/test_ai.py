import pytest
from backend.services.ai_service import perform_gap_analysis, _fallback_roadmap
from backend.models import CourseRecommendation

def test_fallback_roadmap_generation():
    """Verify that the system gracefully handles roadmap generation when AI is down."""
    missing_skills = ["Docker", "Kubernetes"]
    courses = _fallback_roadmap(missing_skills)
    
    assert len(courses) == 2
    assert courses[0].platform == "Generic"
    assert "Docker" in courses[0].title
    assert "Kubernetes" in courses[1].title

def test_gap_analysis_exact_match():
    """Verify gap analysis correctly identifies missing skills for a synthetic role."""
    # Data Scientist requires: Python, Pandas, Scikit-Learn, SQL, Machine Learning, Data Visualization, Jupyter
    current_skills = ["Python", "SQL", "Communication"]
    target_role = "Data Scientist"
    
    missing = perform_gap_analysis(current_skills, target_role)
    
    assert "Pandas" in missing
    assert "Machine Learning" in missing
    assert "Python" not in missing # Already have it
    assert "SQL" not in missing # Already have it

def test_gap_analysis_fallback_no_match():
    """Verify gap analysis handles completely unknown roles cleanly."""
    current_skills = ["Python"]
    target_role = "Astronaut Software Engineer"
    
    missing = perform_gap_analysis(current_skills, target_role)
    
    # Should fallback to the first job or the extreme fallback
    assert len(missing) > 0
    assert isinstance(missing[0], str)
