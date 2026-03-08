"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles, Brain, Map, Zap } from "lucide-react"
import Link from "next/link"
import DynamicScene from "@/components/DynamicScene"

export default function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 3D Background */}
      <DynamicScene />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 sm:px-12">

        {/* Nav */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
          <span className="text-sm font-bold tracking-wider text-cream/80">SKILL—BRIDGE</span>
          <Link href="/dashboard/chat"
            className="text-xs font-medium text-cream/50 hover:text-ember transition-colors tracking-wide uppercase">
            Dashboard →
          </Link>
        </nav>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-4xl"
        >
          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-ember/20 bg-ember/5 text-ember mb-8"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold tracking-wide uppercase">AI-Powered Career Intelligence</span>
          </motion.div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-[0.95]">
            <span className="text-cream">Bridge the</span>
            <br />
            <span className="text-gradient">Skill Gap.</span>
          </h1>

          <p className="text-base sm:text-lg text-cream/40 mb-12 max-w-2xl mx-auto leading-relaxed">
            Autonomous AI agents analyze your resume and GitHub, compare against industry requirements,
            and build a personalized learning roadmap with Coursera courses.
          </p>

          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-3 px-10 py-5 bg-ember hover:bg-ember-500 text-cream rounded-full font-bold text-lg transition-all ember-glow group"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl w-full"
        >
          {[
            {
              icon: Brain,
              title: "AI Skills Extraction",
              desc: "Upload your resume or link GitHub. MCP agents extract your true technical capabilities."
            },
            {
              icon: Map,
              title: "RAG Gap Analysis",
              desc: "FAISS vector search compares your skills against real job requirements in milliseconds."
            },
            {
              icon: Sparkles,
              title: "Interactive Roadmaps",
              desc: "Sankey flow visualization with Coursera courses, analytics, and AI interview coaching."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
              whileHover={{ y: -4, borderColor: "rgba(223,108,66,0.2)" }}
              className="p-6 rounded-2xl glass glass-hover"
            >
              <feature.icon className="w-7 h-7 text-ember mb-4" />
              <h3 className="text-base font-bold text-cream mb-2">{feature.title}</h3>
              <p className="text-cream/35 text-sm leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-16 text-[11px] text-cream/20 tracking-widest uppercase"
        >
          Next.js 15 · React 19 · Three.js · FAISS · OpenAI
        </motion.p>
      </div>
    </div>
  )
}
