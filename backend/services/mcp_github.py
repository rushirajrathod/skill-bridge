import os
import httpx
from typing import List

# In a full production environment, this would use the official MCP SDK
# to connect to a running `@modelcontextprotocol/server-github` instance.
# For the scope of this project, we will simulate the MCP interaction pattern 
# using the direct GitHub API to gather evidence of skills.

async def analyze_github_profile(username: str) -> List[str]:
    """
    Simulates an MCP interaction where an agent explores a user's GitHub
    to extract technical skills based on languages and repo names.
    """
    # Since this is a demonstration of MCP functionality on public data,
    # we simulate the agent interaction using the unauthenticated API endpoint.
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Skill-Bridge-MCP-Simulator"
    }
        
    extracted_skills = set()
    
    try:
        async with httpx.AsyncClient() as client:
            # MCP: "Get user repositories"
            repos_resp = await client.get(
                f"https://api.github.com/users/{username}/repos?sort=updated&per_page=10",
                headers=headers,
                timeout=10.0
            )
            
            if repos_resp.status_code != 200:
                print(f"GitHub API Error: {repos_resp.status_code}")
                return []
                
            repos = repos_resp.json()
            
            for repo in repos:
                # Direct language tagging
                lang = repo.get("language")
                if lang:
                    extracted_skills.add(lang)
                    
                # Description analysis
                desc = repo.get("description", "") or ""
                desc = desc.lower()
                
                # Simple rule-based extraction from repo descriptions (MCP logic simulation)
                tech_keywords = {
                    "react": "React", "nextjs": "Next.js", "next.js": "Next.js",
                    "node": "Node.js", "docker": "Docker", "aws": "AWS",
                    "k8s": "Kubernetes", "kubernetes": "Kubernetes",
                    "tailwind": "Tailwind CSS", "machine learning": "Machine Learning",
                    "fastapi": "FastAPI", "flask": "Flask", "django": "Django",
                    "sql": "SQL", "postgres": "PostgreSQL", "mongodb": "MongoDB"
                }
                
                for kw, readable in tech_keywords.items():
                    if kw in desc:
                        extracted_skills.add(readable)
                        
        return list(extracted_skills)
        
    except httpx.RequestError as e:
        print(f"HTTP Request failed: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error in GitHub MCP: {e}")
        return []
