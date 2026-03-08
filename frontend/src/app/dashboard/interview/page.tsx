/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, PhoneOff, Send, ArrowLeft, AlertCircle, Loader2, Volume2, Trophy, TrendingUp, TrendingDown, RotateCcw, BookOpen, GraduationCap } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/useAppStore"
import axios from "axios"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

interface EvaluationResult {
    overall_score: number
    categories: Record<string, number>
    strengths: string[]
    improvements: string[]
    feedback: string
}

export default function InterviewDashboard() {
    const router = useRouter()
    const targetRole = useAppStore((s) => s.targetRole)

    const [sessionId, setSessionId] = useState<string | null>(null)
    const [isStarting, setIsStarting] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isEvaluating, setIsEvaluating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [transcript, setTranscript] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
    const [textInput, setTextInput] = useState("")
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
    const [coachData, setCoachData] = useState<any>(null)
    const [isCoaching, setIsCoaching] = useState(false)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [transcript])

    // ──── Start Interview Session ────
    const startInterview = async () => {
        try {
            setError(null); setIsStarting(true); setEvaluation(null)
            const resp = await axios.post(`${API_BASE}/interview/start`, { target_role: targetRole || "Software Engineer" })
            setSessionId(resp.data.session_id)
            setTranscript([{ role: 'ai', text: resp.data.greeting }])
            await speakWithOpenAI(resp.data.greeting, resp.data.session_id)
        } catch (err: any) {
            setError(`Failed to start: ${err?.response?.data?.detail || err?.message || "Server error"}`)
        } finally { setIsStarting(false) }
    }

    // ──── OpenAI TTS ────
    const speakWithOpenAI = async (text: string, sid?: string) => {
        try {
            setIsSpeaking(true)
            const response = await axios.post(`${API_BASE}/interview/tts`, { session_id: sid || sessionId || "", user_message: text }, { responseType: 'blob' })
            const audioBlob = new Blob([response.data], { type: 'audio/mpeg' })
            const audioUrl = URL.createObjectURL(audioBlob)
            return new Promise<void>((resolve) => {
                const audio = new Audio(audioUrl)
                audioRef.current = audio
                audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); resolve() }
                audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); resolve() }
                audio.play().catch(() => { setIsSpeaking(false); resolve() })
            })
        } catch {
            setIsSpeaking(false)
            if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); window.speechSynthesis.speak(u) }
        }
    }

    // ──── Record Audio ────
    const startRecording = async () => {
        try {
            setError(null)
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setIsSpeaking(false) }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
            audioChunksRef.current = []
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
            mediaRecorder.onstop = async () => { stream.getTracks().forEach(t => t.stop()); await transcribeWithWhisper(new Blob(audioChunksRef.current, { type: 'audio/webm' })) }
            mediaRecorderRef.current = mediaRecorder
            mediaRecorder.start()
            setIsRecording(true)
        } catch (err: any) { setError(`Microphone error: ${err?.message || "Access denied."}`) }
    }

    const stopRecording = () => { if (mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.stop(); setIsRecording(false) } }

    // ──── Whisper STT ────
    const transcribeWithWhisper = async (audioBlob: Blob) => {
        setIsTranscribing(true)
        try {
            const formData = new FormData()
            formData.append('file', audioBlob, 'recording.webm')
            const resp = await axios.post(`${API_BASE}/interview/whisper`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            if (resp.data.text?.trim()) await sendMessage(resp.data.text.trim())
            else setError("Couldn't understand the audio. Try again or type below.")
        } catch (err: any) { setError(`Transcription failed: ${err?.response?.data?.detail || err?.message}`) }
        finally { setIsTranscribing(false) }
    }

    // ──── Send Message ────
    const sendMessage = useCallback(async (message: string) => {
        if (!sessionId || !message.trim() || isProcessing) return
        setTranscript(prev => [...prev, { role: 'user', text: message }])
        setIsProcessing(true); setTextInput("")
        try {
            const resp = await axios.post(`${API_BASE}/interview/chat`, { session_id: sessionId, user_message: message })
            setTranscript(prev => [...prev, { role: 'ai', text: resp.data.ai_response }])
            await speakWithOpenAI(resp.data.ai_response)
        } catch (err: any) { setError(`AI response failed: ${err?.response?.data?.detail || err?.message}`) }
        finally { setIsProcessing(false) }
    }, [sessionId, isProcessing])

    // ──── End & Evaluate ────
    const endInterview = async () => {
        if (audioRef.current) audioRef.current.pause()
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
        window.speechSynthesis?.cancel()
        if (!sessionId) return
        setIsEvaluating(true)
        try {
            const resp = await axios.post(`${API_BASE}/interview/evaluate`, { session_id: sessionId, user_message: "" })
            setEvaluation(resp.data)
        } catch { setError("Failed to evaluate interview.") }
        finally { setIsEvaluating(false) }
        try { await axios.post(`${API_BASE}/interview/end`, { session_id: sessionId, user_message: "" }) } catch { }
        setSessionId(null); setIsRecording(false); setIsProcessing(false)
    }

    const resetAll = () => { setEvaluation(null); setTranscript([]); setError(null); setCoachData(null) }
    const handleTextSubmit = (e: React.FormEvent) => { e.preventDefault(); if (textInput.trim()) sendMessage(textInput.trim()) }
    const isDisabled = isRecording || isTranscribing || isProcessing

    const radarData = evaluation ? Object.entries(evaluation.categories).map(([key, value]) => ({
        category: key.replace("Technical ", "Tech\n"), score: value, fullMark: 100
    })) : []

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-green-400"
        if (score >= 60) return "text-ember"
        return "text-red-400"
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 sm:p-12 relative">
            <div className="w-full max-w-4xl z-10 flex flex-col items-center">

                {/* Back */}
                <div className="w-full max-w-2xl mb-6">
                    <button onClick={() => router.push("/dashboard/roadmap")}
                        className="group flex items-center gap-2 text-cream/30 hover:text-ember transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Roadmap
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-ember/5 border border-ember/10 rounded-xl flex items-center gap-3 text-cream/80 w-full max-w-2xl">
                        <AlertCircle className="w-5 h-5 text-ember shrink-0" />
                        <span className="text-sm">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-ember hover:text-ember-300 text-xs">✕</button>
                    </div>
                )}

                {/* ═══ EVALUATION SCREEN ═══ */}
                {evaluation && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-3xl">
                        <div className="text-center mb-8">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                                <Trophy className="w-12 h-12 mx-auto mb-4 text-ember" />
                            </motion.div>
                            <h2 className="text-3xl font-bold text-cream mb-2">Interview Complete</h2>
                            <p className="text-cream/30 text-sm">Here&apos;s your performance breakdown</p>
                        </div>

                        {/* Overall Score */}
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="text-center mb-8 p-8 glass rounded-2xl">
                            <p className="text-[10px] text-cream/25 uppercase tracking-widest mb-2 font-bold">Overall Score</p>
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                className={`text-7xl font-black ${getScoreColor(evaluation.overall_score)}`}>
                                {evaluation.overall_score}
                            </motion.p>
                            <p className="text-cream/15 text-sm mt-1">/ 100</p>
                        </motion.div>

                        {/* Radar + Categories */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
                                className="glass rounded-2xl p-6">
                                <h3 className="text-[10px] font-bold text-cream/25 uppercase tracking-widest mb-4">Skill Radar</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                                        <PolarGrid stroke="rgba(229,230,218,0.05)" />
                                        <PolarAngleAxis dataKey="category" tick={{ fill: 'rgba(229,230,218,0.3)', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar name="Score" dataKey="score" stroke="#DF6C42" fill="#DF6C42" fillOpacity={0.15} strokeWidth={2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}
                                className="glass rounded-2xl p-6">
                                <h3 className="text-[10px] font-bold text-cream/25 uppercase tracking-widest mb-4">Category Scores</h3>
                                <div className="space-y-4">
                                    {Object.entries(evaluation.categories).map(([cat, score], i) => (
                                        <div key={cat}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-cream/40">{cat}</span>
                                                <span className={`font-bold ${getScoreColor(score)}`}>{score}</span>
                                            </div>
                                            <div className="h-2 bg-olive-200 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
                                                    transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                                                    className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-ember' : 'bg-red-500'}`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Strengths & Improvements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                                className="glass rounded-2xl p-6">
                                <h3 className="text-sm font-medium text-green-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Strengths
                                </h3>
                                <ul className="space-y-2">
                                    {evaluation.strengths.map((s, i) => (
                                        <li key={i} className="text-sm text-cream/60 flex items-start gap-2">
                                            <span className="text-green-500 mt-1">•</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                                className="glass rounded-2xl p-6">
                                <h3 className="text-sm font-medium text-ember uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4" /> Areas to Improve
                                </h3>
                                <ul className="space-y-2">
                                    {evaluation.improvements.map((s, i) => (
                                        <li key={i} className="text-sm text-cream/60 flex items-start gap-2">
                                            <span className="text-ember mt-1">•</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        </div>

                        {/* Feedback */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
                            className="glass rounded-2xl p-6 mb-8">
                            <p className="text-sm text-cream/50 leading-relaxed italic">&quot;{evaluation.feedback}&quot;</p>
                        </motion.div>

                        {/* Interview Coach Agent */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }} className="mb-8">
                            {!coachData && (
                                <button
                                    onClick={async () => {
                                        setIsCoaching(true)
                                        try {
                                            const resp = await axios.post(`${API_BASE}/agents/interview-coach`, {
                                                target_role: targetRole || "Software Engineer",
                                                transcript: transcript.map(t => ({ role: t.role, content: t.text })),
                                                evaluation: evaluation, time_hours: 20
                                            })
                                            setCoachData(resp.data)
                                        } catch (err) { console.error(err) }
                                        finally { setIsCoaching(false) }
                                    }}
                                    disabled={isCoaching}
                                    className="w-full p-4 glass glass-hover rounded-2xl flex items-center justify-center gap-3 text-sm font-bold text-cream"
                                >
                                    {isCoaching ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating practice plan...</> : <><GraduationCap className="w-5 h-5 text-ember" /> Get Personalized Practice Plan (AI Agent)</>}
                                </button>
                            )}

                            {coachData && coachData.status === 'success' && (
                                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-[10px] font-bold text-cream/25 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <GraduationCap className="w-4 h-4 text-ember" /> Practice Questions
                                        </h3>
                                        <div className="space-y-4">
                                            {(coachData.practice_questions || []).map((q: any, i: number) => (
                                                <div key={i} className="p-4 bg-olive-200 rounded-xl">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <p className="text-sm text-cream/80 font-medium leading-relaxed">{i + 1}. {q.question}</p>
                                                        <span className={`ml-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' : q.difficulty === 'medium' ? 'bg-ember/20 text-ember' : 'bg-green-500/20 text-green-400'}`}>
                                                            {q.difficulty}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-cream/25 italic">Hint: {q.hint}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="glass rounded-2xl p-6">
                                        <h3 className="text-[10px] font-bold text-cream/25 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-ember" /> Study Plan
                                        </h3>
                                        <div className="space-y-3">
                                            {(coachData.study_plan || []).map((item: any, i: number) => (
                                                <div key={i} className="flex items-center gap-4 p-3 bg-olive-200 rounded-lg">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.priority === 'high' ? 'bg-red-500/20 text-red-400' : item.priority === 'medium' ? 'bg-ember/20 text-ember' : 'bg-green-500/20 text-green-400'}`}>
                                                        {item.priority}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-cream/80 font-medium">{item.topic}</p>
                                                        <p className="text-xs text-cream/25">{item.hours} hours</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {coachData.daily_routine && (
                                            <p className="text-xs text-cream/30 mt-4 pt-4 border-t border-cream/5 italic">{coachData.daily_routine}</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Actions */}
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={resetAll}
                                className="px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 bg-ember text-cream hover:bg-ember-500 transition-all">
                                <RotateCcw className="w-4 h-4" /> Try Again
                            </button>
                            <button onClick={() => router.push("/dashboard/roadmap")}
                                className="px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 glass glass-hover text-cream/60">
                                View Roadmap
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* ═══ EVALUATING ═══ */}
                {isEvaluating && !evaluation && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6">
                        <Loader2 className="w-16 h-16 text-ember animate-spin" />
                        <h2 className="text-2xl font-bold text-cream">Evaluating your interview...</h2>
                        <p className="text-cream/30 text-sm">AI is analyzing your responses across 4 categories</p>
                    </motion.div>
                )}

                {/* ═══ NOT STARTED ═══ */}
                {!sessionId && !evaluation && !isEvaluating && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8">
                        <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-olive-200 border-4 border-cream/5 flex items-center justify-center">
                            <Mic className="w-16 h-16 text-cream/15" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-cream mb-2">AI Mock Interview</h2>
                            <p className="text-cream/30 text-sm max-w-md">
                                Practice with Aura AI. Click the mic to speak (OpenAI Whisper), or type. AI responds with TTS. Get scored at the end.
                            </p>
                        </div>
                        <button onClick={startInterview} disabled={isStarting}
                            className="px-8 py-4 rounded-full font-bold flex items-center gap-2 bg-ember text-cream hover:bg-ember-500 transition-all ember-glow disabled:opacity-50">
                            {isStarting ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</> : <><Mic className="w-5 h-5" /> Begin Technical Round</>}
                        </button>
                    </motion.div>
                )}

                {/* ═══ ACTIVE INTERVIEW ═══ */}
                {sessionId && !isEvaluating && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col items-center gap-6">
                        {/* Voice Circle */}
                        <div
                            className={`relative w-36 h-36 md:w-48 md:h-48 rounded-full flex items-center justify-center border-4 
                                transition-all duration-500 shadow-2xl cursor-pointer select-none
                                ${isRecording ? 'bg-olive-200 border-ember scale-105 ember-glow' :
                                    isSpeaking ? 'bg-olive-200 border-cream/20' :
                                        isTranscribing || isProcessing ? 'bg-olive-200 border-cream/10' :
                                            'bg-olive-300 border-cream/5 hover:border-cream/10'}`}
                            onClick={() => { if (isDisabled && !isRecording) return; if (isRecording) { stopRecording() } else { startRecording() } }}
                        >
                            {isRecording ? (
                                <div className="flex gap-1.5 items-center justify-center">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <motion.div key={i}
                                            animate={{ height: ["12px", "40px", "16px"] }}
                                            transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.4, ease: "easeInOut", repeatType: "reverse" }}
                                            className="w-1.5 bg-ember rounded-full" />
                                    ))}
                                </div>
                            ) : isTranscribing ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-8 h-8 text-cream/30 animate-spin" />
                                    <span className="text-[10px] text-cream/20 uppercase tracking-widest">Whisper</span>
                                </div>
                            ) : isProcessing ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-8 h-8 text-cream/30 animate-spin" />
                                    <span className="text-[10px] text-cream/20 uppercase tracking-widest">Thinking</span>
                                </div>
                            ) : isSpeaking ? (
                                <Volume2 className="w-10 h-10 text-ember animate-pulse" />
                            ) : (
                                <Mic className="w-10 h-10 text-cream/20" />
                            )}
                        </div>

                        <p className="text-xs text-cream/25 uppercase tracking-widest">
                            {isRecording ? "Recording... click to stop" : isTranscribing ? "Transcribing with Whisper..." :
                                isProcessing ? "Aura is thinking..." : isSpeaking ? "Aura is speaking..." : "Click circle to speak or type below"}
                        </p>

                        {/* Chat Transcript */}
                        {transcript.length > 0 && (
                            <div className="w-full max-w-2xl glass p-6 rounded-2xl max-h-72 overflow-y-auto">
                                <AnimatePresence>
                                    {transcript.map((msg, i) => (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i}
                                            className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            <span className="text-[10px] uppercase tracking-widest text-cream/20 block mb-1">
                                                {msg.role === 'ai' ? 'Aura AI' : 'You'}
                                            </span>
                                            <p className={`text-sm md:text-base inline-block px-4 py-2 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-ember text-cream rounded-br-sm' : 'bg-olive-200 text-cream/80 rounded-bl-sm'}`}>
                                                {msg.text}
                                            </p>
                                        </motion.div>
                                    ))}
                                    <div ref={bottomRef} />
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Text Input */}
                        <form onSubmit={handleTextSubmit} className="w-full max-w-2xl flex gap-3">
                            <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
                                placeholder={isRecording ? "Recording..." : "Type your answer here..."} disabled={isDisabled}
                                className="flex-1 px-4 py-3 bg-olive-200 border border-cream/5 rounded-xl text-cream placeholder:text-cream/15 focus:outline-none focus:border-ember/30 disabled:opacity-50 transition-colors" />
                            <button type="submit" disabled={!textInput.trim() || isDisabled}
                                className="px-4 py-3 bg-ember text-cream rounded-xl font-semibold hover:bg-ember-500 transition-colors disabled:opacity-30 flex items-center gap-2">
                                <Send className="w-4 h-4" />
                            </button>
                        </form>

                        {/* Controls */}
                        <div className="flex items-center gap-4">
                            <button onClick={isRecording ? stopRecording : startRecording} disabled={isDisabled && !isRecording}
                                className={`px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all
                                    ${isRecording ? 'bg-ember text-cream hover:bg-ember-500' : 'glass glass-hover text-cream/50'} disabled:opacity-30`}>
                                {isRecording ? <><MicOff className="w-4 h-4" /> Stop</> : <><Mic className="w-4 h-4" /> Voice</>}
                            </button>
                            <button onClick={endInterview}
                                className="px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all">
                                <PhoneOff className="w-4 h-4" /> End & Score
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
