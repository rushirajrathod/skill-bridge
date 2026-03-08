import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Course {
    title: string
    platform: string
    duration: string
    level: string
    rating: number
    skills_covered: string[]
    reasoning: string
    url: string
}

export interface Project {
    title: string
    description: string
    skills_covered: string[]
}

export interface Certification {
    title: string
    provider: string
    cost_type: string
    url: string
}

export interface Roadmap {
    role: string
    missing_skills: string[]
    courses: Course[]
    projects: Project[]
    certifications: Certification[]
    confidence_score: number
    is_fallback: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analytics: Record<string, any>
}

export interface ChatMessage {
    id: string
    role: 'user' | 'ai'
    content: string
}

interface AppState {
    // User Data
    persona: 'graduate' | 'switcher' | 'mentor'
    setPersona: (p: 'graduate' | 'switcher' | 'mentor') => void
    currentRole: string
    setCurrentRole: (role: string) => void
    targetRole: string | null
    targetJobDescription: string
    currentSkills: string[]
    timeInvestment: number
    setTargetRole: (role: string) => void
    setTargetJobDescription: (jd: string) => void
    addSkills: (skills: string[]) => void
    resetSkills: () => void
    setTimeInvestment: (hours: number) => void

    // Chat State
    sessionId: string
    messages: ChatMessage[]
    isChatLoading: boolean
    addMessage: (msg: ChatMessage) => void
    setChatLoading: (loading: boolean) => void

    // Roadmap State
    roadmap: Roadmap | null
    isRoadmapLoading: boolean
    setRoadmap: (roadmap: Roadmap | null) => void
    setRoadmapLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            persona: 'graduate',
            setPersona: (p) => set({ persona: p }),
            currentRole: '',
            setCurrentRole: (r) => set({ currentRole: r }),
            targetRole: null,
            targetJobDescription: '',
            currentSkills: [],
            timeInvestment: 10,
            setTargetRole: (role) => set({ targetRole: role }),
            setTargetJobDescription: (jd) => set({ targetJobDescription: jd }),
            addSkills: (skills) => set((state) => ({
                currentSkills: Array.from(new Set([...state.currentSkills, ...skills]))
            })),
            resetSkills: () => set({ currentSkills: [], roadmap: null, targetRole: null, targetJobDescription: '' }),
            setTimeInvestment: (hours) => set({ timeInvestment: hours }),

            sessionId: typeof crypto !== 'undefined' ? crypto.randomUUID() : 'default-session',
            messages: [
                { id: '1', role: 'ai', content: "Hi! I'm Aura, your AI Career Navigator. What role are you aiming for?" }
            ],
            isChatLoading: false,
            addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
            setChatLoading: (loading) => set({ isChatLoading: loading }),

            roadmap: null,
            isRoadmapLoading: false,
            setRoadmap: (roadmap) => set({ roadmap }),
            setRoadmapLoading: (loading) => set({ isRoadmapLoading: loading })
        }),
        {
            name: 'skill-bridge-storage',
            // Do not persist loading states
            partialize: (state) => ({
                persona: state.persona,
                currentRole: state.currentRole,
                targetRole: state.targetRole,
                targetJobDescription: state.targetJobDescription,
                currentSkills: state.currentSkills,
                timeInvestment: state.timeInvestment,
                sessionId: state.sessionId,
                roadmap: state.roadmap,
                messages: state.messages
            }),
        }
    )
)
