import os
import json
import re
import pandas as pd
from typing import List, Dict, Any
from urllib.parse import quote_plus

from langchain_community.document_loaders import CSVLoader
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.messages import SystemMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from dotenv import load_dotenv

from models import CourseRecommendation, ProjectRecommendation, CertificationRecommendation

load_dotenv(override=True)

# Initialize Models
chat_llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.7
)

embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    api_key=os.getenv("OPENAI_API_KEY")
)

class SafetyGuardrail:
    """Responsible AI layer for filtering harmful content and redacting PII."""
    
    @staticmethod
    def preprocess_query(query: str) -> str:
        """Simple check for prompt injection or harmful keywords."""
        harmful_keywords = ["ignore initial instructions", "system prompt", "bypass", "jailbreak"]
        for kw in harmful_keywords:
            if kw in query.lower():
                print(f"[SAFETY] Flagged potential prompt injection: {kw}")
                return "The user asked a question outside of professional career coaching boundaries."
        return query

    @staticmethod
    def redact_pii(text: str) -> str:
        """Redact potential PII like emails and phone numbers."""
        # Email regex
        text = re.sub(r'[\w\.-]+@[\w\.-]+\.\w+', '[REDACTED EMAIL]', text)
        # Phone regex (simple version)
        text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[REDACTED PHONE]', text)
        return text

# --- Original code follows ---
vector_store = None
certifications_df = pd.DataFrame()

def _normalize_csv(path: str, platform: str) -> pd.DataFrame:
    """Normalize different CSV schemas into a unified format."""
    try:
        df = pd.read_csv(path)
    except Exception as e:
        print(f"[WARN] Could not read {path}: {e}")
        return pd.DataFrame()

    unified = pd.DataFrame()

    if platform == "Coursera":
        unified['title'] = df.get('course', df.get('Course', pd.Series(dtype=str)))
        unified['description'] = df.get('skills', '')
        unified['instructor'] = df.get('partner', '')
        unified['rating'] = pd.to_numeric(df.get('rating', 0), errors='coerce').fillna(0)
        unified['level'] = df.get('level', 'Beginner')
        unified['duration'] = df.get('duration', '')
        unified['link'] = ''
        unified['skills'] = df.get('skills', '')

    elif platform == "Udemy":
        unified['title'] = df.get('title', pd.Series(dtype=str))
        unified['description'] = df.get('description', '')
        unified['instructor'] = df.get('instructor', '')
        unified['rating'] = pd.to_numeric(df.get('rating', 0), errors='coerce').fillna(0)
        unified['level'] = df.get('level', 'All Levels')
        unified['duration'] = df.get('duration', '')
        unified['link'] = ''
        unified['skills'] = df.get('description', '')

    elif platform == "edX":
        unified['title'] = df.get('title', pd.Series(dtype=str))
        subj = df.get('subject', pd.Series(dtype=str)).fillna('')
        prereq = df.get('prerequisites', pd.Series(dtype=str)).fillna('None')
        unified['description'] = subj + ' - ' + prereq
        unified['instructor'] = df.get('institution', '')
        unified['rating'] = 4.5  # edX doesn't have ratings
        unified['level'] = df.get('level', 'Introductory')
        unified['duration'] = ''
        unified['link'] = df.get('link', '')
        unified['skills'] = df.get('associatedskills', '')

    elif platform == "Skillshare":
        unified['title'] = df.get('title', pd.Series(dtype=str))
        unified['description'] = df.get('title', '')  # No description col
        unified['instructor'] = df.get('instructor', '')
        unified['rating'] = 4.0  # Skillshare doesn't have ratings
        unified['level'] = 'All Levels'
        unified['duration'] = df.get('duration', '')
        unified['link'] = df.get('link', '')
        unified['skills'] = df.get('title', '')

    unified['platform'] = platform
    unified = unified.dropna(subset=['title'])
    return unified


def init_vector_store():
    global vector_store, certifications_df

    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key or openai_key == "dummy" or openai_key == "your-key-here":
        print("OPENAI_API_KEY not found or is dummy. Bypassing FAISS initialization to allow Backend to start in Fallback Mock Mode.")
        return

    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    
    cert_path = os.path.join(data_dir, "certifications.csv")
    if os.path.exists(cert_path):
        certifications_df = pd.read_csv(cert_path)
    platforms = {
        "Coursera": "coursera_courses.csv",
        "Udemy": "Udemy.csv",
        "edX": "edx.csv",
        "Skillshare": "skillshare.csv",
    }

    all_dfs = []
    for platform, filename in platforms.items():
        path = os.path.join(data_dir, filename)
        if os.path.exists(path):
            df = _normalize_csv(path, platform)
            if not df.empty:
                print(f"[DATA] Loaded {len(df)} courses from {platform}")
                all_dfs.append(df)
        else:
            print(f"[WARN] {filename} not found, skipping {platform}")

    if not all_dfs:
        print("No course data found at all.")
        return

    merged = pd.concat(all_dfs, ignore_index=True)
    # Sample up to 300 per platform to keep embeddings fast but ensure good coverage
    sampled_dfs = []
    for plat_df in all_dfs:
        sampled_dfs.append(plat_df.head(300))
    merged = pd.concat(sampled_dfs, ignore_index=True)

    temp_path = "/tmp/unified_courses.csv"
    merged.to_csv(temp_path, index=False)

    try:
        loader = CSVLoader(file_path=temp_path)
        documents = loader.load()

        print(f"Embedding {len(documents)} courses from {len(all_dfs)} platforms with OpenAI...")
        vector_store = FAISS.from_documents(documents, embeddings)
        print(f"Unified vector store ready! ({len(documents)} docs)")
    except Exception as e:
        print(f"Error initializing vector store: {e}")


# Must be called on boot
init_vector_store()

def generate_roadmap(target_role: str, missing_skills: List[str], time_investment: int = 10) -> dict:
    """Generates a concise list of course recommendations, projects, and certifications."""
    if not vector_store or not missing_skills:
        return _fallback_roadmap(missing_skills)
        
    print(f"[RAG] Generating multi-skill roadmap for {len(missing_skills)} gaps: {missing_skills}")
    
    # 1. Pool candidates for all skills
    candidate_docs = []
    seen_titles = set()
    
    for skill in missing_skills:
        try:
            docs = vector_store.similarity_search(query=skill, k=3)
            for doc in docs:
                # Extract title roughly to deduplicate
                lines = doc.page_content.split('\n')
                title = "Unknown"
                for line in lines:
                    if line.lower().startswith('title:'):
                        title = line.split(':', 1)[1].strip().lower()
                        break
                if title not in seen_titles:
                    seen_titles.add(title)
                    candidate_docs.append(doc)
        except Exception as e:
            print(f"FAISS search warning for {skill}: {e}")
            
    if not candidate_docs:
        return _fallback_roadmap(missing_skills)
        
    # Cap candidates to avoid context window explosion
    candidate_docs = candidate_docs[:40]
    
    candidate_texts = []
    for i, doc in enumerate(candidate_docs):
        candidate_texts.append(f"Candidate {i}:\n{doc.page_content}")
    candidates_str = "\n\n".join(candidate_texts)
    
    certs_str = "None available"
    if not certifications_df.empty:
        certs_str = certifications_df.to_csv(index=False)
        
    print(f"[RAG] Pooled {len(candidate_docs)} unique course candidates. Prompting LLM for selection.")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert career advisor. A user pursuing the role of '{target_role}' has these skill gaps:
{missing_skills}

They can study {time_investment} hours per week.

Below are {num_candidates} course candidates from our database:

{candidates}

Below are available professional certifications:

{certifications}

Your task:
1. Select a MINIMAL, optimal sequence of courses (ideally 3 to 6 courses total) that collectively cover as many of the skill gaps as possible. Favor comprehensive courses that cover MULTIPLE skills over single-skill courses. Ensure the total time makes sense.
2. Select 1-2 relevant certifications from the available certifications list.

CRITICAL INSTRUCTION ON ORDERING:
You MUST order the returned sequence of courses chronologically by difficulty/prerequisites. 
- Foundational and beginner courses that serve as prerequisites MUST come first (lower index in the final array).
- Intermediate courses should follow.
- Advanced or highly specialized topics MUST come last.

Respond in strict JSON format:
{{
  "courses": [
    {{
      "selected_index": 0, // The candidate index (0 to {num_candidates}-1)
      "skills_covered": ["Skill 1", "Skill 2"], 
      "reasoning": "Brief explanation of why this course is chosen, how it fits into the sequence, and what gaps it fills."
    }}
  ],
  "certifications": [
    {{
      "title": "Cert Title exactly as it appears in the list",
      "provider": "Provider Name",
      "cost_type": "Free or Paid",
      "url": "Exact URL from the list"
    }}
  ]
}}""")
    ])
    
    try:
        chain = prompt | chat_llm | JsonOutputParser()
        results = chain.invoke({
            "target_role": target_role,
            "missing_skills": json.dumps(missing_skills),
            "time_investment": time_investment,
            "candidates": candidates_str,
            "certifications": certs_str,
            "num_candidates": len(candidate_docs)
        })
        
        course_list = results.get("courses", []) if isinstance(results, dict) else results
        certs_list = results.get("certifications", []) if isinstance(results, dict) else []
        
        if not isinstance(course_list, list):
            course_list = [course_list]
            
        recommendations = []
        for res in course_list:
            idx = res.get('selected_index', -1)
            if idx < 0 or idx >= len(candidate_docs):
                continue
                
            best_doc = candidate_docs[idx]
            skills_covered = res.get('skills_covered', [])
            reasoning = res.get('reasoning', "Selected for comprehensive skill coverage.")
            
            # Parse the CSV row string
            content = best_doc.page_content
            lines = content.split('\n')
            
            course_data = {}
            for line in lines:
                if ':' in line:
                    key, val = line.split(':', 1)
                    course_data[key.strip().lower()] = val.strip()
            
            title = course_data.get('title', course_data.get('course', course_data.get('name', 'Unknown Course')))
            platform = course_data.get('platform', 'Coursera')
            direct_link = course_data.get('link', '').strip()
            instructor = course_data.get('instructor', '')
            description = course_data.get('description', '')
            
            # Build URL based on platform
            if direct_link and direct_link.startswith('http'):
                course_url = direct_link
            elif platform == "Udemy":
                course_url = f"https://www.udemy.com/courses/search/?q={quote_plus(title)}"
            elif platform == "Skillshare":
                course_url = f"https://www.skillshare.com/search?query={quote_plus(title)}"
            else:
                course_url = f"https://www.coursera.org/search?query={quote_plus(title)}"
            
            rec = CourseRecommendation(
                title=title,
                platform=platform,
                duration=course_data.get('duration', '1-3 Months').strip(),
                level=course_data.get('level', 'Beginner').strip(),
                rating=float(course_data.get('rating', '4.5') if course_data.get('rating') not in ['None', '', None] else '0.0'),
                skills_covered=skills_covered if skills_covered else missing_skills[:1],
                reasoning=reasoning,
                url=course_url,
                platform_url=direct_link if direct_link.startswith('http') else '',
                instructor=instructor,
                description=description
            )
            recommendations.append(rec)
            
        certs = [CertificationRecommendation(**c) for c in certs_list]
        
        if not recommendations:
            return _fallback_roadmap(missing_skills)
            
        return {
            "courses": recommendations,
            "certifications": certs
        }
        
    except Exception as e:
        print(f"RAG Error: {e}")
        return _fallback_roadmap(missing_skills)

def _fallback_roadmap(missing_skills: List[str]) -> dict:
    """Rule-based fallback when AI/Embeddings are unavailable."""
    recs = []
    for skill in missing_skills:
        title = f"Introduction to {skill}"
        recs.append(CourseRecommendation(
            title=title,
            platform="Generic",
            duration="1 Month",
            level="Beginner",
            rating=4.0,
            skills_covered=[skill],
            reasoning=f"(Fallback) Found matching course for {skill}.",
            url=f"https://www.coursera.org/search?query={quote_plus(skill)}"
        ))
    return {
        "courses": recs,
        "certifications": [CertificationRecommendation(title="Generic Cloud Cert", provider="CloudCorp", cost_type="Paid", url="https://example.com/cert")]
    }

def extract_transferable_skills(current_role: str, target_role: str, current_skills: List[str]) -> List[str]:
    """Identify transferable skills for a career switcher."""
    if not current_role.strip():
        return []
        
    try:
        prompt = ChatPromptTemplate.from_template(
            "You are an expert career transition coach. The user is moving from `{current_role}` to `{target_role}`.\n"
            "They firmly possess these explicit skills: {current_skills}.\n"
            "Identify 3 to 5 core transferable skills they likely ALREADY possess from their current role that will genuinely help in the target role, "
            "but are NOT in the explicit skills list.\n"
            "Return ONLY a valid JSON array of strings, e.g. [\"Project Management\", \"Stakeholder Communication\"]. "
            "Do not include markdown blocks or explanations."
        )
        chain = prompt | chat_llm | JsonOutputParser()
        skills = chain.invoke({
            "current_role": current_role,
            "target_role": target_role,
            "current_skills": ", ".join(current_skills) if current_skills else "None"
        })
        return skills if isinstance(skills, list) else []
    except Exception as e:
        print(f"Error extracting transferable skills: {e}")
        return []

def generate_mentorship_guide(mentee_role: str, target_role: str, missing_skills: List[str]) -> str:
    """Generate a data-backed guide for mentors."""
    if not mentee_role.strip():
        mentee_role = "beginner"
        
    try:
        prompt = ChatPromptTemplate.from_template(
            "You are an expert technical mentor. Your mentee is currently a `{mentee_role}` aiming to become a `{target_role}`.\n"
            "A gap analysis identified their biggest skill gaps as: {missing_skills}.\n"
            "Provide 3 to 4 concise, highly actionable talking points you should cover in your next 1:1 session to guide their development plan. "
            "Format as a clean markdown list. Do not include introductory text."
        )
        msg = prompt.format_messages(
            mentee_role=mentee_role, 
            target_role=target_role, 
            missing_skills=", ".join(missing_skills[:5])
        )
        res = chat_llm.invoke(msg)
        return res.content
    except Exception as e:
        print(f"Error generating mentorship guide: {e}")
        return ""

def extract_skills_from_jd(jd_text: str, current_skills: List[str]) -> List[str]:
    """Extracts required skills from a raw Job Description and returns the ones the user is missing."""
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert technical recruiter and resume reviewer.

Below is a raw Job Description provided by a company.
Analyze this text and extract the core REQUIRED technical and soft skills needed for the role.

Then, compare your extracted required skills against the user's CURRENT SKILLS:
{current_skills}

Return ONLY the skills from the Job Description that the user is MISSING.
Be concise. Return a JSON array of skill strings. Example: ["Python", "AWS", "Agile"]"""),
        ("user", "{jd_text}")
    ])
    
    try:
        chain = prompt | chat_llm | JsonOutputParser()
        missing = chain.invoke({
            "current_skills": json.dumps(current_skills),
            "jd_text": jd_text
        })
        if isinstance(missing, list):
            return [str(m).title() for m in missing]
        return []
    except Exception as e:
        print(f"Failed to extract skills from JD: {e}")
        return ["Communication", "Problem Solving", "Relevant Technical Skills"]


def perform_gap_analysis(current_skills: List[str], target_role: str):
    """Compare user skills against target role requirements using fuzzy matching across 100+ job descriptions."""
    try:
        jobs_path = os.path.join(os.path.dirname(__file__), "..", "data", "synthetic_jobs.json")
        with open(jobs_path, "r") as f:
            jobs = json.load(f)
        
        target_lower = target_role.lower()
        target_words = set(target_lower.split())
        
        # Score each job by relevance to target role
        scored_jobs = []
        for job in jobs:
            job_lower = job['title'].lower()
            score = 0
            
            # Exact match
            if target_lower == job_lower:
                score = 100
            # Contains match (either direction)
            elif target_lower in job_lower or job_lower in target_lower:
                score = 80
            else:
                # Word overlap scoring
                job_words = set(job_lower.split())
                overlap = job_words & target_words
                if overlap:
                    score = len(overlap) * 30  # 30 per overlapping word
            
            if score > 0:
                scored_jobs.append((score, job))
        
        if scored_jobs:
            # Sort by score (best matches first), take top matches
            scored_jobs.sort(key=lambda x: x[0], reverse=True)
            top_jobs = scored_jobs[:10]  # Aggregate from up to 10 best-matching job descriptions
            
            # Collect all required skills from matching jobs
            all_required = set()
            for _, job in top_jobs:
                for skill in job['skills']:
                    all_required.add(skill.lower().strip())
            
            print(f"[Gap Analysis] Matched {len(top_jobs)} job descriptions for '{target_role}', aggregated {len(all_required)} required skills.")
            
            current_skills_lower = [s.lower().strip() for s in current_skills]
            
            # Fuzzy matching: check if any current skill is a substring of a required skill or vice versa
            missing = []
            for req_skill in all_required:
                found = False
                for curr_skill in current_skills_lower:
                    if curr_skill in req_skill or req_skill in curr_skill:
                        found = True
                        break
                if not found:
                    missing.append(req_skill.title())
            
            return missing if missing else ["Advanced " + list(all_required)[0].title()]
        
        # LLM fallback: no matching jobs
        print(f"[Gap Analysis] No job match for '{target_role}'. Using LLM to determine required skills.")
        try:
            llm_resp = chat_llm.invoke([
                SystemMessage(content=f"List exactly 8-10 technical skills required for the role: '{target_role}'. Return ONLY a JSON array of strings, nothing else. Example: [\"Python\", \"TensorFlow\"]")
            ])
            import re
            match = re.search(r'\[.*?\]', llm_resp.content, re.DOTALL)
            if match:
                required = json.loads(match.group())
                current_lower = [s.lower().strip() for s in current_skills]
                missing = [s for s in required if s.lower().strip() not in current_lower]
                return missing if missing else [f"Advanced {required[0]}"]
        except Exception as llm_err:
            print(f"LLM Gap Analysis fallback error: {llm_err}")
        return ["System Design", "Cloud Architecture"]
    except Exception as e:
        print(f"Gap Analysis Error: {e}")
        return ["Communication (Fallback)"]

def calculate_ml_match_percentage(current_skills: List[str], target_role: str, missing_skills: List[str]) -> int:
    """Uses LLM to evaluate the depth and relevance of current skills against missing skills for an exact semantic match percentage."""
    if not current_skills:
         return 0
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an AI HR recruiting algorithm. Evaluate the user's readiness for the role '{target_role}'.\\nCurrent Skills: {current_skills}\\nMissing Skills: {missing_skills}\\n\\nRule: A user with extensive baseline engineering skills might be 70% ready for an ML role even if missing TensorFlow.\\nOutput ONLY a single integer between 0 and 100 representing their 'Skill Match Percentage'. No other text.")
    ])
    try:
         chain = prompt | chat_llm
         res = chain.invoke({
             "target_role": target_role,
             "current_skills": json.dumps(current_skills),
             "missing_skills": json.dumps(missing_skills)
         })
         pct = int(res.content.strip()[:3].replace("%", ""))
         return min(max(pct, 0), 100)
    except:
         # Fallback to math
         total = len(current_skills) + len(missing_skills)
         return round((len(current_skills) / max(total, 1)) * 100)


def generate_projects(target_role: str, missing_skills: List[str]) -> List[dict]:
    if not missing_skills:
        return []
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an expert technical mentor. A user pursuing the role of '{target_role}' has these specific skill gaps:
{missing_skills}

Your task:
Suggest exactly 2-3 specific, high-quality Capstone Portfolio Projects that the user can build to gain practical experience and bridge these exact skill gaps.
Ensure the projects are highly relevant to the target role.

Respond in strict JSON format:
{{
  "projects": [
    {{
      "title": "Project Title",
      "description": "A 2-3 sentence description of the project and what it achieves.",
      "skills_covered": ["Skill 1", "Skill 2"]
    }}
  ]
}}""")
    ])
    
    try:
        chain = prompt | chat_llm | JsonOutputParser()
        results = chain.invoke({
            "target_role": target_role,
            "missing_skills": json.dumps(missing_skills)
        })
        return results.get("projects", []) if isinstance(results, dict) else []
    except Exception as e:
        print(f"Error generating projects: {e}")
        return []

project_chat_sessions = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in project_chat_sessions:
        project_chat_sessions[session_id] = ChatMessageHistory()
    return project_chat_sessions[session_id]

def init_project_chat(session_id: str, project_context: str) -> str:
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert technical tutor introducing a student to their new Capstone Project:\\n{project_context}\\n\\nYour goal is to provide a highly engaging, structured welcome message (using markdown). You must outline: 1. Why this project is practically useful for their career. 2. A high-level 3-step technical roadmap on how they should start building it right now. Do not ask them questions yet, just provide the blueprint.")
    ])
    
    memory = get_session_history(session_id)
    memory.clear() # Clear memory when switching projects
    chain = prompt | chat_llm
    
    try:
        response = chain.invoke({"project_context": project_context})
        memory.add_ai_message(response.content)
        return response.content
    except Exception as e:
        print(f"Error in init project chat: {e}")
        return "Let's build this! What part would you like to start with?"

def project_chat(session_id: str, message: str, project_context: str) -> str:
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert technical tutor guiding a student through this specific project:\\n{project_context}\\n\\nYour goal is to answer their questions, explain core fundamentals, and help them break down the project into manageable steps. Be encouraging, highly technical, and concise."),
        MessagesPlaceholder(variable_name="history"),
        ("user", "{input}")
    ])
    
    memory = get_session_history(session_id)
    chain = prompt | chat_llm
    
    try:
        response = chain.invoke({
            "project_context": project_context,
            "input": message,
            "history": memory.messages
        })
        memory.add_user_message(message)
        memory.add_ai_message(response.content)
        return response.content
    except Exception as e:
        print(f"Error in project chat: {e}")
        return "I'm having trouble connecting right now. Let's try again in a moment!"
