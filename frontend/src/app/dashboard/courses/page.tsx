/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Filter, Star, ExternalLink, ArrowLeft, BookOpen, Clock, GraduationCap, Sparkles, Loader2, Target, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { useAppStore } from "@/store/useAppStore"

const PLATFORMS = ["All", "Coursera", "Udemy", "edX", "Skillshare"]
const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"]

const PLATFORM_COLORS: Record<string, string> = {
    Coursera: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Udemy: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    edX: "bg-red-500/10 text-red-400 border-red-500/20",
    Skillshare: "bg-green-500/10 text-green-400 border-green-500/20",
}

interface Course {
    title: string
    platform: string
    level: string
    duration: string
    rating: number
    instructor: string
    description: string
    url: string
    skills: string
}

export default function CourseCatalog() {
    const router = useRouter()
    const { targetRole, courseSearch, setCourseSearch } = useAppStore()

    const [isLoading, setIsLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(courseSearch.results.length > 0)

    const {
        query: searchQuery,
        platform: selectedPlatform,
        level: selectedLevel,
        useRole: useRoleFilter,
        page,
        totalPages,
        results: courses
    } = courseSearch

    // Helper to update store
    const updateSearch = (patch: Partial<typeof courseSearch>) => {
        setCourseSearch({ ...courseSearch, ...patch })
    }

    const setPage = (p: number | ((prev: number) => number)) => {
        const next = typeof p === 'function' ? p(page) : p
        updateSearch({ page: next })
    }

    // We use a ref to track filter changes vs page changes
    const filterHash = `${searchQuery.trim()}|${selectedPlatform}|${selectedLevel}|${useRoleFilter}`
    const prevFilterHash = useRef(filterHash)

    const fetchCourses = useCallback(async (currentPage: number) => {
        setIsLoading(true)
        try {
            const params: any = { limit: 30, page: currentPage }
            if (searchQuery.trim()) params.q = searchQuery.trim()
            if (selectedPlatform !== "All") params.platform = selectedPlatform
            if (selectedLevel !== "All") params.level = selectedLevel
            if (useRoleFilter && targetRole) params.target_role = targetRole

            const resp = await api.get('/courses/search', { params })
            updateSearch({
                results: resp.data.courses || [],
                totalPages: resp.data.total_pages || 1,
                page: currentPage
            })
            setHasSearched(true)
        } catch (err) {
            console.error("Course search failed:", err)
            updateSearch({ results: [] })
        } finally {
            setIsLoading(false)
        }
    }, [searchQuery, selectedPlatform, selectedLevel, useRoleFilter, targetRole, courseSearch])

    useEffect(() => {
        let currentPage = page
        // If filters changed, reset to page 1
        if (filterHash !== prevFilterHash.current) {
            setPage(1)
            currentPage = 1
            prevFilterHash.current = filterHash
            // Clear current results to show loading
            updateSearch({ results: [], page: 1 })
        } else if (courses.length > 0) {
            // Already have results for these filters/page
            return
        }

        const timer = setTimeout(() => {
            fetchCourses(currentPage)
        }, 400)
        return () => clearTimeout(timer)
    }, [filterHash, page, fetchCourses])

    const renderStars = (rating: number) => {
        const full = Math.floor(rating)
        return (
            <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < full ? 'text-ember fill-ember' : 'text-cream/10'}`} />
                ))}
                <span className="text-xs text-cream/30 ml-1">{rating.toFixed(1)}</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-6 sm:p-12 relative">
            <div className="max-w-6xl mx-auto z-10 relative">

                {/* Header */}
                <div className="mb-10">
                    <button onClick={() => router.push("/dashboard/roadmap")}
                        className="group flex items-center gap-2 text-cream/30 hover:text-ember transition-colors text-sm mb-6">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Roadmap
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-ember/10 border border-ember/20 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-ember" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-cream">Course Catalog</h1>
                            <p className="text-cream/30 text-sm">Search across Coursera, Udemy, edX, and Skillshare</p>
                        </div>
                    </div>
                </div>

                {/* Search + Filters */}
                <div className="glass rounded-2xl p-6 mb-8 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cream/20" />
                        <input
                            placeholder="Search courses... e.g. machine learning, react, python"
                            value={searchQuery}
                            onChange={(e) => updateSearch({ query: e.target.value })}
                            className="w-full pl-12 pr-4 py-3.5 bg-olive-200 border border-cream/5 rounded-xl text-cream placeholder:text-cream/15 focus:outline-none focus:border-ember/30 transition-colors text-sm"
                        />
                        {isLoading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ember animate-spin" />}
                    </div>

                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-cream/25 text-xs font-medium">
                            <Filter className="w-3.5 h-3.5" /> Platform:
                        </div>
                        {PLATFORMS.map((p) => (
                            <button key={p} onClick={() => updateSearch({ platform: p })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPlatform === p
                                    ? 'bg-ember text-cream' : 'bg-olive-200 text-cream/30 hover:text-cream/60 border border-cream/5'}`}>
                                {p}
                            </button>
                        ))}

                        <div className="w-px h-5 bg-cream/5 mx-2" />

                        <div className="flex items-center gap-2 text-cream/25 text-xs font-medium">
                            <GraduationCap className="w-3.5 h-3.5" /> Level:
                        </div>
                        {LEVELS.map((l) => (
                            <button key={l} onClick={() => updateSearch({ level: l })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedLevel === l
                                    ? 'bg-ember text-cream' : 'bg-olive-200 text-cream/30 hover:text-cream/60 border border-cream/5'}`}>
                                {l}
                            </button>
                        ))}

                        {targetRole && (
                            <>
                                <div className="w-px h-5 bg-cream/5 mx-2" />
                                <button
                                    onClick={() => updateSearch({ useRole: !useRoleFilter })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${useRoleFilter ? 'bg-ember text-cream' : 'bg-olive-200 text-cream/30 hover:text-cream/60 border border-cream/5'}`}
                                >
                                    <Target className="w-3.5 h-3.5" />
                                    Role Match: {targetRole}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Results Count */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-xs text-cream/25">
                        {hasSearched && `${courses.length} course${courses.length !== 1 ? 's' : ''} found`}
                    </p>
                    {searchQuery && (
                        <button onClick={() => updateSearch({ query: "" })} className="text-xs text-ember hover:text-ember-300 transition-colors">
                            Clear search
                        </button>
                    )}
                </div>

                {/* Course Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {courses.map((course, i) => (
                            <motion.a
                                key={`${course.title}-${course.platform}-${i}`}
                                href={course.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.03 }}
                                className="glass glass-hover rounded-2xl p-5 group cursor-pointer flex flex-col h-full min-h-[180px]"
                            >
                                {/* Platform Badge */}
                                <div className="flex items-center justify-between mb-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${PLATFORM_COLORS[course.platform] || 'bg-cream/5 text-cream/40 border-cream/10'}`}>
                                        {course.platform}
                                    </span>
                                    <ExternalLink className="w-3.5 h-3.5 text-cream/10 group-hover:text-ember transition-colors" />
                                </div>

                                {/* Title */}
                                <h3 className="text-sm font-bold text-cream/80 mb-2 line-clamp-2 break-words group-hover:text-cream transition-colors leading-relaxed">
                                    {course.title}
                                </h3>

                                {/* Instructor */}
                                {course.instructor && (
                                    <p className="text-xs text-cream/25 mb-3">by {course.instructor}</p>
                                )}

                                {/* Rating */}
                                {course.rating > 0 && renderStars(course.rating)}

                                {/* Meta Row - Pinned to bottom */}
                                <div className="mt-auto pt-3 border-t border-cream/5 flex items-center gap-3">
                                    {course.level && (
                                        <span className="text-[10px] text-cream/25 flex items-center gap-1">
                                            <GraduationCap className="w-3 h-3" /> {course.level}
                                        </span>
                                    )}
                                    {course.duration && (
                                        <span className="text-[10px] text-cream/25 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {course.duration}
                                        </span>
                                    )}
                                </div>
                            </motion.a>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Empty State */}
                {!isLoading && hasSearched && courses.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center">
                        <Sparkles className="w-12 h-12 text-cream/10 mb-4" />
                        <p className="text-cream/30 text-sm">No courses found matching your criteria.</p>
                        <p className="text-cream/15 text-xs mt-1">Try broadening your search or changing filters.</p>
                    </motion.div>
                )}

                {/* Pagination Controls */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-6 mt-12 pb-8">
                        <button
                            onClick={() => {
                                setPage(p => Math.max(1, p - 1))
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            disabled={page === 1}
                            className="w-10 h-10 flex items-center justify-center bg-olive-200 border border-cream/5 rounded-xl text-cream disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream/5 hover:border-cream/20 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-cream/50 text-sm font-medium">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => {
                                setPage(p => Math.min(totalPages, p + 1))
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            disabled={page === totalPages}
                            className="w-10 h-10 flex items-center justify-center bg-olive-200 border border-cream/5 rounded-xl text-cream disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cream/5 hover:border-cream/20 transition-all shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Initial Loading */}
                {isLoading && !hasSearched && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-ember animate-spin" />
                    </div>
                )}
            </div>
        </div>
    )
}
