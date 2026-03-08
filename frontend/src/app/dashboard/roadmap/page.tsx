/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/useAppStore"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, BookOpen, Clock, Star, ArrowLeft, ArrowRight, Mic, Target, Zap, ExternalLink, CheckCircle2, Circle, X, GraduationCap, Sparkles, Download } from "lucide-react"
import Link from "next/link"
import AIDisclaimer from "@/components/AIDisclaimer"
import api from "@/lib/api"
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer
} from "recharts"

interface Course {
    title: string;
    platform: string;
    duration: string;
    level: string;
    rating: number;
    skills_covered: string[];
    reasoning: string;
    url?: string;
    platform_url?: string;
    instructor?: string;
    description?: string;
}

type NodeStatus = 'completed' | 'current' | 'pending'

interface RoadmapNode {
    id: string;
    label: string;
    type: 'skill' | 'gap' | 'course' | 'target';
    status: NodeStatus;
    course?: Course;
    children: string[];
}

const PLATFORM_BADGE: Record<string, string> = {
    Coursera: "bg-blue-500/20 text-blue-400",
    Udemy: "bg-purple-500/20 text-purple-400",
    edX: "bg-red-500/20 text-red-400",
    Skillshare: "bg-green-500/20 text-green-400",
}

export default function RoadmapDashboard() {
    const { targetRole, targetJobDescription, currentSkills, roadmap, setRoadmap, isRoadmapLoading, setRoadmapLoading, sessionId, timeInvestment } = useAppStore()
    const router = useRouter()

    const handleExportPDF = () => {
        window.print()
    }
    const [error, setError] = useState<string | null>(null)
    const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null)
    const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
    const [certFilter, setCertFilter] = useState<'all' | 'free' | 'paid'>('all')

    useEffect(() => {
        if (!targetRole) { router.push("/dashboard/chat"); return }

        setRoadmapLoading(true)
        setError(null)
        api.post('/roadmap/generate', {
            session_id: sessionId,
            target_role: targetRole,
            target_job_description: targetJobDescription,
            current_skills: currentSkills,
            time_investment: timeInvestment
        })
            .then(res => { setRoadmap(res.data); setRoadmapLoading(false) })
            .catch(() => { setError("Failed to generate roadmap."); setRoadmapLoading(false) })
    }, [targetRole, targetJobDescription, timeInvestment])

    const toggleComplete = useCallback((nodeId: string) => {
        setCompletedNodes(prev => {
            const next = new Set(prev)
            if (next.has(nodeId)) next.delete(nodeId)
            else next.add(nodeId)
            return next
        })
    }, [])

    if (isRoadmapLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <Loader2 className="w-12 h-12 text-ember" />
            </motion.div>
            <p className="text-cream/40 text-sm">Analyzing skill gaps & finding comprehensive multi-skill courses...</p>
        </div>
    )

    if (error) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="glass p-8 rounded-2xl text-center max-w-md">
                <AlertCircle className="w-8 h-8 text-ember mx-auto mb-4" />
                <p className="text-cream/80 mb-4">{error}</p>
                <button onClick={() => router.push("/dashboard/chat")} className="px-6 py-3 bg-ember text-cream rounded-xl font-bold text-sm">Go Back</button>
            </div>
        </div>
    )

    if (!roadmap) return null

    const courses: Course[] = roadmap.courses || []
    const gaps: string[] = roadmap.missing_skills || []
    const projects = roadmap.projects || []
    const certifications = roadmap.certifications || []

    const filteredCerts = certifications.filter((cert: any) => {
        if (certFilter === 'all') return true;
        return cert.cost_type?.toLowerCase() === certFilter;
    });

    const analytics: any = roadmap.analytics || {}
    const skillRadar: any[] = analytics.skill_radar || []

    // ─── Build SVG Roadmap Tree (Vertical Alternating) ───
    const NODE_W = 280
    const NODE_H = 60
    const PADDING_Y = 120
    const PADDING_TOP = 40

    const courseCount = courses.length
    const svgWidth = 800
    const targetX = svgWidth / 2
    const targetY = PADDING_TOP + 30

    // Compute positions
    const coursePositions: { x: number; y: number; side: 'left' | 'right' }[] = []

    // We want the total height to accommodate all courses + spacing
    const svgHeight = PADDING_TOP + 100 + courseCount * PADDING_Y + 100

    // Build node data structure
    const nodes: RoadmapNode[] = []
    const targetNode: RoadmapNode = {
        id: 'target', label: roadmap.role || targetRole || '', type: 'target', status: 'pending', children: []
    }
    nodes.push(targetNode)

    for (let i = 0; i < courseCount; i++) {
        const side = i % 2 === 0 ? 'left' : 'right'
        // Distance from center line to the *outer edge* of the node box
        const xOffset = 200
        const x = side === 'left' ? targetX - xOffset : targetX + xOffset
        const y = targetY + 140 + i * PADDING_Y
        coursePositions.push({ x, y, side })

        nodes.push({
            id: `course-${i}`,
            label: courses[i].title,
            type: 'course',
            status: completedNodes.has(`course-${i}`) ? 'completed' : (i === 0 && !completedNodes.has(`course-0`) ? 'current' : 'pending'),
            course: courses[i],
            children: []
        })
    }

    // Color helpers
    const getNodeFill = (status: NodeStatus, type: string) => {
        if (type === 'target') return '#DF6C42'
        if (status === 'completed') return '#4ade80'
        if (status === 'current') return '#DF6C42'
        return 'rgba(229,230,218,0.06)'
    }
    const getNodeStroke = (status: NodeStatus, type: string) => {
        if (type === 'target') return '#DF6C42'
        if (status === 'completed') return '#4ade80'
        if (status === 'current') return '#DF6C42'
        return 'rgba(229,230,218,0.12)'
    }
    const getTextFill = (status: NodeStatus, type: string) => {
        if (type === 'target') return '#E5E6DA'
        if (status === 'completed') return '#166534'
        if (status === 'current') return '#E5E6DA'
        return 'rgba(229,230,218,0.6)'
    }

    return (
        <div className="min-h-screen p-6 sm:p-12 max-w-7xl mx-auto">
            <button onClick={() => router.push("/dashboard/chat")}
                className="group flex items-center gap-2 text-cream/30 hover:text-ember transition-colors mb-8 text-sm">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Setup
            </button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
                    <span className="text-cream">Roadmap to </span>
                    <span className="text-ember">{roadmap.role || targetRole}</span>
                </h1>
                <p className="text-cream/30 text-sm">
                    {gaps.length} skill gaps identified · {courses.length} courses recommended · {analytics.estimated_weeks || '?'} weeks estimated
                </p>
                {gaps.length > 0 && (
                    <div className="mt-6">
                        <p className="text-[10px] uppercase tracking-widest text-cream/30 font-bold mb-3 flex items-center gap-2">
                            <Target className="w-3 h-3 text-ember" /> Missing Skills to Acquire
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {gaps.map((skill, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-black/40 border border-cream/10 text-cream/70 text-xs rounded-full font-bold">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* ═══ PERSONA INSIGHTS ═══ */}
            {(analytics.transferable_skills?.length > 0 || analytics.mentorship_guide) && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 grid grid-cols-1 gap-6">
                    {analytics.transferable_skills?.length > 0 && (
                        <div className="glass rounded-3xl p-6 border-l-4 border-l-ember">
                            <h3 className="text-lg font-bold text-cream mb-2 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-ember" /> Transferable Skills Leveraged
                            </h3>
                            <p className="text-sm text-cream/60 mb-4">
                                Based on your background, you already possess these competencies. We&apos;ve accelerated your roadmap by skipping foundational courses in these areas.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {analytics.transferable_skills.map((skill: string, idx: number) => (
                                    <span key={idx} className="px-3 py-1.5 bg-ember/10 border border-ember/20 text-ember/90 text-xs rounded-full font-bold shadow-[0_0_10px_rgba(223,108,66,0.1)]">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {analytics.mentorship_guide && (
                        <div className="glass rounded-3xl p-6 border-l-4 border-l-[#4ade80]">
                            <h3 className="text-lg font-bold text-cream mb-2 flex items-center gap-2">
                                <Target className="w-5 h-5 text-[#4ade80]" /> Mentorship Action Plan
                            </h3>
                            <p className="text-sm text-cream/60 mb-4">
                                Data-backed topics to cover in your next session based on the mentee&apos;s skill gaps.
                            </p>
                            <div className="space-y-4">
                                {analytics.mentorship_guide.split('\n').filter((line: string) => line.trim().length > 0 && line.trim() !== '```markdown' && line.trim() !== '```').map((line: string, idx: number) => (
                                    <div key={idx} className="flex gap-3 text-sm text-cream/80 bg-black/20 p-4 rounded-xl border border-cream/5">
                                        <span className="text-[#4ade80] font-bold">›</span>
                                        <span dangerouslySetInnerHTML={{ __html: line.replace(/^\s*-\s*|^\s*\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-cream">$1</strong>') }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ INTERACTIVE SVG ROADMAP ═══ */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="glass rounded-3xl p-6 mb-12 overflow-x-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-cream/40 flex items-center gap-2">
                        <Target className="w-4 h-4 text-ember" /> Interactive Learning Path
                    </h2>
                    <div className="flex items-center gap-4 text-[10px] text-cream/25">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#4ade80]/20 border border-[#4ade80]/50 inline-block" /> Completed</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-ember/20 border border-ember/50 inline-block" /> Current</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cream/5 border border-cream/10 inline-block" /> Pending</span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="min-w-[600px] max-w-[800px]">
                        <defs>
                            <filter id="glow-ember" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feFlood floodColor="#DF6C42" floodOpacity="0.3" />
                                <feComposite in2="blur" operator="in" />
                                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                            <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feFlood floodColor="#4ade80" floodOpacity="0.3" />
                                <feComposite in2="blur" operator="in" />
                                <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                        </defs>

                        {/* ─── Center Spine Line ─── */}
                        {courses.length > 0 && (
                            <line
                                x1={targetX} y1={targetY + NODE_H / 2}
                                x2={targetX} y2={coursePositions[coursePositions.length - 1]?.y || targetY + PADDING_Y}
                                stroke="rgba(229,230,218,0.08)" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 6"
                            />
                        )}

                        {/* ─── Connection Lines (Spine to Course) ─── */}
                        {coursePositions.map((pos, i) => {
                            const courseStatus = completedNodes.has(`course-${i}`) ? 'completed' : (i === 0 ? 'current' : 'pending')
                            const lineColor = courseStatus === 'completed' ? '#4ade80' : (courseStatus === 'current' ? '#DF6C42' : 'rgba(229,230,218,0.08)')
                            const isLeft = pos.side === 'left'

                            // Draw line from center spine to the edge of the course node
                            const startX = targetX
                            const endX = isLeft ? pos.x + NODE_W / 2 : pos.x - NODE_W / 2

                            return (
                                <g key={`branch-${i}`}>
                                    <path
                                        d={`M ${startX} ${pos.y} L ${endX} ${pos.y}`}
                                        fill="none" stroke={lineColor} strokeWidth="3"
                                        strokeDasharray={courseStatus === 'pending' ? '6 4' : '0'}
                                        opacity={courseStatus === 'pending' ? 0.3 : 0.8}
                                    />
                                    {/* Small circle at the spine junction */}
                                    <circle cx={startX} cy={pos.y} r="5" fill={lineColor} opacity={courseStatus === 'pending' ? 0.3 : 0.8} />
                                </g>
                            )
                        })}

                        {/* ─── Target Node ─── */}
                        <g className="cursor-pointer" onClick={() => setSelectedNode(targetNode)}>
                            <rect x={targetX - 120} y={targetY - NODE_H / 2} width={240} height={NODE_H}
                                rx="16" fill="#1D1E15" stroke="#DF6C42" strokeWidth="2" filter="url(#glow-ember)" />
                            {/* Inner gradient/fill */}
                            <rect x={targetX - 118} y={targetY - (NODE_H / 2) + 2} width={236} height={NODE_H - 4}
                                rx="14" fill="#DF6C42" opacity="0.15" />
                            <text x={targetX} y={targetY + 5} textAnchor="middle" fill="#E5E6DA" fontSize="14" fontWeight="800" letterSpacing="0.5">
                                🎯 {targetRole?.toUpperCase()}
                            </text>
                        </g>

                        {/* ─── Course Nodes ─── */}
                        {coursePositions.map((pos, i) => {
                            const course = courses[i]
                            const nodeId = `course-${i}`
                            const status = completedNodes.has(nodeId) ? 'completed' : (i === 0 && !completedNodes.has('course-0') ? 'current' : 'pending')
                            const fill = getNodeFill(status, 'course')
                            const stroke = getNodeStroke(status, 'course')
                            const textFill = getTextFill(status, 'course')
                            const glowFilter = status === 'completed' ? 'url(#glow-green)' : (status === 'current' ? 'url(#glow-ember)' : '')
                            const label = course.title.length > 32 ? course.title.slice(0, 32) + '…' : course.title



                            return (
                                <g key={nodeId} className="cursor-pointer" onClick={() => setSelectedNode(nodes.find(n => n.id === nodeId) || null)}>
                                    <rect x={pos.x - NODE_W / 2} y={pos.y - NODE_H / 2} width={NODE_W} height={NODE_H}
                                        rx="14" fill={fill} stroke={stroke} strokeWidth="2" filter={glowFilter} />

                                    {/* Phase number */}
                                    <text x={pos.x - NODE_W / 2 + 16} y={pos.y + 2} textAnchor="start" fill={status === 'completed' ? '#166534' : 'rgba(229,230,218,0.2)'} fontSize="11" fontWeight="800">
                                        {String(i + 1).padStart(2, '0')}
                                    </text>

                                    {/* Title with automatic text wrapping via foreignObject */}
                                    <foreignObject
                                        x={pos.x - NODE_W / 2 + 10}
                                        y={pos.y - 18}
                                        width={NODE_W - 20}
                                        height={40}
                                        className="pointer-events-none"
                                    >
                                        <div
                                            className="w-full h-full flex items-center justify-center text-center font-bold text-xs select-none line-clamp-2 break-words leading-tight"
                                            style={{ color: textFill }}
                                        >
                                            {course.title}
                                        </div>
                                    </foreignObject>

                                    {/* Status icon / pulse */}
                                    {status === 'completed' && (
                                        <text x={pos.x + NODE_W / 2 - 20} y={pos.y + 5} textAnchor="middle" fill="#166534" fontSize="16" fontWeight="bold">✓</text>
                                    )}
                                    {status === 'current' && (
                                        <circle cx={pos.x + NODE_W / 2 - 20} cy={pos.y} r="5" fill="#DF6C42" opacity="0.8">
                                            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
                                        </circle>
                                    )}

                                    {/* Platform label (above node) */}
                                    <text x={pos.x} y={pos.y - NODE_H / 2 - 8} textAnchor="middle" fill="rgba(229,230,218,0.3)" fontSize="9" fontWeight="800" letterSpacing="1">
                                        {course.platform?.toUpperCase()}
                                    </text>

                                    {/* ─── Skill Badges (Below node, horizontal array) ─── */}
                                    {(course.skills_covered || []).slice(0, 3).map((skill, skillIdx) => {
                                        // Max 3 skills displayed on the graph to prevent clutter, rest in detail pane
                                        const totalSkillsToDisplay = Math.min((course.skills_covered || []).length, 3)
                                        const pillWidth = 90
                                        const pillSpacing = 8
                                        const totalWidth = totalSkillsToDisplay * pillWidth + (totalSkillsToDisplay - 1) * pillSpacing
                                        // Center align the pills under the node
                                        const startX = pos.x - totalWidth / 2
                                        const pillX = startX + skillIdx * (pillWidth + pillSpacing)
                                        const pillY = pos.y + NODE_H / 2 + 15

                                        const pillStatus = status === 'completed' ? 'completed' : 'pending'

                                        return (
                                            <g key={`skill-${i}-${skillIdx}`}>
                                                <rect x={pillX} y={pillY} width={pillWidth} height={20}
                                                    rx="10"
                                                    fill={pillStatus === 'completed' ? 'rgba(74,222,128,0.08)' : 'rgba(229,230,218,0.03)'}
                                                    stroke={pillStatus === 'completed' ? 'rgba(74,222,128,0.2)' : 'rgba(229,230,218,0.06)'}
                                                    strokeWidth="1"
                                                />
                                                <text x={pillX + pillWidth / 2} y={pillY + 14} textAnchor="middle"
                                                    fill={pillStatus === 'completed' ? 'rgba(74,222,128,0.6)' : 'rgba(229,230,218,0.3)'}
                                                    fontSize="9" fontWeight="600" textDecoration={pillStatus === 'completed' ? 'line-through' : 'none'}>
                                                    {skill.length > 14 ? skill.slice(0, 14) + '…' : skill}
                                                </text>
                                                {/* Connecting mini-line from course box to skill pill */}
                                                <line
                                                    x1={pillX + pillWidth / 2} y1={pos.y + NODE_H / 2}
                                                    x2={pillX + pillWidth / 2} y2={pillY}
                                                    stroke={pillStatus === 'completed' ? 'rgba(74,222,128,0.3)' : 'rgba(229,230,218,0.1)'}
                                                    strokeWidth="1" strokeDasharray="2 2"
                                                />
                                            </g>
                                        )
                                    })}
                                    {/* +N indicator if there are more skills */}
                                    {(course.skills_covered || []).length > 3 && (
                                        <text x={pos.x + NODE_W / 2 + 12} y={pos.y + NODE_H / 2 + 28} fill="rgba(229,230,218,0.2)" fontSize="10" fontStyle="italic">
                                            +{(course.skills_covered.length - 3)} more
                                        </text>
                                    )}
                                </g>
                            )
                        })}
                    </svg>
                </div>
            </motion.div>

            {/* ═══ DETAIL PANEL (side sheet) ═══ */}
            <AnimatePresence>
                {selectedNode && selectedNode.type === 'course' && selectedNode.course && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-end p-4"
                    >
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedNode(null)} />
                        <motion.div
                            initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-olive-300 border border-cream/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 pb-4 border-b border-cream/5">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-3 ${PLATFORM_BADGE[selectedNode.course.platform] || 'bg-cream/5 text-cream/40'}`}>
                                            {selectedNode.course.platform}
                                        </span>
                                        <h3 className="text-xl font-bold text-cream leading-tight">{selectedNode.course.title}</h3>
                                        {selectedNode.course.instructor && (
                                            <p className="text-sm text-cream/40 mt-1">by {selectedNode.course.instructor}</p>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedNode(null)} className="text-cream/20 hover:text-cream/50 p-1 ml-3 bg-cream/5 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-6 text-sm text-cream/50">
                                    <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-ember fill-ember" /> <strong className="text-cream">{selectedNode.course.rating}</strong></span>
                                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> <strong className="text-cream">{selectedNode.course.duration}</strong></span>
                                    <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4" /> <strong className="text-cream">{selectedNode.course.level}</strong></span>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-cream/20 font-bold mb-2">Why This Course</p>
                                    <p className="text-sm text-cream/70 leading-relaxed bg-black/20 p-4 rounded-xl border border-cream/5">{selectedNode.course.reasoning}</p>
                                </div>

                                {/* Multi-skill coverage display */}
                                {selectedNode.course.skills_covered?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-cream/20 font-bold mb-3 flex items-center gap-2">
                                            <Target className="w-3 h-3 text-ember" /> Skills Covered ({selectedNode.course.skills_covered.length})
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedNode.course.skills_covered.map((s, i) => (
                                                <span key={i} className="px-3 py-1.5 bg-ember/10 border border-ember/20 text-ember/90 text-xs rounded-full font-bold shadow-[0_0_10px_rgba(223,108,66,0.1)]">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-4 border-t border-cream/5">
                                    <button
                                        onClick={() => toggleComplete(selectedNode.id)}
                                        className={`flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${completedNodes.has(selectedNode.id)
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-olive-200 text-cream/40 border border-cream/5 hover:bg-cream/5 hover:text-cream/70'}`}
                                    >
                                        {completedNodes.has(selectedNode.id)
                                            ? <><CheckCircle2 className="w-5 h-5" /> Completed</>
                                            : <><Circle className="w-5 h-5" /> Mark Complete</>}
                                    </button>
                                    <a href={selectedNode.course.url || '#'} target="_blank" rel="noopener noreferrer"
                                        className="flex-1 h-12 bg-ember hover:bg-ember-500 text-cream rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ember-glow">
                                        <ExternalLink className="w-4 h-4" /> Open Course
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ ANALYTICS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
                    <p className="text-[10px] uppercase tracking-widest text-cream/25 mb-4 font-bold">Skill Match</p>
                    <div className="flex items-center justify-center">
                        <div className="relative w-32 h-32">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(229,230,218,0.05)" strokeWidth="6" />
                                <motion.circle cx="50" cy="50" r="42" fill="none" stroke="#DF6C42" strokeWidth="6" strokeLinecap="round"
                                    strokeDasharray={`${(analytics.match_pct || 0) * 2.64} 264`}
                                    initial={{ strokeDasharray: "0 264" }} animate={{ strokeDasharray: `${(analytics.match_pct || 0) * 2.64} 264` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }} />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-bold text-cream">{analytics.match_pct || 0}%</span>
                                <span className="text-[10px] text-cream/25">match</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 flex flex-col justify-center gap-6">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-cream/25 mb-1 font-bold">Estimated Time</p>
                        <p className="text-3xl font-bold text-cream">{analytics.estimated_weeks || '?'}<span className="text-base text-cream/30 ml-1">weeks</span></p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-cream/25 mb-1 font-bold">Skill Gaps</p>
                        <p className="text-3xl font-bold text-ember">{analytics.gap_count || gaps.length}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-cream/25 mb-1 font-bold">Progress</p>
                        <p className="text-3xl font-bold text-green-400">{completedNodes.size}<span className="text-base text-cream/30 ml-1">/ {courses.length}</span></p>
                    </div>
                </motion.div>

                {skillRadar.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6">
                        <p className="text-[10px] uppercase tracking-widest text-cream/25 mb-4 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Skill Radar
                        </p>
                        <ResponsiveContainer width="100%" height={200}>
                            <RadarChart data={skillRadar} cx="50%" cy="50%" outerRadius="70%">
                                <PolarGrid stroke="rgba(229,230,218,0.05)" />
                                <PolarAngleAxis dataKey="skill" tick={{ fill: 'rgba(229,230,218,0.3)', fontSize: 9 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name="Required" dataKey="required" stroke="#DF6C42" fill="#DF6C42" fillOpacity={0.1} strokeWidth={1} strokeDasharray="4 4" />
                                <Radar name="Current" dataKey="current" stroke="#E5E6DA" fill="#E5E6DA" fillOpacity={0.1} strokeWidth={2} />
                            </RadarChart>
                        </ResponsiveContainer>
                        <div className="flex items-center justify-center gap-6 mt-1 text-[10px] text-cream/20">
                            <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-cream" /> Yours</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-0.5 bg-ember border-dashed" /> Required</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ═══ CAPSTONE PROJECTS LINK ═══ */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-12">
                <div className="p-8 glass rounded-2xl border-l-4 border-l-ember flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-ember/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <div className="flex-1 relative z-10">
                        <h2 className="text-xl font-bold text-cream mb-2 flex items-center gap-2">
                            <Target className="w-6 h-6 text-ember" /> Learn with Projects
                        </h2>
                        <p className="text-sm text-cream/70">
                            Apply your knowledge by building custom portfolio projects tailored to your specific skill gaps. Includes an interactive AI tutor.
                        </p>
                    </div>
                    <button onClick={() => router.push("/dashboard/projects")}
                        className="px-8 py-4 bg-ember hover:bg-ember-500 text-cream font-bold rounded-xl whitespace-nowrap shadow-lg flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 ember-glow relative z-10">
                        Enter Project Hub <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            {/* ═══ RECOMMENDED CERTIFICATIONS ═══ */}
            {certifications.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mb-12">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-bold text-cream flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-[#A855F7]" /> Recommended Certifications
                        </h2>
                        <div className="flex items-center gap-2 bg-black/20 p-1 rounded-xl border border-cream/5 self-start">
                            {(['all', 'free', 'paid'] as const).map(f => (
                                <button key={f}
                                    onClick={() => setCertFilter(f)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${certFilter === f ? 'bg-[#A855F7] text-white shadow-lg' : 'text-cream/40 hover:text-cream/80'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    {filteredCerts.length === 0 ? (
                        <div className="p-8 text-center text-cream/40 glass rounded-2xl border border-dashed border-cream/10">
                            No {certFilter} certifications found for these criteria.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredCerts.map((cert: any, idx: number) => (
                                <a key={idx} href={cert.url} target="_blank" rel="noopener noreferrer"
                                    className="block p-6 glass glass-hover rounded-2xl border-l-4 border-l-[#A855F7] group transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-cream group-hover:text-[#A855F7] transition-colors">{cert.title}</h3>
                                        <ExternalLink className="w-4 h-4 text-cream/20 group-hover:text-[#A855F7]" />
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-cream/40 mt-4">
                                        <span className="font-bold">{cert.provider}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-cream/20" />
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cert.cost_type?.toLowerCase() === 'free' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-ember/10 text-ember'}`}>
                                            {cert.cost_type}
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {/* ═══ BOTTOM ACTIONS ═══ */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <button onClick={() => router.push("/dashboard/courses")}
                    className="flex-1 h-14 glass glass-hover rounded-2xl flex items-center justify-center gap-3 text-sm font-bold text-cream/60 hover:text-cream transition-colors">
                    <BookOpen className="w-5 h-5 text-ember" /> Browse All Courses <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={handleExportPDF}
                    className="flex-1 h-14 glass glass-hover rounded-2xl flex items-center justify-center gap-3 text-sm font-bold text-cream/60 hover:text-cream transition-colors">
                    <Download className="w-5 h-5 text-cream" /> Export to PDF
                </button>
                <button onClick={() => router.push("/dashboard/interview")}
                    className="flex-1 h-14 bg-ember hover:bg-ember-500 text-cream rounded-2xl flex items-center justify-center gap-3 text-sm font-bold transition-colors ember-glow">
                    <Mic className="w-5 h-5" /> Start Mock Interview
                </button>
            </div>
        </div>
    )
}
