"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Github, Upload, ArrowRight, Loader2, CheckCircle2, Briefcase, Code2, Sparkles, AlertCircle, Trash2, ArrowLeft, X, GraduationCap, Repeat, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useAppStore } from "@/store/useAppStore"
import AIDisclaimer from "@/components/AIDisclaimer"

export default function OnboardingWizard() {
    const [step, setStep] = useState(1)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState("")
    const [manualSkill, setManualSkill] = useState("")
    const [localRole, setLocalRole] = useState("")
    const [localLevel, setLocalLevel] = useState("Junior")
    const [showGithubModal, setShowGithubModal] = useState(false)
    const [githubUsername, setGithubUsername] = useState("")
    const [roleSuggestions, setRoleSuggestions] = useState<string[]>([])
    const [showRoleDropdown, setShowRoleDropdown] = useState(false)
    const roleDropdownRef = useRef<HTMLDivElement>(null)

    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { addSkills, currentSkills, setTargetRole, sessionId, timeInvestment, setTimeInvestment, resetSkills, persona, setPersona, currentRole, setCurrentRole, targetJobDescription, setTargetJobDescription, setRoadmap } = useAppStore()

    const handleGithubSync = async (username: string) => {
        if (!username.trim()) return
        setShowGithubModal(false)
        setGithubUsername("")
        setIsProcessing(true)
        setError("")
        try {
            const mcp_resp = await api.post('/github/analyze', { username: username.trim() })
            if (mcp_resp.data.skills.length > 0) addSkills(mcp_resp.data.skills)
            else setError("No skills found on that GitHub profile.")
        } catch { setError("Failed to sync with GitHub.") }
        finally { setIsProcessing(false) }
    }

    // ── Role Autocomplete ──
    const fetchRoleSuggestions = useCallback(async (query: string) => {
        try {
            const resp = await api.get(`/roles/suggest?q=${encodeURIComponent(query)}`)
            setRoleSuggestions(resp.data.roles || [])
            setShowRoleDropdown(true)
        } catch { setRoleSuggestions([]) }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (localRole.trim().length >= 1) fetchRoleSuggestions(localRole)
            else setShowRoleDropdown(false)
        }, 200)
        return () => clearTimeout(timer)
    }, [localRole, fetchRoleSuggestions])

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) setShowRoleDropdown(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsProcessing(true)
        setError("")
        const formData = new FormData()
        formData.append("file", file)
        formData.append("session_id", sessionId || "new")
        try {
            const resp = await api.post('/upload-resume', formData, { headers: { "Content-Type": "multipart/form-data" } })
            if (resp.data.skills.length > 0) addSkills(resp.data.skills)
            else setError("No technical skills could be extracted.")
        } catch { setError("Error parsing the uploaded document.") }
        finally { setIsProcessing(false); if (fileInputRef.current) fileInputRef.current.value = "" }
    }

    const addManualSkill = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualSkill.trim()) { addSkills([manualSkill.trim()]); setManualSkill(""); setError("") }
    }

    const nextStep = () => {
        if (step === 2 && currentSkills.length === 0) { setError("Add at least one skill to continue."); return }
        if (step === 3 && !localRole.trim()) { setError("Enter a target role."); return }
        if (step === 3 && (persona === 'switcher' || persona === 'mentor') && !currentRole.trim()) { setError("Enter a current role."); return }
        setError(""); setStep(step + 1)
    }

    const generateRoadmap = async () => {
        const finalRole = localRole.trim() || 'Custom Role'
        setTargetRole(`${localLevel} ${finalRole}`.trim())
        setIsProcessing(true)
        setError('')
        try {
            const roadmapRes = await api.post('/roadmap/generate', {
                session_id: sessionId,
                target_role: finalRole,
                target_job_description: targetJobDescription ? targetJobDescription.trim() : null,
                current_skills: currentSkills,
                time_investment: timeInvestment,
                persona: persona,
                current_role: currentRole
            })
            setRoadmap(roadmapRes.data)
            router.push("/dashboard/roadmap")
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to generate roadmap. Please try again.")
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center pt-20 pb-20 px-4 sm:px-6 relative">

            {/* ─── GitHub Username Modal ─── */}
            <AnimatePresence>
                {showGithubModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGithubModal(false)} />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-md glass rounded-2xl overflow-hidden border border-cream/10"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-6 pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-olive-200 border border-cream/5 flex items-center justify-center">
                                        <Github className="w-5 h-5 text-ember" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-cream">Connect GitHub</h3>
                                        <p className="text-xs text-cream/25">MCP agent will analyze your repos</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowGithubModal(false)} className="text-cream/20 hover:text-cream/50 transition-colors p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Input */}
                            <form onSubmit={(e) => { e.preventDefault(); handleGithubSync(githubUsername) }} className="px-6 py-5">
                                <label className="text-xs font-medium text-cream/30 mb-2 block">GitHub Username</label>
                                <input
                                    autoFocus
                                    placeholder="e.g. octocat"
                                    value={githubUsername}
                                    onChange={(e) => setGithubUsername(e.target.value)}
                                    className="w-full px-4 py-3 bg-olive-200 border border-cream/5 rounded-xl text-cream placeholder:text-cream/15 focus:outline-none focus:border-ember/40 focus:ring-1 focus:ring-ember/20 transition-all text-sm"
                                />
                            </form>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 px-6 pb-6">
                                <button onClick={() => setShowGithubModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-cream/30 hover:text-cream/60 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleGithubSync(githubUsername)}
                                    disabled={!githubUsername.trim()}
                                    className="px-5 py-2.5 bg-ember hover:bg-ember-500 text-cream rounded-xl text-sm font-bold transition-colors disabled:opacity-30 flex items-center gap-2"
                                >
                                    <Github className="w-4 h-4" /> Connect
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="w-full max-w-2xl relative z-10">
                <AnimatePresence mode="wait">

                    {/* ─── STEP 1: PERSONA SELECTION ─── */}
                    {step === 1 && (
                        <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                            <div className="glass rounded-3xl overflow-hidden">
                                {/* Header */}
                                <div className="text-center px-8 pt-10 pb-8">
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-olive-200 flex items-center justify-center border border-cream/5 mb-6">
                                        <Users className="w-8 h-8 text-ember" />
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight text-cream mb-2">Who are you?</h2>
                                    <p className="text-cream/35 text-base">Select your goal so we can tailor the AI roadmap.</p>
                                </div>

                                {/* Content */}
                                <div className="space-y-4 px-8 pb-8">
                                    <button onClick={() => { setPersona('graduate'); nextStep() }}
                                        className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${persona === 'graduate' ? 'bg-ember/10 border-ember text-cream' : 'bg-olive-200 border-cream/5 text-cream/60 hover:border-cream/20 hover:text-cream'}`}>
                                        <div className={`p-3 rounded-xl ${persona === 'graduate' ? 'bg-ember/20 text-ember' : 'bg-olive-300 text-cream/40'}`}>
                                            <GraduationCap className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">Recent Graduate / Beginner</h3>
                                            <p className="text-sm opacity-60">I want to build my foundation from scratch.</p>
                                        </div>
                                    </button>

                                    <button onClick={() => { setPersona('switcher'); nextStep() }}
                                        className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${persona === 'switcher' ? 'bg-ember/10 border-ember text-cream' : 'bg-olive-200 border-cream/5 text-cream/60 hover:border-cream/20 hover:text-cream'}`}>
                                        <div className={`p-3 rounded-xl ${persona === 'switcher' ? 'bg-ember/20 text-ember' : 'bg-olive-300 text-cream/40'}`}>
                                            <Repeat className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">Career Switcher</h3>
                                            <p className="text-sm opacity-60">I want to leverage my transferable skills for a new role.</p>
                                        </div>
                                    </button>

                                    <button onClick={() => { setPersona('mentor'); nextStep() }}
                                        className={`w-full p-5 rounded-2xl border text-left transition-all flex items-center gap-4 ${persona === 'mentor' ? 'bg-ember/10 border-ember text-cream' : 'bg-olive-200 border-cream/5 text-cream/60 hover:border-cream/20 hover:text-cream'}`}>
                                        <div className={`p-3 rounded-xl ${persona === 'mentor' ? 'bg-ember/20 text-ember' : 'bg-olive-300 text-cream/40'}`}>
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">Mentor / Coach</h3>
                                            <p className="text-sm opacity-60">I am guiding a mentee and need a data-backed plan.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 2: SKILLS ─── */}
                    {step === 2 && (
                        <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                            <div className="glass rounded-3xl overflow-hidden">
                                {/* Header */}
                                <div className="text-center px-8 pt-10 pb-8">
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-olive-200 flex items-center justify-center border border-cream/5 mb-6">
                                        <Code2 className="w-8 h-8 text-ember" />
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight text-cream mb-2">Build Your Skill Profile</h2>
                                    <p className="text-cream/35 text-base">Let Aura AI analyze your abilities. Connect sources or enter manually.</p>
                                </div>

                                {/* Content */}
                                <div className="space-y-6 px-8">
                                    {/* Source buttons */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button onClick={() => setShowGithubModal(true)} disabled={isProcessing}
                                            className="h-24 flex flex-col items-center justify-center gap-3 rounded-xl border border-cream/5 bg-olive-200 hover:bg-olive-100 hover:border-cream/10 transition-all group disabled:opacity-50">
                                            <Github className="w-8 h-8 text-cream/40 group-hover:text-ember transition-colors" />
                                            <span className="font-medium text-cream/70 text-sm">Sync GitHub</span>
                                        </button>
                                        <button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}
                                            className="h-24 flex flex-col items-center justify-center gap-3 rounded-xl border border-cream/5 bg-olive-200 hover:bg-olive-100 hover:border-cream/10 transition-all group disabled:opacity-50">
                                            <Upload className="w-8 h-8 text-cream/40 group-hover:text-ember transition-colors" />
                                            <span className="font-medium text-cream/70 text-sm">Upload Resume</span>
                                        </button>
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                                    </div>

                                    {/* Divider */}
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-cream/5" /></div>
                                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-olive-300/40 px-3 text-cream/25 backdrop-blur">Or add manually</span></div>
                                    </div>

                                    {/* Manual input */}
                                    <form onSubmit={addManualSkill} className="flex gap-2">
                                        <input placeholder="e.g. React, Python, AWS" value={manualSkill} onChange={(e) => setManualSkill(e.target.value)} disabled={isProcessing}
                                            className="flex-1 px-4 py-3 bg-olive-200 border border-cream/5 rounded-xl text-cream placeholder:text-cream/20 focus:outline-none focus:border-ember/30 transition-colors" />
                                        <button type="submit" disabled={!manualSkill.trim() || isProcessing}
                                            className="px-5 py-3 bg-ember hover:bg-ember-500 text-cream rounded-xl font-semibold text-sm transition-colors disabled:opacity-30">Add</button>
                                    </form>

                                    {/* Skills list */}
                                    {currentSkills.length > 0 && (
                                        <div className="p-4 rounded-xl bg-olive-200 border border-cream/5">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2 text-sm font-medium text-cream/80">
                                                    <CheckCircle2 className="w-4 h-4 text-ember" /> Analyzed Skills ({currentSkills.length})
                                                </div>
                                                <button onClick={() => { resetSkills(); setError("") }}
                                                    className="flex items-center gap-1 text-xs text-ember/60 hover:text-ember transition-colors px-2 py-1 rounded hover:bg-ember/5">
                                                    <Trash2 className="w-3 h-3" /> Reset All
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {currentSkills.map((skill, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-olive-300 border border-cream/5 rounded-full text-xs text-cream/60">{skill}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="flex items-center gap-2 text-ember text-sm bg-ember/5 p-3 rounded-lg border border-ember/10">
                                            <AlertCircle className="w-4 h-4" /> {error}
                                        </div>
                                    )}

                                    {isProcessing && (
                                        <div className="flex items-center justify-center gap-3 text-cream/40 text-sm py-4">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Mining data sources...
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-8 pb-8 pt-6 flex gap-4">
                                    <button onClick={() => setStep(1)} disabled={isProcessing}
                                        className="h-12 px-6 rounded-xl border border-cream/5 text-cream/50 hover:text-cream hover:bg-olive-200 transition-all flex items-center gap-2">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button onClick={nextStep} disabled={isProcessing || currentSkills.length === 0}
                                        className="flex-1 h-12 flex items-center justify-center gap-2 text-base font-semibold bg-ember hover:bg-ember-500 text-cream rounded-xl transition-colors disabled:opacity-30">
                                        Continue <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ─── STEP 3: ROLE & LEVEL ─── */}
                    {step === 3 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                            <div className="glass rounded-3xl overflow-hidden">
                                <div className="text-center px-8 pt-10 pb-8">
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-olive-200 flex items-center justify-center border border-cream/5 mb-6">
                                        <Briefcase className="w-8 h-8 text-ember" />
                                    </div>
                                    <h2 className="text-3xl font-bold tracking-tight text-cream mb-2">Define Your Goal</h2>
                                    <p className="text-cream/35 text-base">What role are you targeting? We&apos;ll map your {currentSkills.length} skills against it.</p>
                                </div>

                                <div className="space-y-6 px-8">
                                    {/* ─── Mode Toggle ─── */}
                                    <div className="flex bg-olive-300/50 p-1 rounded-xl">
                                        <button
                                            onClick={() => setTargetJobDescription('')}
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!targetJobDescription ? 'bg-ember text-cream shadow-lg' : 'text-cream/40 hover:text-cream/80'}`}
                                        >
                                            By Job Title
                                        </button>
                                        <button
                                            onClick={() => { setTargetJobDescription(' '); setLocalRole('Custom Role'); }}
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${targetJobDescription ? 'bg-ember text-cream shadow-lg' : 'text-cream/40 hover:text-cream/80'}`}
                                        >
                                            Paste Job Description
                                        </button>
                                    </div>

                                    {(persona === 'switcher' || persona === 'mentor') && (
                                        <div className="space-y-2 mb-6">
                                            <label className="text-sm font-medium text-cream/50 ml-1">
                                                {persona === 'switcher' ? 'Your Current Role' : "Mentee's Current Role"}
                                            </label>
                                            <input placeholder="e.g. Data Analyst, Cashier, etc." value={currentRole}
                                                onChange={(e) => setCurrentRole(e.target.value)}
                                                disabled={isProcessing}
                                                className="w-full px-4 py-3 bg-olive-200 border border-cream/5 rounded-xl text-cream h-12 text-lg placeholder:text-cream/20 focus:outline-none focus:border-ember/30 transition-colors" />
                                        </div>
                                    )}

                                    {!targetJobDescription ? (
                                        <div className="space-y-2 relative" ref={roleDropdownRef}>
                                            <label className="text-sm font-medium text-cream/50 ml-1">
                                                {persona === 'mentor' ? "Mentee's Target Role" : "Desired Job Title"}
                                            </label>
                                            <input placeholder="Start typing... e.g. Machine Learning" value={localRole}
                                                onChange={(e) => setLocalRole(e.target.value)}
                                                onFocus={() => { if (localRole.trim()) fetchRoleSuggestions(localRole) }}
                                                disabled={isProcessing}
                                                className="w-full px-4 py-3 bg-olive-200 border border-cream/5 rounded-xl text-cream h-12 text-lg placeholder:text-cream/20 focus:outline-none focus:border-ember/30 transition-colors" />

                                            <AnimatePresence>
                                                {showRoleDropdown && roleSuggestions.length > 0 && (
                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                                        className="absolute z-20 w-full mt-2 bg-olive-200 border border-cream/5 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                                        <div className="max-h-64 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-cream/10">
                                                            {roleSuggestions.map((role, idx) => (
                                                                <button key={idx} onClick={() => { setLocalRole(role); setShowRoleDropdown(false) }}
                                                                    className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-sm text-cream/80 hover:text-white transition-colors flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-olive-300 flex items-center justify-center border border-cream/5">
                                                                        <Briefcase className="w-4 h-4 text-cream/40" />
                                                                    </div>
                                                                    {role}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 relative">
                                            <label className="text-sm font-medium text-cream/50 ml-1">
                                                Paste Target Job Description
                                            </label>
                                            <textarea
                                                placeholder="Paste the full job description here... (requirements, responsibilities, etc.)"
                                                value={targetJobDescription.trim()}
                                                onChange={(e) => {
                                                    setTargetJobDescription(e.target.value)
                                                    setLocalRole(e.target.value ? "Custom Application" : "")
                                                }}
                                                disabled={isProcessing}
                                                className="w-full px-4 py-3 bg-olive-200 border border-cream/5 rounded-xl text-cream h-48 text-sm placeholder:text-cream/20 focus:outline-none focus:border-ember/30 transition-colors resize-none"
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-cream/50 ml-1">Target Seniority Level</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['Junior', 'Mid-Level', 'Senior'].map((level) => (
                                                <button key={level} onClick={() => setLocalLevel(level)} disabled={isProcessing}
                                                    className={`h-12 rounded-xl border text-sm font-medium transition-all ${localLevel === level
                                                        ? 'bg-ember text-cream border-ember font-bold' : 'border-cream/5 bg-olive-200 text-cream/40 hover:text-cream/70 hover:border-cream/10'}`}>
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-sm font-medium text-cream/50">Hours / Week</label>
                                            <span className="text-sm text-ember font-mono font-bold">{timeInvestment} hrs</span>
                                        </div>
                                        <input type="range" min="1" max="40" value={timeInvestment} onChange={(e) => setTimeInvestment(Number(e.target.value))}
                                            className="w-full h-2 bg-olive-200 rounded-lg appearance-none cursor-pointer accent-ember" />
                                        <div className="flex justify-between text-xs text-cream/20 px-1 pt-1">
                                            <span>Light</span><span>Intensive</span>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-center gap-2 text-ember text-sm bg-ember/5 p-3 rounded-lg border border-ember/10">
                                            <AlertCircle className="w-4 h-4" /> {error}
                                        </div>
                                    )}
                                </div>

                                <div className="px-8 pb-8 pt-6 flex gap-4">
                                    <button onClick={() => setStep(2)} disabled={isProcessing}
                                        className="h-12 px-6 rounded-xl border border-cream/5 text-cream/50 hover:text-cream hover:bg-olive-200 transition-all flex items-center gap-2">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button onClick={generateRoadmap} disabled={isProcessing || !localRole.trim()}
                                        className="flex-1 h-12 flex items-center justify-center gap-2 text-base font-semibold bg-ember hover:bg-ember-500 text-cream rounded-xl transition-colors disabled:opacity-30 ember-glow">
                                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        Generate My Masterplan
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

                <div className="w-full max-w-2xl mt-4">
                    <AIDisclaimer />
                </div>
            </div>
        </div>
    )
}

