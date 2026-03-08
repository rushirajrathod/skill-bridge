"use client"

import React from "react"
import { AlertCircle } from "lucide-react"
import { motion } from "framer-motion"

export default function AIDisclaimer() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 glass bg-white/5 border border-white/10 rounded-xl my-6"
        >
            <AlertCircle className="w-5 h-5 text-ember shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-[10px] font-bold text-ember uppercase tracking-widest">Responsible AI Disclaimer</p>
                <p className="text-xs text-cream/40 leading-relaxed">
                    Aura AI uses generative artificial intelligence to provide career guidance.
                    AI can make mistakes; please verify critical details, course links, and technical requirements.
                    This tool follows strict safety guidelines and does not store PII.
                    Your data is handled according to our Responsible AI policy.
                </p>
            </div>
        </motion.div>
    )
}
