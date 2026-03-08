"""
AI Agents for Skill-Bridge Career Navigator.
Uses LangChain Agent framework with tool-calling.
"""
import os
import json
from typing import List
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser

load_dotenv()

agent_llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.7
)


# ═══════════════════════════════════════════════
# AGENT 1: Career Research Agent
# ═══════════════════════════════════════════════

@tool
def analyze_market_demand(role: str) -> str:
    """Analyze current market demand and salary trends for a given role."""
    # This tool simulates market research. In production, you'd scrape job boards.
    prompt = f"""You are a career market analyst. For the role "{role}", provide a realistic market analysis with:
    1. Estimated number of open positions (realistic range)
    2. Average salary range (USD)
    3. Top 5 most in-demand skills with percentage of job listings requiring them
    4. Industry sectors hiring the most
    5. Growth trend (growing/stable/declining)
    
    Return JSON: {{
        "open_positions": "X,XXX - X,XXX",
        "salary_range": "$XXk - $XXXk",
        "top_skills": [{{"skill": "name", "demand_pct": XX}}],
        "top_sectors": ["sector1", "sector2"],
        "growth_trend": "growing/stable/declining",
        "trend_details": "brief explanation"
    }}
    Return ONLY valid JSON."""
    
    resp = agent_llm.invoke(prompt)
    return resp.content


@tool
def compare_skill_market_fit(skills: List[str], role: str) -> str:
    """Compare a candidate's skills against current market requirements for a role."""
    prompt = f"""Compare these candidate skills: {json.dumps(skills)}
    Against market requirements for: {role}
    
    For each candidate skill, rate its market relevance (high/medium/low).
    Identify the top 3 skills the candidate should learn next based on market trends.
    
    Return JSON: {{
        "skill_relevance": [{{"skill": "name", "relevance": "high/medium/low", "reasoning": "..."}}],
        "recommended_next": ["skill1", "skill2", "skill3"],
        "market_advice": "one paragraph of career advice"
    }}
    Return ONLY valid JSON."""
    
    resp = agent_llm.invoke(prompt)
    return resp.content


async def run_career_research_agent(target_role: str, current_skills: List[str]) -> dict:
    """Run the full Career Research Agent pipeline."""
    try:
        # Step 1: Market analysis
        market_data_raw = analyze_market_demand.invoke(target_role)
        try:
            market_data = json.loads(market_data_raw)
        except:
            market_data = {"raw": market_data_raw}
        
        # Step 2: Skill-market fit
        fit_data_raw = compare_skill_market_fit.invoke({
            "skills": current_skills,
            "role": target_role
        })
        try:
            fit_data = json.loads(fit_data_raw)
        except:
            fit_data = {"raw": fit_data_raw}
        
        return {
            "agent": "Career Research Agent",
            "market_analysis": market_data,
            "skill_fit": fit_data,
            "status": "success"
        }
    except Exception as e:
        print(f"Career Research Agent Error: {e}")
        return {
            "agent": "Career Research Agent",
            "status": "error",
            "error": str(e)
        }


# ═══════════════════════════════════════════════
# AGENT 2: Interview Coach Agent
# ═══════════════════════════════════════════════

@tool
def generate_practice_questions(weak_areas: List[str], role: str) -> str:
    """Generate targeted practice questions for interview weak areas."""
    prompt = f"""Generate 5 focused interview practice questions for the role of {role}.
    The candidate needs improvement in: {json.dumps(weak_areas)}
    
    For each question, provide:
    - The question itself
    - A brief hint on what a good answer should cover
    - Difficulty level (easy/medium/hard)
    
    Return JSON: {{
        "practice_questions": [
            {{"question": "...", "hint": "...", "difficulty": "easy/medium/hard"}}
        ]
    }}
    Return ONLY valid JSON."""
    
    resp = agent_llm.invoke(prompt)
    return resp.content


@tool
def create_study_plan(weak_areas: List[str], role: str, time_hours: int) -> str:
    """Create a focused study plan for interview preparation."""
    prompt = f"""Create a study plan for someone preparing for a {role} interview.
    They have {time_hours} hours total for preparation.
    Weak areas to focus on: {json.dumps(weak_areas)}
    
    Return JSON: {{
        "study_plan": [
            {{"topic": "...", "hours": X, "resources": ["resource1"], "priority": "high/medium/low"}}
        ],
        "daily_routine": "suggested daily practice routine",
        "tips": ["tip1", "tip2", "tip3"]
    }}
    Return ONLY valid JSON."""
    
    resp = agent_llm.invoke(prompt)
    return resp.content


async def run_interview_coach_agent(
    transcript: List[dict],
    evaluation: dict,
    target_role: str,
    time_hours: int = 20
) -> dict:
    """Run the Interview Coach Agent on a completed interview."""
    try:
        # Extract weak areas from evaluation
        weak_areas = evaluation.get("improvements", [])
        categories = evaluation.get("categories", {})
        
        # Find low-scoring categories
        low_categories = [cat for cat, score in categories.items() if score < 70]
        all_weak = list(set(weak_areas + low_categories))
        
        # Step 1: Generate practice questions
        questions_raw = generate_practice_questions.invoke({
            "weak_areas": all_weak,
            "role": target_role
        })
        try:
            questions = json.loads(questions_raw)
        except:
            questions = {"raw": questions_raw}
        
        # Step 2: Create study plan
        plan_raw = create_study_plan.invoke({
            "weak_areas": all_weak,
            "role": target_role,
            "time_hours": time_hours
        })
        try:
            plan = json.loads(plan_raw)
        except:
            plan = {"raw": plan_raw}
        
        return {
            "agent": "Interview Coach Agent",
            "practice_questions": questions.get("practice_questions", []),
            "study_plan": plan.get("study_plan", []),
            "daily_routine": plan.get("daily_routine", ""),
            "tips": plan.get("tips", []),
            "status": "success"
        }
    except Exception as e:
        print(f"Interview Coach Agent Error: {e}")
        return {
            "agent": "Interview Coach Agent",
            "status": "error",
            "error": str(e)
        }
