/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Scale, Github, LayoutPanelLeft } from "lucide-react";

export function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-brand-bg/80 backdrop-blur-md"
      id="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white text-black flex items-center justify-center font-bold text-sm">V</div>
            <span className="text-lg font-bold tracking-tight">VerdictX</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
             <button className="px-4 py-1.5 text-xs font-semibold text-white bg-white/10 rounded-md border border-white/10 hover:bg-white/20 transition-all" id="nav-cta">
               Analyze Idea
             </button>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden" id="hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 text-xs font-medium mb-8">
            <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            V1.0 is now live
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6">
            <span className="gradient-text">Decision Intelligence</span> <br />
            for build phase
          </h1>
          <p className="max-w-xl mx-auto text-base md:text-lg text-zinc-400 mb-10 leading-relaxed font-normal">
            VerdictX analyzes your project idea, feasibility, and risks using multi-perspective AI. Modern intelligence for modern founders.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#analyze" 
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-black bg-white rounded-md hover:bg-zinc-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
              id="hero-primary-cta"
            >
              Get Started
            </a>
            <a 
              href="#demo" 
              className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-zinc-300 border border-zinc-800 rounded-md hover:bg-zinc-900 transition-all"
              id="hero-secondary-cta"
            >
              Read Docs
            </a>
          </div>
        </motion.div>
      </div>
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 grid-bg opacity-30" />
      <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[10%] right-[20%] w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-12 border-t border-brand-border mt-20" id="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-500" />
          <span className="text-lg font-bold tracking-tight">VerdictX</span>
        </div>
        <p className="text-sm text-gray-500">
          Built with Gemini AI & Modern UI Design.
        </p>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
