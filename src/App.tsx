import { useState } from "react";
import { Navbar, Hero, Footer } from "./components/Layout";
import { InputPanel, Dashboard, type VerdictReport } from "./components/AppUI";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<VerdictReport | null>(null);
  const [screenshots, setScreenshots] = useState<any | null>(null);
  const [sitemap, setSitemap] = useState<string[] | null>(null);
  const [projectType, setProjectType] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeRepoUrl, setActiveRepoUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeText = async (data: { idea: string; problem: string; users: string; solution: string; githubSummary: string }) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setScreenshots(null);
    setSitemap(null);
    setProjectType(null);
    setActiveJobId(null);
    setActiveRepoUrl("");

    try {
      const response = await fetch("/api/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process text appraisal.");
      }

      const result = await response.json();
      setAnalysis(result);
      
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Thesis appraisal halted. Please check your inputs and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeRepo = async (repoUrl: string, onProgress: (job: any) => void) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setScreenshots(null);
    setSitemap(null);
    setProjectType(null);
    setActiveJobId(null);
    setActiveRepoUrl(repoUrl);

    try {
      const startRes = await fetch("/api/analyze-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      });

      if (!startRes.ok) {
        const errorData = await startRes.json();
        throw new Error(errorData.error || "Failed to launch execution engine.");
      }

      const { jobId } = await startRes.json();
      setActiveJobId(jobId);

      return new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/jobs/${jobId}`);
            if (!statusRes.ok) {
              clearInterval(interval);
              setIsLoading(false);
              const err = new Error("Failed to poll active job status.");
              setError(err.message);
              reject(err);
              return;
            }

            const job = await statusRes.json();
            onProgress(job);

            if (job.status === "completed") {
              clearInterval(interval);
              setAnalysis(job.result);
              setScreenshots(job.screenshots);
              setSitemap(job.sitemap);
              setProjectType(job.projectType);
              setIsLoading(false);
              setTimeout(() => {
                document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
              }, 100);
              resolve();
            } else if (job.status === "failed") {
              clearInterval(interval);
              setIsLoading(false);
              const err = new Error(job.error || "Live cloning or execution failed.");
              setError(err.message);
              reject(err);
            }
          } catch (err: any) {
            clearInterval(interval);
            setIsLoading(false);
            setError(err.message || "An unexpected connection issue occurred.");
            reject(err);
          }
        }, 2000);
      });
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || "Failed to start clone job.");
      throw err;
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 bg-brand-bg text-white">
      <Navbar />
      
      <main className="flex-grow">
        <Hero />
        
        <InputPanel 
          onAnalyzeText={handleAnalyzeText} 
          onAnalyzeRepo={handleAnalyzeRepo}
          isLoading={isLoading} 
        />

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-md mx-auto mt-4 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 text-center text-xs font-mono"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {analysis && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Dashboard 
                analysis={analysis} 
                screenshots={screenshots}
                sitemap={sitemap || undefined}
                projectType={projectType || undefined}
                jobId={activeJobId || undefined}
                repoUrl={activeRepoUrl || undefined}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multi-Perspective feature overview when idle */}
        {!analysis && !isLoading && (
          <section className="py-24 border-t border-zinc-900" id="features">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4 uppercase tracking-tight">Multi-Perspective Evaluation</h2>
                <p className="text-zinc-500 max-w-xl mx-auto text-sm leading-relaxed">
                  Every proposal is evaluated across six foundational indicators by VerdictX's autonomous panel.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { title: "Technical Feasibility", desc: "Rigorous appraisal of frameworks, structural layout, and debt risk." },
                  { title: "Market Viability", desc: "Growth options, monetization, target audiences, and competitor maps." },
                  { title: "Integrity Level", desc: "A comparison of README claims with real visual running implementations." },
                ].map((f, i) => (
                  <div key={i} className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 transition-all">
                    <h3 className="text-sm font-bold mb-3 uppercase tracking-wider text-zinc-300">{f.title}</h3>
                    <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Decorative gradients */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-20 overflow-hidden">
        <div className="absolute top-[25%] right-[-10%] w-[35%] h-[35%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[25%] left-[-10%] w-[35%] h-[35%] bg-indigo-500/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
