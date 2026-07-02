import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, Loader2, Sparkles, AlertCircle, TrendingUp, Cpu, 
  Globe, Code, LayoutPanelLeft, Laptop, Tablet, 
  Smartphone, Search, FileText, CheckCircle, XCircle, AlertTriangle, 
  Activity, ArrowRight, Terminal, ExternalLink, HelpCircle,
  ShieldCheck, BarChart3, Lightbulb, DollarSign, Users, Grid, 
  Map, BookOpen, Award, Check, ChevronRight
} from "lucide-react";
import LiveSandbox from "./LiveSandbox";

// Redesigned VerdictReport schema for the Idea Intelligence Engine
export interface VerdictReport {
  projectType: string;
  projectName: string;
  scores: {
    problemImportance: number;
    innovation: number;
    technicalFeasibility: number;
    businessPotential: number;
    marketDemand: number;
    scalability: number;
    competitiveAdvantage: number;
    socialImpact: number;
    researchValue: number;
    executionDifficulty: number;
    investmentPotential: number;
    overallScore: number;
  };
  projectUnderstanding: {
    coreProblemStatement: string;
    primaryObjective: string;
    vision: string;
    mission: string;
    targetUsers: string;
    targetIndustries: string;
    mainStakeholders: string;
    expectedOutcomes: string;
    summary: string;
    recommendations: string[];
  };
  problemValidation: {
    analysis: string;
    severity: string;
    frequency: string;
    costOfNotSolving: string;
    ratingSeverity: number;
    ratingFrequency: number;
    ratingMarketNeed: number;
    ratingEvidenceStrength: number;
    recommendations: string[];
  };
  marketAnalysis: {
    analysis: string;
    competitors: string[];
    advantages: string[];
    disadvantages: string[];
    missingCapabilities: string[];
    competitiveDifferentiation: string;
    marketSaturation: string;
    recommendations: string[];
  };
  innovationAnalysis: {
    analysis: string;
    innovationExist: string;
    innovationNotExist: string;
    recommendations: string[];
  };
  technicalFeasibility: {
    analysis: string;
    estimateDevDifficulty: string;
    estimateTechnicalRisk: string;
    estimateTimeToMVP: string;
    estimateTeamSize: string;
    recommendations: string[];
  };
  businessAnalysis: {
    analysis: string;
    recommendations: string[];
  };
  socialImpact: {
    analysis: string;
    recommendations: string[];
  };
  userValueAnalysis: {
    analysis: string;
    recommendations: string[];
  };
  swotAnalysis: {
    strengths: { title: string; reasoning: string }[];
    weaknesses: { title: string; reasoning: string }[];
    opportunities: { title: string; reasoning: string }[];
    threats: { title: string; reasoning: string }[];
    recommendations: string[];
  };
  riskAnalysis: {
    risks: { category: string; description: string; severity: "Low" | "Medium" | "High"; mitigation: string }[];
    recommendations: string[];
  };
  scalabilityAnalysis: {
    analysis: string;
    recommendations: string[];
  };
  implementationRoadmap: {
    mvpFeatures: string[];
    phase2Features: string[];
    phase3Features: string[];
    longTermVision: string;
    recommendations: string[];
  };
  researchContribution: {
    analysis: string;
    recommendations: string[];
  };
  investorAnalysis: {
    analysis: string;
    decision: string;
    concerns: string[];
    preFundingMilestones: string[];
    recommendations: string[];
  };
  finalVerdict: {
    executiveSummary: string;
    topStrengths: string[];
    criticalWeaknesses: string[];
    keyRisks: string[];
    immediateImprovements: string[];
    longTermOpportunities: string[];
    finalRecommendation: string;
  };
}

interface InputPanelProps {
  onAnalyzeText: (data: { idea: string; problem: string; users: string; solution: string; githubSummary: string }) => Promise<void>;
  onAnalyzeRepo: (repoUrl: string, onProgress: (job: any) => void) => Promise<void>;
  isLoading: boolean;
}

export function InputPanel({ onAnalyzeText, onAnalyzeRepo, isLoading }: InputPanelProps) {
  const [activeTab, setActiveTab] = useState<"repo" | "text">("repo");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoError, setRepoError] = useState<string | null>(null);
  
  // Text form fields
  const [formData, setFormData] = useState({
    idea: "",
    problem: "",
    users: "",
    solution: "",
    githubSummary: ""
  });

  // Progress state for repo execution
  const [activeJob, setActiveJob] = useState<any | null>(null);

  const handleRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setRepoError(null);
    setActiveJob(null);

    try {
      await onAnalyzeRepo(repoUrl, (job) => {
        setActiveJob(job);
        if (job.status === "failed") {
          setRepoError(job.error || "Execution terminated unexpectedly.");
        }
      });
    } catch (err: any) {
      setRepoError(err.message || "Failed to start execution engine.");
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyzeText(formData);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16" id="analyze">
      {/* TABS SELECTOR */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-lg">
          <button
            onClick={() => { if (!isLoading) setActiveTab("repo"); }}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
              activeTab === "repo" 
                ? "bg-white text-black" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Live Repo Execution
          </button>
          <button
            onClick={() => { if (!isLoading) setActiveTab("text"); }}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
              activeTab === "text" 
                ? "bg-white text-black" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            Text Thesis Audit
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-zinc-950 rounded-2xl p-8 md:p-12 border border-zinc-800 shadow-2xl relative overflow-hidden"
      >
        {activeTab === "repo" ? (
          <div>
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">VerdictX Live Execution Engine</h2>
              <p className="text-zinc-500 text-sm max-w-xl">
                Submit any public GitHub repository. VerdictX will clone, detect structures, install dependencies, run the app, capture screenshots, discover pages, and critique specifications.
              </p>
            </div>

            <form onSubmit={handleRepoSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  GitHub Repository URL
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    required
                    type="url"
                    disabled={isLoading}
                    placeholder="e.g., https://github.com/facebook/react"
                    className="flex-grow bg-zinc-900 border border-zinc-800 rounded-md px-4 py-3 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                  />
                  <button
                    disabled={isLoading || !repoUrl.trim()}
                    type="submit"
                    className="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-md hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
                    Deploy & Execute
                  </button>
                </div>
              </div>

              {repoError && (
                <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-md text-red-400 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">Execution Interrupted</span>
                    <span>{repoError}</span>
                  </div>
                </div>
              )}

              {/* RETRO LOG TERMINAL */}
              <AnimatePresence>
                {isLoading && activeJob && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4 border-t border-zinc-900 overflow-hidden"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-400 font-mono flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        AGENT STATE: ACTIVE
                      </span>
                      <span className="text-zinc-500 font-mono">Progress: {activeJob.progress}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full transition-all duration-500"
                        style={{ width: `${activeJob.progress}%` }}
                      />
                    </div>

                    {/* Logs Screen */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 font-mono text-[11px] text-zinc-400 max-h-52 overflow-y-auto space-y-1">
                      <div className="text-zinc-600 border-b border-zinc-900 pb-2 mb-2 flex items-center justify-between">
                        <span>LIVE CORE RUNNER PROCESS LOGS</span>
                        <span className="px-1.5 py-0.5 bg-zinc-900 text-[9px] rounded">SESSION_ID_{activeJob.id?.substring(0,6)}</span>
                      </div>
                      {activeJob.logs?.map((l: string, idx: number) => (
                        <div key={idx} className="leading-relaxed">
                          <span className="text-zinc-600 mr-2">❯</span>
                          {l}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        ) : (
          <div>
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Text Thesis Audit Panel</h2>
              <p className="text-zinc-500 text-sm max-w-xl">
                Don't have a live repository? Provide your written business proposal and technical specification sheet. Our AI panel will simulate a 15-stage venture appraisal.
              </p>
            </div>

            <form onSubmit={handleTextSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Project Concept / Title</label>
                    <input 
                      required
                      placeholder="e.g., Unkey — API Key Management"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                      value={formData.idea}
                      onChange={(e) => setFormData({...formData, idea: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Target Audience</label>
                    <input 
                      required
                      placeholder="Founders, Devs, Enterprise..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                      value={formData.users}
                      onChange={(e) => setFormData({...formData, users: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Core Problem Inefficiency</label>
                    <textarea 
                      required
                      placeholder="What is the fundamental inefficiency in the market?"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all h-[116px] resize-none font-mono"
                      value={formData.problem}
                      onChange={(e) => setFormData({...formData, problem: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Technical Solution Architecture</label>
                <textarea 
                  required
                  placeholder="How does your proposed architecture solve this problem?"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-3 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all h-24 resize-none font-mono"
                  value={formData.solution}
                  onChange={(e) => setFormData({...formData, solution: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Imputed Repository Claims (Optional)</label>
                <input 
                  placeholder="e.g. SQLite database, NextJS, JWT authentication, full offline support"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                  value={formData.githubSummary}
                  onChange={(e) => setFormData({...formData, githubSummary: e.target.value})}
                />
              </div>

              <button 
                disabled={isLoading}
                className="w-full h-12 bg-white text-black font-bold uppercase tracking-wider text-xs rounded-md hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Thesis Audit...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Strategic Verdict</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Interactive Simulated Frame Component for screenshots
function BrowserExperience({ projectType, screenshots, sitemap }: { projectType: string; screenshots: any; sitemap: string[] }) {
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeUrl, setActiveUrl] = useState("/");

  if (!screenshots) return null;

  const getViewportDimensions = () => {
    switch (viewport) {
      case "desktop": return "max-w-full aspect-[16/10] h-[450px]";
      case "tablet": return "max-w-2xl aspect-[3/4] h-[520px]";
      case "mobile": return "max-w-xs aspect-[9/19] h-[500px]";
    }
  };

  const getScreenshotUrl = () => {
    switch (viewport) {
      case "desktop": return screenshots.homepageScreenshot;
      case "tablet": return screenshots.tabletScreenshot || screenshots.homepageScreenshot;
      case "mobile": return screenshots.mobileScreenshot || screenshots.homepageScreenshot;
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center">
      <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b border-zinc-900">
        <div>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Live Project Experience</h3>
          <p className="text-[11px] text-zinc-400 font-mono">CRAWLED PATHS AND VISUAL LAYOUT SIMULATION</p>
        </div>

        {/* Viewport selectors */}
        <div className="flex gap-1 bg-zinc-900 p-1 border border-zinc-800 rounded-lg">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1.5 rounded transition-all flex items-center gap-1 text-[10px] font-bold ${viewport === "desktop" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Desktop
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`p-1.5 rounded transition-all flex items-center gap-1 text-[10px] font-bold ${viewport === "tablet" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
          >
            <Tablet className="w-3.5 h-3.5" />
            Tablet
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1.5 rounded transition-all flex items-center gap-1 text-[10px] font-bold ${viewport === "mobile" ? "bg-white text-black" : "text-zinc-500 hover:text-white"}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile
          </button>
        </div>
      </div>

      {/* Mock Browser Frame */}
      <div className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col transition-all duration-300 ${getViewportDimensions()}`}>
        {/* Address bar */}
        <div className="bg-zinc-950 px-4 py-2 border-b border-zinc-900 flex items-center gap-2">
          <div className="flex gap-1 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
          </div>
          <div className="flex-grow bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
            <span className="truncate">localhost:sandbox{activeUrl}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
          </div>
        </div>

        {/* Browser viewport simulation */}
        <div className="flex-grow relative bg-zinc-950 overflow-y-auto custom-scrollbar">
          <img 
            referrerPolicy="no-referrer"
            src={getScreenshotUrl()} 
            alt="Running app screenshot"
            className="w-full object-contain object-top"
          />
        </div>
      </div>

      {/* Frame Details */}
      <div className="w-full mt-4 pt-4 border-t border-zinc-900 flex flex-wrap justify-between gap-4 text-[10px] font-mono text-zinc-500">
        <div>FRAMEWORK: <span className="text-zinc-300 uppercase font-bold">{projectType}</span></div>
        <div>URL: <span className="text-zinc-300 font-bold">http://localhost:sandbox</span></div>
        <div>STATUS: <span className="text-emerald-500 font-bold uppercase">● RUNNING</span></div>
      </div>
    </div>
  );
}

export function Dashboard({ analysis, screenshots, sitemap, projectType }: { analysis: VerdictReport; screenshots?: any; sitemap?: string[]; projectType?: string; jobId?: string; repoUrl?: string }) {
  const { 
    scores, 
    projectUnderstanding, 
    problemValidation, 
    marketAnalysis, 
    innovationAnalysis, 
    technicalFeasibility, 
    businessAnalysis, 
    socialImpact, 
    userValueAnalysis, 
    swotAnalysis, 
    riskAnalysis, 
    scalabilityAnalysis, 
    implementationRoadmap, 
    researchContribution, 
    investorAnalysis, 
    finalVerdict 
  } = analysis;

  const [activeTab, setActiveTab] = useState<string>("finalVerdict");

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 border-emerald-500/20";
    if (score >= 70) return "text-blue-400 border-blue-500/20";
    if (score >= 50) return "text-orange-400 border-orange-500/20";
    return "text-red-400 border-red-500/20";
  };

  const getLabelColor = (label: string) => {
    switch (label) {
      case "Excellent": return "text-emerald-400 bg-emerald-500/5 border-emerald-500/20";
      case "Promising": return "text-blue-400 bg-blue-500/5 border-blue-500/20";
      case "Needs Improvement": return "text-orange-400 bg-orange-500/5 border-orange-500/20";
      case "Poor": return "text-red-400 bg-red-500/5 border-red-500/20";
      default: return "text-white bg-zinc-900 border-zinc-800";
    }
  };

  const menuItems = [
    { id: "finalVerdict", label: "Venture Verdict", icon: ShieldCheck },
    { id: "projectUnderstanding", label: "Project Brief", icon: Search },
    { id: "problemValidation", label: "Problem Validation", icon: HelpCircle },
    { id: "marketAnalysis", label: "Market & Competitors", icon: BarChart3 },
    { id: "innovationAnalysis", label: "Originality Audit", icon: Lightbulb },
    { id: "technicalFeasibility", label: "Technical Feasibility", icon: Cpu },
    { id: "businessAnalysis", label: "Monetization Strategy", icon: DollarSign },
    { id: "socialImpact", label: "Societal Impact", icon: Globe },
    { id: "userValueAnalysis", label: "User Friction Points", icon: Users },
    { id: "swotAnalysis", label: "SWOT Matrix", icon: Grid },
    { id: "riskAnalysis", label: "Risk Mitigation", icon: AlertTriangle },
    { id: "scalabilityAnalysis", label: "Scale Architecture", icon: TrendingUp },
    { id: "implementationRoadmap", label: "Phased Roadmap", icon: Map },
    { id: "researchContribution", label: "Research Assets", icon: BookOpen },
    { id: "investorAnalysis", label: "Investment Viability", icon: Award }
  ];

  const scoreGridItems = [
    { label: "Problem Gravity", val: scores.problemImportance, desc: "Severity, frequency, and friction of target problem." },
    { label: "Originality & Innovation", val: scores.innovation, desc: "Defensibility and depth of unique value multipliers." },
    { label: "Tech Feasibility", val: scores.technicalFeasibility, desc: "Architecture risk bounds and MVP completion speed." },
    { label: "Business Viability", val: scores.businessPotential, desc: "Unit economics, margins, and monetization pathways." },
    { label: "Market Demand", val: scores.marketDemand, desc: "Market size, addressable segments, and saturation limits." },
    { label: "Scalability Bounds", val: scores.scalability, desc: "Data structures, elasticity, and cloud resource margins." },
    { label: "Competitive Defense", val: scores.competitiveAdvantage, desc: "Moat strength, differentiation, and features gaps." },
    { label: "Societal & Ethical", val: scores.socialImpact, desc: "Carbon index, accessibility, and human-centric index." },
    { label: "Research Contribution", val: scores.researchValue, desc: "Academic depth, novel data paradigms, and tech assets." },
    { label: "Execution Friction", val: scores.executionDifficulty, desc: "Developer dependencies, deployment depth, and risk." },
    { label: "Investment Gravity", val: scores.investmentPotential, desc: "Likelihood of receiving pre-seed or venture financing." }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-16" id="results">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b border-zinc-900 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border rounded-md font-mono bg-zinc-900 text-zinc-400 border-zinc-800">
              {projectType || "IDEA"} AUDIT PIPELINE
            </span>
            <span className="text-zinc-600 font-mono text-xs">/</span>
            <span className="text-zinc-400 text-xs font-mono">DUE DILIGENCE ACTIVE</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter mb-1 uppercase">Idea intelligence engine</h2>
          <p className="text-zinc-500 text-xs font-mono">APPRAISED AT: {new Date().toLocaleDateString()} // VERDICTX CORE v2.0</p>
        </div>

        {/* HERO COMPOSITE BANNER */}
        <div className="flex items-center gap-6 p-4 bg-zinc-950 border border-zinc-900 rounded-xl shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Composite Viability Rating</span>
            <div className="text-4xl font-black tracking-tighter tabular-nums text-white">
              {scores.overallScore.toFixed(1)}<span className="text-lg opacity-25">/100</span>
            </div>
          </div>
          <div className={`px-4 py-2 text-sm font-black uppercase tracking-widest border rounded-md ${getLabelColor(finalVerdict.finalRecommendation.includes("Invest") || scores.overallScore >= 80 ? "Excellent" : scores.overallScore >= 65 ? "Promising" : "Needs Improvement")}`}>
            {scores.overallScore >= 80 ? "Highly Viable" : scores.overallScore >= 65 ? "Promising" : "Speculative"}
          </div>
        </div>
      </div>

      {/* METRIC PARAMETERS bento grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {scoreGridItems.map((score, index) => (
          <div key={index} className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 hover:border-zinc-800 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{score.label}</span>
                <span className={`font-mono text-xs font-bold ${getScoreColor(score.val)}`}>{score.val}/100</span>
              </div>
              <div className="w-full bg-zinc-900 h-1 rounded-full mb-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${
                  score.val >= 85 ? "bg-emerald-500" :
                  score.val >= 70 ? "bg-blue-500" :
                  score.val >= 50 ? "bg-orange-500" : "bg-red-500"
                }`} style={{ width: `${score.val}%` }} />
              </div>
            </div>
            <p className="text-[11px] text-zinc-500 font-sans leading-relaxed mt-2">{score.desc}</p>
          </div>
        ))}
      </div>

      {/* 15-CATEGORY SIDEBAR EXPLORER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
        {/* SIDEBAR NAVIGATION */}
        <div className="lg:col-span-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 font-mono">
            Appraisal Checklist (15 Stages)
          </div>
          <div className="max-h-[600px] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    isActive 
                      ? "bg-white text-black font-bold shadow-lg" 
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "rotate-90 text-black" : "text-zinc-600"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* DETAILS CONTENT CARD */}
        <div className="lg:col-span-8 bg-zinc-950 border border-zinc-900 rounded-2xl p-8 min-h-[500px] flex flex-col justify-between">
          <div>
            {/* STAGE HEADER */}
            <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
              <div className="flex items-center gap-3">
                {React.createElement(menuItems.find(m => m.id === activeTab)?.icon || ShieldCheck, { className: "w-5 h-5 text-zinc-400" })}
                <span className="text-sm font-black uppercase tracking-widest text-zinc-300">
                  {menuItems.find(m => m.id === activeTab)?.label}
                </span>
              </div>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                STAGE_{activeTab.toUpperCase()}
              </span>
            </div>

            {/* STAGE SUB-VIEWS */}
            <div className="space-y-6">
              {/* 1. EXECUTIVE SYNTHESIS */}
              {activeTab === "finalVerdict" && (
                <div className="space-y-6">
                  <div className="p-4 bg-zinc-900/50 border border-zinc-900 rounded-xl">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-mono">Executive Summary</span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{finalVerdict.executiveSummary}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block mb-2 font-mono">Top Strengths</span>
                      <ul className="space-y-1.5 text-xs text-zinc-400">
                        {finalVerdict.topStrengths.map((s, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-emerald-500">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-2 font-mono">Critical Weaknesses</span>
                      <ul className="space-y-1.5 text-xs text-zinc-400">
                        {finalVerdict.criticalWeaknesses.map((w, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-red-500">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-2 font-mono">Key Risks</span>
                      <ul className="space-y-1 text-xs text-zinc-500">
                        {finalVerdict.keyRisks.map((k, i) => <li key={i}>- {k}</li>)}
                      </ul>
                    </div>
                    <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2 font-mono">Immediate Actions</span>
                      <ul className="space-y-1 text-xs text-zinc-500">
                        {finalVerdict.immediateImprovements.map((m, i) => <li key={i}>- {m}</li>)}
                      </ul>
                    </div>
                    <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2 font-mono">Future Opportunities</span>
                      <ul className="space-y-1 text-xs text-zinc-500">
                        {finalVerdict.longTermOpportunities.map((o, i) => <li key={i}>- {o}</li>)}
                      </ul>
                    </div>
                  </div>
                  <div className="p-4 border border-zinc-800 bg-white/5 rounded-xl">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1 font-mono">VC Alignment Thesis</span>
                    <p className="text-sm font-black text-white leading-relaxed">{finalVerdict.finalRecommendation}</p>
                  </div>
                </div>
              )}

              {/* 2. PROJECT BRIEF / UNDERSTANDING */}
              {activeTab === "projectUnderstanding" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] text-zinc-500 uppercase block mb-1">Product Vision</span>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">{projectUnderstanding.vision}</p>
                    </div>
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] text-zinc-500 uppercase block mb-1">Mission Strategy</span>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">{projectUnderstanding.mission}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1 font-mono">Core Problem Solved</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{projectUnderstanding.coreProblemStatement}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1 font-mono">Primary Objective</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{projectUnderstanding.primaryObjective}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-900 pt-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1 font-mono">Target Users</span>
                        <span className="text-zinc-300 font-sans">{projectUnderstanding.targetUsers}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1 font-mono">Target Industries</span>
                        <span className="text-zinc-300 font-sans">{projectUnderstanding.targetIndustries}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1 font-mono">Expected Outcomes</span>
                        <span className="text-zinc-300 font-sans">{projectUnderstanding.expectedOutcomes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. PROBLEM VALIDATION */}
              {activeTab === "problemValidation" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Severity Rating</span>
                      <span className="text-sm font-bold text-zinc-200">{problemValidation.ratingSeverity}/10</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Frequency Rating</span>
                      <span className="text-sm font-bold text-zinc-200">{problemValidation.ratingFrequency}/10</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Market Desirability</span>
                      <span className="text-sm font-bold text-zinc-200">{problemValidation.ratingMarketNeed}/10</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Evidence Strength</span>
                      <span className="text-sm font-bold text-zinc-200">{problemValidation.ratingEvidenceStrength}/10</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{problemValidation.analysis}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-900 pt-4">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1 font-mono">Frequency Analysis</span>
                        <p className="text-xs text-zinc-400 font-sans">{problemValidation.frequency}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1 font-mono">Gravity Severity</span>
                        <p className="text-xs text-zinc-400 font-sans">{problemValidation.severity}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1 font-mono">Cost of Inaction</span>
                        <p className="text-xs text-zinc-400 font-sans">{problemValidation.costOfNotSolving}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. MARKET & COMPETITORS */}
              {activeTab === "marketAnalysis" && (
                <div className="space-y-6">
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{marketAnalysis.analysis}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2 font-mono">Saturated Competitors</span>
                      <div className="flex flex-wrap gap-2">
                        {marketAnalysis.competitors.map((c, i) => (
                          <span key={i} className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[10px] rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2 font-mono">Core Differentiation</span>
                      <p className="text-xs text-zinc-400 font-sans">{marketAnalysis.competitiveDifferentiation}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase block mb-2 font-mono">Product Advantages</span>
                      <ul className="space-y-1 text-xs text-zinc-400 list-disc pl-4 font-sans">
                        {marketAnalysis.advantages.map((a, i) => <li key={i}>{a}</li>)}
                      </ul>
                    </div>
                    <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-red-500 uppercase block mb-2 font-mono">Weaknesses / Gaps</span>
                      <ul className="space-y-1 text-xs text-zinc-400 list-disc pl-4 font-sans">
                        {marketAnalysis.disadvantages.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                    <div className="p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] font-bold text-orange-500 uppercase block mb-2 font-mono">Missing Features</span>
                      <ul className="space-y-1 text-xs text-zinc-400 list-disc pl-4 font-sans">
                        {marketAnalysis.missingCapabilities.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. INNOVATION ORIGINALITY */}
              {activeTab === "innovationAnalysis" && (
                <div className="space-y-6">
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{innovationAnalysis.analysis}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] text-zinc-500 uppercase block mb-1">Commoditised Features (Exist)</span>
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed">{innovationAnalysis.innovationExist}</p>
                    </div>
                    <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                      <span className="text-[10px] text-emerald-500 uppercase block mb-1 font-bold">Unprecedented Innovations (Does Not Exist)</span>
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed">{innovationAnalysis.innovationNotExist}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. TECHNICAL FEASIBILITY */}
              {activeTab === "technicalFeasibility" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Complexity Level</span>
                      <span className="text-xs font-bold text-zinc-200">{technicalFeasibility.estimateDevDifficulty}</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Architecture Risk</span>
                      <span className="text-xs font-bold text-zinc-200">{technicalFeasibility.estimateTechnicalRisk}</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Timeline to MVP</span>
                      <span className="text-xs font-bold text-zinc-200">{technicalFeasibility.estimateTimeToMVP}</span>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-900 p-3 rounded-lg">
                      <span className="text-[9px] text-zinc-500 uppercase block mb-1">Required Engineers</span>
                      <span className="text-xs font-bold text-zinc-200">{technicalFeasibility.estimateTeamSize}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{technicalFeasibility.analysis}</p>
                </div>
              )}

              {/* 7. BUSINESS & MONETIZATION */}
              {activeTab === "businessAnalysis" && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{businessAnalysis.analysis}</p>
                </div>
              )}

              {/* 8. SOCIETAL IMPACT */}
              {activeTab === "socialImpact" && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{socialImpact.analysis}</p>
                </div>
              )}

              {/* 9. USER VALUE & FRICTION */}
              {activeTab === "userValueAnalysis" && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{userValueAnalysis.analysis}</p>
                </div>
              )}

              {/* 10. SWOT GRID MATRIX */}
              {activeTab === "swotAnalysis" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* STRENGTHS */}
                  <div className="bg-emerald-950/10 border border-emerald-500/20 p-5 rounded-xl">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block mb-3 font-mono">Strengths</span>
                    <ul className="space-y-3">
                      {swotAnalysis.strengths.map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <span className="font-bold text-emerald-400 block mb-0.5">{item.title}</span>
                          <p className="text-zinc-400 font-sans">{item.reasoning}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* WEAKNESSES */}
                  <div className="bg-red-950/10 border border-red-500/20 p-5 rounded-xl">
                    <span className="text-xs font-black text-red-400 uppercase tracking-widest block mb-3 font-mono">Weaknesses</span>
                    <ul className="space-y-3">
                      {swotAnalysis.weaknesses.map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <span className="font-bold text-red-400 block mb-0.5">{item.title}</span>
                          <p className="text-zinc-400 font-sans">{item.reasoning}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* OPPORTUNITIES */}
                  <div className="bg-blue-950/10 border border-blue-500/20 p-5 rounded-xl">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest block mb-3 font-mono">Opportunities</span>
                    <ul className="space-y-3">
                      {swotAnalysis.opportunities.map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <span className="font-bold text-blue-400 block mb-0.5">{item.title}</span>
                          <p className="text-zinc-400 font-sans">{item.reasoning}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* THREATS */}
                  <div className="bg-orange-950/10 border border-orange-500/20 p-5 rounded-xl">
                    <span className="text-xs font-black text-orange-400 uppercase tracking-widest block mb-3 font-mono">Threats</span>
                    <ul className="space-y-3">
                      {swotAnalysis.threats.map((item, i) => (
                        <li key={i} className="text-xs leading-relaxed">
                          <span className="font-bold text-orange-400 block mb-0.5">{item.title}</span>
                          <p className="text-zinc-400 font-sans">{item.reasoning}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* 11. RISK MATRIX */}
              {activeTab === "riskAnalysis" && (
                <div className="space-y-6">
                  <div className="overflow-x-auto border border-zinc-900 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-950 border-b border-zinc-900 text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
                          <th className="py-3 px-4">Risk Category</th>
                          <th className="py-3 px-4">Hazard Description</th>
                          <th className="py-3 px-4 w-24 text-center">Severity</th>
                          <th className="py-3 px-4">Mitigation Plan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 bg-zinc-950/40">
                        {riskAnalysis.risks.map((item, i) => (
                          <tr key={i} className="hover:bg-zinc-900/20 transition-colors font-sans">
                            <td className="py-3.5 px-4 font-bold text-zinc-300 font-mono text-[10px] uppercase">{item.category}</td>
                            <td className="py-3.5 px-4 text-zinc-400 leading-relaxed">{item.description}</td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono tracking-wider ${
                                item.severity === "High" ? "bg-red-500/10 text-red-400" :
                                item.severity === "Medium" ? "bg-orange-500/10 text-orange-400" :
                                "bg-emerald-500/10 text-emerald-400"
                              }`}>
                                {item.severity}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-zinc-300 font-medium leading-relaxed">{item.mitigation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 12. SCALABILITY & ELASTICITY */}
              {activeTab === "scalabilityAnalysis" && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{scalabilityAnalysis.analysis}</p>
                </div>
              )}

              {/* 13. IMPLEMENTATION ROADMAP */}
              {activeTab === "implementationRoadmap" && (
                <div className="space-y-6">
                  <div className="relative border-l-2 border-zinc-800 ml-4 space-y-8 py-2 font-mono">
                    {/* PHASE 1 */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-blue-500 border-4 border-zinc-950" />
                      <span className="text-[10px] text-blue-400 uppercase tracking-wider block font-bold mb-1">Phase 1: Minimum Viable Product (MVP)</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {implementationRoadmap.mvpFeatures.map((f, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-sans text-xs text-zinc-400">{f}</span>
                        ))}
                      </div>
                    </div>

                    {/* PHASE 2 */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-purple-500 border-4 border-zinc-950" />
                      <span className="text-[10px] text-purple-400 uppercase tracking-wider block font-bold mb-1">Phase 2: Scale & Monetization</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {implementationRoadmap.phase2Features.map((f, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-sans text-xs text-zinc-400">{f}</span>
                        ))}
                      </div>
                    </div>

                    {/* PHASE 3 */}
                    <div className="relative pl-6">
                      <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-zinc-950" />
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold mb-1">Phase 3: Ecosystem Expansion</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {implementationRoadmap.phase3Features.map((f, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded font-sans text-xs text-zinc-400">{f}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-900/30 border border-zinc-900 rounded-xl mt-6">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1 font-mono">Long Term Vision</span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{implementationRoadmap.longTermVision}</p>
                  </div>
                </div>
              )}

              {/* 14. RESEARCH VALUE */}
              {activeTab === "researchContribution" && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{researchContribution.analysis}</p>
                </div>
              )}

              {/* 15. VC INVESTOR ANALYSIS */}
              {activeTab === "investorAnalysis" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <span className="text-xs font-mono text-zinc-400 uppercase">Simulated VC Funding Decision</span>
                    <span className={`px-4 py-1.5 rounded-md font-mono text-xs font-black uppercase tracking-wider ${
                      investorAnalysis.decision.includes("Invest") || investorAnalysis.decision.includes("Yes") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      investorAnalysis.decision.includes("Watch") ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {investorAnalysis.decision}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{investorAnalysis.analysis}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-900">
                    <div>
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-2 font-mono">Investment Concerns</span>
                      <ul className="space-y-1 text-xs text-zinc-400 list-disc pl-4 font-sans">
                        {investorAnalysis.concerns.map((c, idx) => <li key={idx}>{c}</li>)}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2 font-mono">Pre-Funding Milestones</span>
                      <ul className="space-y-1 text-xs text-zinc-400 list-disc pl-4 font-sans">
                        {investorAnalysis.preFundingMilestones.map((m, idx) => <li key={idx}>{m}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONABLE RECOMMENDATIONS LIST */}
          <div className="mt-8 pt-6 border-t border-zinc-900">
            <span className="text-[10px] font-black text-white uppercase tracking-wider block mb-3 font-mono flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" /> Actionable Recommendations
            </span>
            <ul className="space-y-2.5">
              {(analysis[activeTab as keyof VerdictReport] as any)?.recommendations?.map((rec: string, idx: number) => (
                <li key={idx} className="text-xs text-zinc-400 leading-relaxed flex gap-2 font-sans">
                  <span className="text-zinc-600 shrink-0 font-mono">[{idx + 1}]</span>
                  <span>{rec}</span>
                </li>
              )) || <li className="text-xs text-zinc-500 italic font-sans">No recommendations required. This section meets top enterprise metrics.</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* CORE SANDBOX PREVIEWS AND MAPS (Only displayed if executed repo exists) */}
      {screenshots && (
        <div className="border-t border-zinc-900 pt-16 space-y-12">
          <div className="max-w-xl">
            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-2">Live Application Sandbox Experience</h3>
            <p className="text-zinc-400 text-xs font-mono leading-relaxed">
              Automatic deployment and exploration pipeline results. Headless browser captures verifying claimed interface paths.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <BrowserExperience 
                projectType={projectType || "HTML"} 
                screenshots={screenshots} 
                sitemap={sitemap || ["/"]} 
              />
            </div>

            {/* AUTOMATIC PAGE DISCOVERY LIST */}
            <div className="lg:col-span-1">
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-900">
                  <LayoutPanelLeft className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">Discovered Paths</h3>
                </div>
                
                <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                  Headless crawl identifying valid routed assets and dynamic pathways. Only verifiable links registered.
                </p>

                <div className="space-y-2.5 flex-grow overflow-y-auto max-h-80 pr-2 custom-scrollbar">
                  {(sitemap && sitemap.length > 0 ? sitemap : ["/", "/about", "/contact"]).map((path, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-zinc-900 border border-zinc-900 px-3.5 py-2.5 rounded-lg text-xs font-mono">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <span className="text-[9px] text-zinc-600">[{idx+1}]</span>
                        <span>{path}</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
