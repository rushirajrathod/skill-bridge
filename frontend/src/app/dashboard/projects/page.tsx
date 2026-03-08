"use client"

import { useEffect, useState, useRef } from "react"
import { motion } from "framer-motion"
import { useAppStore, Project } from "@/store/useAppStore"
import { useRouter } from "next/navigation"
import { Loader2, ArrowLeft, Target, MessageSquare, Send, Bot, User, Code } from "lucide-react"
import api from "@/lib/api"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ProjectsHub() {
    const { targetRole, roadmap, sessionId, projectState, setProjectState } = useAppStore()
    const { projects, history: chatHistory, selectedProject } = projectState
    const router = useRouter()

    const [isGenerating, setIsGenerating] = useState(projects.length === 0)
    const [error, setError] = useState<string | null>(null)

    const [chatInput, setChatInput] = useState("")
    const [isChatting, setIsChatting] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Helper to update store
    const updateProjectState = (patch: Partial<typeof projectState>) => {
        setProjectState({ ...projectState, ...patch })
    }

    useEffect(() => {
        if (!targetRole || !roadmap) {
            router.push("/dashboard/roadmap")
            return
        }

        if (projects.length > 0) {
            setIsGenerating(false)
            return
        }

        // Generate projects on the fly (since we decoupled them from roadmap)
        api.post('/projects/generate', {
            target_role: roadmap.role || targetRole,
            missing_skills: roadmap.missing_skills
        }).then(res => {
            const newProjects = res.data.projects || []
            if (newProjects.length > 0) {
                updateProjectState({
                    projects: newProjects,
                    selectedProject: newProjects[0],
                    history: [{
                        role: 'ai',
                        content: `Hi! Let's talk about **${newProjects[0].title}**. What part of this project would you like to build first, or what concepts can I explain for you?`
                    }]
                })
            } else {
                updateProjectState({ projects: [] })
            }
            setIsGenerating(false)
        }).catch(() => {
            setError("Failed to synthesize projects. Please try again.")
            setIsGenerating(false)
        })
    }, [targetRole, roadmap, router])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [chatHistory])

    const handleProjectSelect = async (proj: Project) => {
        updateProjectState({
            selectedProject: proj,
            history: [{
                role: 'ai',
                content: `Generating a structured getting-started roadmap for **${proj.title}**...`
            }]
        })
        setIsChatting(true)

        try {
            const res = await api.post('/projects/init-chat', {
                session_id: sessionId,
                project_context: `Title: ${proj.title}\nDescription: ${proj.description}\nSkills Covered: ${proj.skills_covered.join(", ")}`
            })
            updateProjectState({
                history: [{
                    role: 'ai',
                    content: res.data.response
                }]
            })
        } catch (err) {
            updateProjectState({
                history: [{
                    role: 'ai',
                    content: `Switched to **${proj.title}**. What would you like to know about tackling this project?`
                }]
            })
        } finally {
            setIsChatting(false)
        }
    }

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!chatInput.trim() || !selectedProject || isChatting) return

        const userMsg = chatInput.trim()
        setChatInput("")
        const newHistory = [...chatHistory, { role: 'user', content: userMsg }] as any
        updateProjectState({ history: newHistory })
        setIsChatting(true)

        try {
            const res = await api.post('/projects/chat', {
                session_id: sessionId,
                message: userMsg,
                project_context: `Title: ${selectedProject.title}\nDescription: ${selectedProject.description}\nSkills Covered: ${selectedProject.skills_covered.join(", ")}`
            })
            updateProjectState({
                history: [...newHistory, { role: 'ai', content: res.data.response }]
            })
        } catch (err) {
            updateProjectState({
                history: [...newHistory, { role: 'ai', content: "Sorry, I'm having trouble connecting to the network right now." }]
            })
        } finally {
            setIsChatting(false)
        }
    }

    if (isGenerating) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-6">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <Loader2 className="w-12 h-12 text-[#A855F7]" />
                </motion.div>
                <div className="text-center">
                    <h2 className="text-xl font-bold text-cream mb-2">Synthesizing Capstone Projects...</h2>
                    <p className="text-cream/40 text-sm">Designing practical portfolio pieces specifically tailored to address your missing skills.</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center text-center p-8">
                <div>
                    <p className="text-ember font-bold mb-4">{error}</p>
                    <button onClick={() => router.push("/dashboard/roadmap")} className="px-6 py-2 bg-cream/10 rounded-lg text-cream">Go Back</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col h-screen">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <button onClick={() => router.push("/dashboard/roadmap")} className="text-cream/40 hover:text-cream flex items-center gap-2 mb-4 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Roadmap
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-black text-cream flex items-center gap-3">
                        <Code className="w-8 h-8 text-[#A855F7]" /> Project Hub
                    </h1>
                    <p className="text-cream/50 mt-2">Interactive tailored projects to rapidly build your required skills.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 bg-black/20 rounded-3xl border border-cream/5 overflow-hidden p-6">

                {/* ─── Projects Sidebar ─── */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {projects.map((proj, idx) => {
                        const isSelected = selectedProject?.title === proj.title
                        return (
                            <button key={idx} onClick={() => handleProjectSelect(proj)}
                                className={`text-left p-5 rounded-2xl border transition-all ${isSelected ? 'bg-[#A855F7]/10 border-[#A855F7] shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-olive-200 border-cream/5 hover:border-cream/20'}`}>
                                <h3 className={`text-lg font-bold mb-2 transition-colors ${isSelected ? 'text-[#A855F7]' : 'text-cream'}`}>{proj.title}</h3>
                                <p className="text-sm text-cream/60 leading-relaxed mb-4 line-clamp-2">{proj.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {(proj.skills_covered || []).map((skill: string, sIdx: number) => (
                                        <span key={sIdx} className="px-2 py-1 bg-black/40 text-cream/50 text-[10px] uppercase font-bold tracking-wider rounded border border-cream/5">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* ─── Interactive AI Chat Area ─── */}
                <div className="flex-1 flex flex-col bg-olive-300 rounded-2xl border border-cream/5 overflow-hidden relative shadow-inner">
                    {/* Chat Header */}
                    <div className="p-4 bg-olive-200 border-b border-cream/5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#A855F7]/20 flex items-center justify-center border border-[#A855F7]/30">
                            <Bot className="w-5 h-5 text-[#A855F7]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-cream">Project Tutor</h3>
                            <p className="text-xs text-cream/40 tracking-wider font-medium">discussing '{selectedProject?.title}'</p>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {chatHistory.map((msg, idx) => (
                            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-ember/20 text-ember' : 'bg-[#A855F7]/20 text-[#A855F7]'}`}>
                                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 ${msg.role === 'user' ? 'bg-ember text-cream' : 'glass border border-cream/5 text-cream/80'}`}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                </div>
                            </motion.div>
                        ))}
                        {isChatting && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-[#A855F7]/20 text-[#A855F7] flex items-center justify-center">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="p-4 rounded-2xl glass border border-cream/5 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-[#A855F7] rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-[#A855F7] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                    <span className="w-2 h-2 bg-[#A855F7] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-olive-200 border-t border-cream/5">
                        <form onSubmit={handleSendMessage} className="relative flex items-center">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Ask how to start, or format a database schema..."
                                disabled={isChatting}
                                className="w-full pl-6 pr-16 py-4 bg-black/20 border border-cream/10 rounded-2xl text-cream placeholder:text-cream/30 focus:outline-none focus:border-[#A855F7]/50 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={isChatting || !chatInput.trim()}
                                className="absolute right-2 p-3 bg-[#A855F7] hover:bg-[#9333EA] disabled:opacity-50 disabled:hover:bg-[#A855F7] text-white rounded-xl transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
