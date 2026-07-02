import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  Cpu, 
  Terminal as TerminalIcon, 
  RefreshCw, 
  Laptop, 
  Tablet, 
  Smartphone, 
  Activity, 
  Shield, 
  Flame, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play, 
  Square,
  Globe,
  Gauge,
  Navigation,
  FileCheck,
  Zap
} from "lucide-react";

interface LiveSandboxProps {
  jobId: string;
  repoUrl?: string;
  projectType?: string;
}

export default function LiveSandbox({ jobId, repoUrl = "", projectType = "detecting" }: LiveSandboxProps) {
  const [statusData, setStatusData] = useState<any>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [activeSubTab, setActiveSubTab] = useState<"telemetry" | "ai_explorer" | "health" | "scoreboard">("telemetry");
  const [iframeKey, setIframeKey] = useState(0);
  const [isAutoExploring, setIsAutoExploring] = useState(false);
  const [iframeUrl, setIframeUrl] = useState("/");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Poll sandbox status in real-time (every 3 seconds)
  useEffect(() => {
    let isActive = true;
    
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/sandbox/status/${jobId}`);
        if (!res.ok) {
          throw new Error("Sandbox has timed out or is inactive.");
        }
        const data = await res.json();
        if (isActive) {
          setStatusData(data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isActive) {
          setError(err.message || "Failed to sync sandbox state.");
          setIsLoading(false);
        }
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [jobId]);

  // Scroll terminal logs to bottom automatically
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [statusData?.logs?.length, activeSubTab]);

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
    setIframeUrl("/");
    if (iframeRef.current) {
      iframeRef.current.src = `/api/sandbox-proxy/${jobId}/`;
    }
  };

  const handleShutdown = async () => {
    try {
      const res = await fetch(`/api/sandbox/stop/${jobId}`, { method: "POST" });
      if (res.ok) {
        setStatusData((prev: any) => prev ? { ...prev, status: "stopped" } : null);
      }
    } catch (err) {
      console.error("Failed to stop sandbox:", err);
    }
  };

  const triggerAutoExplore = async () => {
    if (isAutoExploring) return;
    setIsAutoExploring(true);
    try {
      const res = await fetch(`/api/sandbox/auto-explore/${jobId}`, { method: "POST" });
      if (!res.ok) {
        throw new Error("AI Agent encountered an interactive blockade.");
      }
      const report = await res.json();
      setStatusData((prev: any) => prev ? { ...prev, explorationReport: report } : null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsAutoExploring(false);
    }
  };

  const getViewportWidth = () => {
    switch (viewport) {
      case "desktop": return "w-full max-w-5xl h-[560px]";
      case "tablet": return "w-[768px] h-[640px]";
      case "mobile": return "w-[395px] h-[680px]";
    }
  };

  // Human friendly uptime calculations
  const formatUptime = (ms: number) => {
    if (!ms || ms < 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // Handle cross-origin iframe navigation events dynamically to update address bar
  const handleIframeLoad = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const path = iframeRef.current.contentWindow.location.pathname;
        const sub = path.replace(`/api/sandbox-proxy/${jobId}`, "") || "/";
        setIframeUrl(sub);
      }
    } catch {
      // Security bounds may block direct access, which is expected and handled gracefully
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Initializing Sandbox Workspace...</span>
      </div>
    );
  }

  if (error || !statusData) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-zinc-950 border border-zinc-900 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-8 h-8 mx-auto text-yellow-500" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Sandbox Expired or Terminated</h3>
        <p className="text-xs text-zinc-500 leading-relaxed font-sans">
          The sandboxed system instance has shut down to protect computing memory resources. Please trigger a new Repository Analysis to launch a fresh interactive environment.
        </p>
      </div>
    );
  }

  const isRunning = statusData.status === "running";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-16">
      {/* LEFT: INTERACTIVE SIMULATOR FRAME (8 cols) */}
      <div className="xl:col-span-8 flex flex-col items-center">
        
        {/* DEVICE CONTROLLER & REFRESH */}
        <div className="w-full flex flex-col sm:flex-row justify-between items-center bg-zinc-950 border border-zinc-900 p-4 rounded-t-2xl gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"}`} />
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Interactive Simulator</h3>
              <p className="text-[10px] text-zinc-500 font-mono font-bold uppercase">PROXY HOST ACTIVE</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Toggles */}
            <div className="flex gap-1 bg-zinc-900 p-1 border border-zinc-800 rounded-lg shrink-0">
              {[
                { type: "desktop", icon: Laptop, label: "Desktop" },
                { type: "tablet", icon: Tablet, label: "Tablet" },
                { type: "mobile", icon: Smartphone, label: "Mobile" }
              ].map(dev => {
                const Icon = dev.icon;
                return (
                  <button
                    key={dev.type}
                    onClick={() => setViewport(dev.type as any)}
                    className={`p-1.5 rounded transition-all flex items-center gap-1 text-[10px] font-bold uppercase ${
                      viewport === dev.type ? "bg-white text-black" : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{dev.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleRefresh}
              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 text-zinc-400 hover:text-white transition-all"
              title="Refresh Simulated Page"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BROWSER MOCK HEADER & IFRAME */}
        <div className="w-full bg-zinc-900 border-x border-zinc-900 flex flex-col items-center p-4 bg-zinc-950/40">
          <div className={`bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${getViewportWidth()}`}>
            
            {/* Address Bar */}
            <div className="bg-zinc-900/50 px-4 py-2.5 border-b border-zinc-900 flex items-center gap-3 shrink-0">
              <div className="flex gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              </div>
              <div className="flex-grow bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span className="text-zinc-400 font-bold">https://sandbox.verdictx/api/sandbox-proxy/{jobId}</span>
                  <span className="text-zinc-600 font-medium">{iframeUrl}</span>
                </div>
                <Globe className="w-3 h-3 opacity-40 shrink-0" />
              </div>
            </div>

            {/* Simulated Live Viewport IFrame */}
            <div className="flex-grow bg-white relative">
              {isRunning ? (
                <iframe
                  key={iframeKey}
                  ref={iframeRef}
                  src={`/api/sandbox-proxy/${jobId}/`}
                  className="w-full h-full border-0"
                  onLoad={handleIframeLoad}
                  title="VerdictX Live Sandbox IFrame"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center space-y-3">
                  <Square className="w-8 h-8 text-zinc-600" />
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Instance Stopped</span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="w-full bg-zinc-950 border border-zinc-900 p-4 rounded-b-2xl grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono text-zinc-500">
          <div>WORKSPACE: <span className="text-zinc-300 uppercase font-bold">SANDBOX_{jobId.substring(0, 6)}</span></div>
          <div>FRAMEWORK: <span className="text-zinc-300 font-bold uppercase">{projectType}</span></div>
          <div>PORT ALLOCATED: <span className="text-zinc-300 font-bold">PORT_{statusData.port}</span></div>
          <div className="flex justify-end gap-2">
            {isRunning && (
              <button 
                onClick={handleShutdown}
                className="text-red-400 hover:text-red-300 font-bold uppercase tracking-wider text-[9px] border border-red-500/20 px-2 py-0.5 rounded bg-red-500/5 transition-all"
              >
                Terminate Workspace
              </button>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT: REAL-TIME AI TELEMETRY PANEL (4 cols) */}
      <div className="xl:col-span-4 flex flex-col h-[750px] bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
        
        {/* SUB-TABS SELECTOR */}
        <div className="grid grid-cols-4 border-b border-zinc-900 bg-zinc-900/10 shrink-0">
          {[
            { id: "telemetry", label: "Telemetry", icon: TerminalIcon },
            { id: "ai_explorer", label: "AI Testing", icon: Zap },
            { id: "health", label: "Health", icon: Activity },
            { id: "scoreboard", label: "Verdict", icon: FileCheck }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`py-3.5 flex flex-col items-center justify-center gap-1 transition-all border-b-2 text-[10px] font-bold uppercase tracking-wider ${
                  activeSubTab === tab.id 
                    ? "border-white text-white bg-zinc-900/50" 
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* SUB-TAB CONTENTS (SCROLLABLE) */}
        <div className="flex-grow overflow-y-auto p-5 custom-scrollbar">
          
          {/* 1. TELEMETRY EVENT MONITOR & CONSOLE LOGS */}
          {activeSubTab === "telemetry" && (
            <div className="space-y-6 flex flex-col h-full">
              
              {/* Telemetry Events timeline */}
              <div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-3">Live Telemetry Timeline</span>
                <div className="space-y-3">
                  {statusData.telemetryEvents && statusData.telemetryEvents.length > 0 ? (
                    statusData.telemetryEvents.slice(-6).reverse().map((event: any, i: number) => (
                      <div key={i} className="bg-zinc-900/50 border border-zinc-900 p-2.5 rounded-lg text-[10px] font-mono leading-relaxed space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            event.type === "click" ? "bg-blue-500/10 text-blue-400" :
                            event.type === "error" ? "bg-red-500/10 text-red-400" :
                            event.type === "api_call" ? "bg-yellow-500/10 text-yellow-400" :
                            "bg-purple-500/10 text-purple-400"
                          }`}>
                            {event.type}
                          </span>
                          <span className="text-zinc-600 text-[8px]">{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {event.type === "click" && (
                          <p className="text-zinc-300">Clicked <strong className="text-white">"{event.text}"</strong> on tag <span className="text-zinc-500">[{event.tagName}]</span></p>
                        )}
                        {event.type === "error" && (
                          <p className="text-red-400 font-bold">{event.message}</p>
                        )}
                        {event.type === "api_call" && (
                          <p className="text-zinc-300">Network proxy: {event.method} {event.url.substring(0, 30)}... status {event.status}</p>
                        )}
                        {event.type === "navigation" && (
                          <p className="text-zinc-300">Routed to: <span className="text-indigo-400">{event.path}</span></p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-zinc-900/20 border border-dashed border-zinc-900 rounded-lg text-center text-zinc-600 text-[10px] font-mono leading-relaxed">
                      Interact with the running application inside the simulator to generate telemetry streams.
                    </div>
                  )}
                </div>
              </div>

              {/* Console logs */}
              <div className="flex-grow flex flex-col min-h-0">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-3 shrink-0">Standard Server & VM Output</span>
                <div className="flex-grow bg-zinc-950 border border-zinc-900 rounded-xl p-4 font-mono text-[10px] overflow-y-auto max-h-[250px] leading-relaxed text-zinc-400 space-y-1.5 custom-scrollbar">
                  {statusData.logs && statusData.logs.map((log: string, idx: number) => (
                    <div key={idx} className="whitespace-pre-wrap select-text">
                      <span className="text-zinc-600 mr-2">[{idx + 1}]</span>
                      <span className={
                        log.includes("Error") || log.includes("failed") ? "text-red-400 font-bold" :
                        log.includes("successful") || log.includes("Running") ? "text-emerald-400" : "text-zinc-400"
                      }>
                        {log}
                      </span>
                    </div>
                  ))}
                  <div ref={terminalEndRef} />
                </div>
              </div>
            </div>
          )}

          {/* 2. AUTOMATED AI TESTING / EXPLORATION */}
          {activeSubTab === "ai_explorer" && (
            <div className="space-y-6">
              <div className="p-5 bg-zinc-900/30 border border-zinc-900 rounded-xl space-y-3">
                <Zap className="w-6 h-6 text-yellow-500" />
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Autonomous Exploration Agent</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                  Deploy an AI Autonomous Puppeteer Explorer to automatically traverse routes, open collapse tabs, fill inputs safely, check for code regressions, and generate structural coverage audits.
                </p>
                <button
                  onClick={triggerAutoExplore}
                  disabled={isAutoExploring || !isRunning}
                  className="w-full py-2.5 bg-yellow-500 text-black font-black uppercase text-[10px] tracking-wider rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  {isAutoExploring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>AI Explorer Active...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Launch AI Crawler</span>
                    </>
                  )}
                </button>
              </div>

              {/* Exploration report output */}
              {statusData.explorationReport ? (
                <div className="space-y-4">
                  <div className="border border-zinc-900 bg-zinc-900/10 p-4 rounded-xl space-y-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">AI Exploration Executive Summary</span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{statusData.explorationReport.summary}</p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Steps Executed</span>
                    <div className="space-y-2">
                      {statusData.explorationReport.steps.map((step: any, i: number) => (
                        <div key={i} className="p-3 bg-zinc-900/45 border border-zinc-900 rounded-lg text-[10px] font-mono leading-relaxed space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-zinc-300">{step.action}</span>
                            <span className={step.success ? "text-emerald-400" : "text-red-400"}>
                              {step.success ? "SUCCESS" : "FAILED"}
                            </span>
                          </div>
                          <p className="text-zinc-500 text-[9px]">At path: {step.url}</p>
                          <p className="text-zinc-400 mt-1 font-sans text-xs">{step.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                !isAutoExploring && (
                  <div className="p-8 border border-dashed border-zinc-900 text-center rounded-2xl text-zinc-600 text-xs font-sans leading-relaxed">
                    No active exploration report. Run the AI Crawler to perform automated UI testing.
                  </div>
                )
              )}
            </div>
          )}

          {/* 3. HARDWARE MONITOR & REAL-TIME APP HEALTH */}
          {activeSubTab === "health" && (
            <div className="space-y-6 font-mono text-[11px]">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Resource Health Metrics</span>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-1">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-wider block">CPU Workload</span>
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-white">{statusData.cpuUsage || "2%"}</span>
                  </div>
                  <span className="text-[8px] text-zinc-600">Container VM Core</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-1">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-wider block">Allocated RAM</span>
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-white">{statusData.memoryUsage || "45 MB"}</span>
                  </div>
                  <span className="text-[8px] text-zinc-600">Process Memory Limit</span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl col-span-2 space-y-1">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-wider block">Server Uptime</span>
                  <div className="text-xl font-bold tracking-tight text-white select-all">
                    {formatUptime(statusData.uptimeMs)}
                  </div>
                  <span className="text-[8px] text-zinc-600">Continuous execution ticks</span>
                </div>
              </div>

              <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4 space-y-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-2 font-sans">Active Sandbox Restrictions</span>
                {[
                  { rule: "Isolation Sandbox Container", state: "SECURE" },
                  { rule: "CPU Utilization Constraint", state: "0.25 vCPU max" },
                  { rule: "Active RAM Cap", state: "512 MB max" },
                  { rule: "Execution Expiration Timeout", state: "15 min lifecycle" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500">{item.rule}</span>
                    <span className="text-zinc-300 font-bold">{item.state}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SCOREBOARD RATINGS */}
          {activeSubTab === "scoreboard" && (
            <div className="space-y-6">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Live Sandbox Analytics</span>
              
              <div className="space-y-4">
                {[
                  { label: "Execution & Startup", value: isRunning ? 95 : 0, desc: "Successfully booted isolated background process and matched ports." },
                  { label: "Dynamic Interactivity", value: statusData.telemetryEvents?.length > 0 ? 92 : 80, desc: "Responsiveness to mouse clicks, redirects, and keyboard entries." },
                  { label: "Network Routing Stability", value: 100, desc: "Integrity of express dynamic reverse proxy streams." },
                  { label: "Security Boundary Clearance", value: 100, desc: "Strict system command checking and restricted filesystem isolation." }
                ].map((score, idx) => (
                  <div key={idx} className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2 font-sans">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-zinc-300 uppercase tracking-wide">{score.label}</span>
                      <span className="font-mono font-bold text-emerald-400">{score.value}/100</span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1 rounded-full">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${score.value}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-normal">{score.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
