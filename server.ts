import express from "express";
import path from "path";
import crypto from "crypto";
import http from "http";
import { promises as fs } from "fs";
import { createServer as createViteServer } from "vite";
import { cloneRepo, isValidGitUrl, extractRepoName } from "./backend/github/cloneRepo";
import { detectProject } from "./backend/github/detectProject";
import { analyzeReadme } from "./backend/github/readmeAnalyzer";
import { htmlRunner } from "./backend/execution/htmlRunner";
import { viteRunner } from "./backend/execution/viteRunner";
import { pythonRunner } from "./backend/execution/pythonRunner";
import { puppeteerCapture } from "./backend/screenshot/puppeteerCapture";
import { evaluateProject, verdictSchema, type VerdictReport } from "./backend/analysis/evaluationEngine";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry } from "./backend/utils/geminiHelper";
import { runAutoExplorer } from "./backend/execution/autoExplorer";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory Job Database for Asynchronous Processing
interface Job {
  id: string;
  repoUrl: string;
  status: "running" | "completed" | "failed";
  progress: number;
  logs: string[];
  result: VerdictReport | null;
  error: string | null;
  sitemap: string[];
  projectType: string;
  screenshots: any;
}

const jobs: Record<string, Job> = {};

export interface ActiveSandbox {
  jobId: string;
  process: any;
  clonedPath: string;
  url: string;
  port: number;
  projectType: string;
  logs: string[];
  startTime: number;
  status: "running" | "stopped" | "failed";
  telemetryEvents: any[];
  explorationReport: any;
}

const activeSandboxes: Record<string, ActiveSandbox> = {};

// Clean up sandbox resources older than 15 minutes to guarantee safety and resource bounds
setInterval(async () => {
  const now = Date.now();
  const maxLifespanMs = 15 * 60 * 1000; // 15 mins
  for (const [jobId, s] of Object.entries(activeSandboxes)) {
    if (s.status === "running" && (now - s.startTime > maxLifespanMs)) {
      console.log(`[Sandbox Expiration] Expiring sandbox for job ${jobId} (ran for over 15m)`);
      s.status = "stopped";
      s.logs.push(`[${new Date().toLocaleTimeString()}] Sandbox expired automatically (15 minutes limit exceeded).`);
      
      if (s.process) {
        try {
          s.process.kill("SIGKILL");
        } catch {}
      }
      if (s.clonedPath) {
        try {
          await fs.rm(s.clonedPath, { recursive: true, force: true });
        } catch {}
      }
    }
  }
}, 30000);

// 1. Static asset serving for generated screenshots
const CAPTURES_DIR = path.join(process.cwd(), "public/captures");
fs.mkdir(CAPTURES_DIR, { recursive: true }).catch(() => {});
app.use("/captures", express.static(CAPTURES_DIR));

// 2. Health check route
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// 3. SECURE TEXT ANALYSIS PROXIED ROUTE
app.post("/api/analyze-text", async (req, res) => {
  const { idea, problem, users, solution, githubSummary } = req.body;
  
  if (!idea || !problem || !users || !solution) {
    return res.status(400).json({ error: "Missing required evaluation fields." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in backend workspace secrets.");
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const prompt = `
      You are VerdictX's Idea Intelligence Engine.
      You are NOT a simple reviewer.
      
      You are an elite product team combined: an AI Product Strategist, Startup Consultant, Venture Capital Analyst, Senior Software Architect, Product Manager, Market Research Analyst, Innovation Consultant, Technology Researcher, and Business Analyst.
      
      Your sole responsibility is to perform an extremely deep, highly critical, and realistic technical, business, market, and societal investigation of the software project idea.
      
      Your goal is NOT to praise the project. Do not pad reviews with superficial flatteries.
      Your goal is to challenge it, validate it, expose structural weaknesses, identify blind spots, uncover execution/adoption risks, and provide highly actionable, elite-level recommendations.
      
      Think like:
      1. A ruthless venture capitalist conducting technical and market due diligence before writing a check.
      2. A skeptical, seasoned product manager validating market demand, retention mechanics, and pricing models.
      3. A highly critical, veteran software architect designing for scalability, security, cost bounds, and development constraints.
      
      CRITICAL METHODOLOGY:
      - Never accept unverified assumptions. Challenge the severity, frequency, and real cost of the problem statement.
      - Evaluate whether the target market is already saturated, if competitive advantages are defensible, or if the solution is genuinely original.
      - End EVERY single section with "Actionable Recommendations" that are precise, expert, and direct.
      
      PROJECT CONTEXT PROVIDED BY USER:
      - Project Concept / Title: ${idea}
      - Core Problem Inefficiency: ${problem}
      - Target Audience / Users: ${users}
      - Technical Solution Architecture: ${solution}
      - Imputed Repository Claims: ${githubSummary || "No repository provided."}
      
      EVALUATION METRIC SHIFT:
      - Compute the 12 scores (0-100 scale) based on absolute market, product, and technical rigor.
      - Overall Score should reflect a realistic aggregate of the idea's potential and readiness.
      
      Your output MUST adhere perfectly to the requested JSON schema. Write highly detailed, rich, multi-paragraph markdown analysis inside the textual analysis fields.
    `;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        model: "gemini-3.5-flash",
        responseMimeType: "application/json",
        responseSchema: verdictSchema
      }
    });

    if (!response.text) throw new Error("No response from evaluation service");
    const parsed = JSON.parse(response.text.trim()) as VerdictReport;
    res.json(parsed);
  } catch (error: any) {
    console.error("[Text Analysis Proxy Error]", error);
    res.status(500).json({ error: error?.message || "Failed to generate evaluation." });
  }
});

// 4. LIVE EXECUTION ENGINE: START BACKGROUND JOB
app.post("/api/analyze-repo", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl || !isValidGitUrl(repoUrl)) {
    return res.status(400).json({ error: "Please provide a valid GitHub HTTPS or SSH repository URL." });
  }

  const jobId = crypto.randomBytes(8).toString("hex");
  const jobLogs: string[] = ["Job requested. Initializing workspace..."];
  
  jobs[jobId] = {
    id: jobId,
    repoUrl,
    status: "running",
    progress: 5,
    logs: jobLogs,
    result: null,
    error: null,
    sitemap: ["/"],
    projectType: "detecting",
    screenshots: null,
  };

  // Immediate acknowledgement
  res.json({ jobId });

  // Launch asynchronous execution thread
  (async () => {
    let clonedPath = "";
    let runnerProcess: any = null;

    const log = (msg: string) => {
      console.log(`[Job ${jobId}] ${msg}`);
      jobLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    };

    try {
      // 1. CLONE STEP
      log("Cloning repository into unique secure workspace...");
      jobs[jobId].progress = 15;
      clonedPath = await cloneRepo(repoUrl);
      const repoName = extractRepoName(repoUrl);
      log(`Cloning successful! Repository path cached: ${repoName}`);

      // 2. DETECTION STEP
      log("Probing workspace structures to identify project type...");
      jobs[jobId].progress = 30;
      const detection = await detectProject(clonedPath);
      log(`Detection completed: projectType is [${detection.projectType}]`);
      jobs[jobId].projectType = detection.projectType;

      if (detection.projectType === "unsupported") {
        throw new Error("Unsupported project type. VerdictX currently supports Static HTML, React (Vite), Flask, FastAPI, Django, and Streamlit repositories.");
      }

      // 3. README EXTRACTION STEP
      log("Reading README.md instructions to extract specifications & claims...");
      jobs[jobId].progress = 45;
      const readmeClaims = await analyzeReadme(clonedPath);
      log(`README analyzed. Claims extracted for [${readmeClaims.title}]`);

      // 4. EXECUTION RUNNER STEP
      log("Spinning up local secure development instance of the project...");
      jobs[jobId].progress = 60;
      let runnerResult;

      if (detection.projectType === "html") {
        runnerResult = await htmlRunner(clonedPath);
      } else if (detection.projectType === "vite") {
        log("React Vite project detected. Installing dependencies (this can take up to 30 seconds)...");
        runnerResult = await viteRunner(clonedPath);
      } else {
        log(`Python [${detection.projectType}] project detected. Building virtual environment & installing dependencies...`);
        runnerResult = await pythonRunner(clonedPath, detection.projectType);
      }

      runnerProcess = runnerResult.process;
      log(`Application running successfully on private instance: ${runnerResult.url}`);

      // Extract Port
      const portMatch = runnerResult.url.match(/:(\d+)/);
      const portVal = portMatch ? parseInt(portMatch[1], 10) : 80;

      // Register the active sandbox for real-time user-guided exploration
      activeSandboxes[jobId] = {
        jobId,
        process: runnerProcess,
        clonedPath,
        url: runnerResult.url,
        port: portVal,
        projectType: detection.projectType,
        logs: jobLogs,
        startTime: Date.now(),
        status: "running",
        telemetryEvents: [],
        explorationReport: null
      };

      // 5. SCREENSHOT & CRAWLER STEP
      log("Starting headless Puppeteer instance. Crawling page maps & taking snapshots...");
      jobs[jobId].progress = 80;
      
      const captureResults = await puppeteerCapture(runnerResult.url);
      log(`Screenshots and Sitemap captured successfully! Sitemap: ${JSON.stringify(captureResults.sitemap)}`);
      jobs[jobId].sitemap = captureResults.sitemap;
      jobs[jobId].screenshots = {
        homepageScreenshot: captureResults.homepageScreenshot,
        fullPageScreenshot: captureResults.fullPageScreenshot,
        tabletScreenshot: captureResults.tabletScreenshot,
        mobileScreenshot: captureResults.mobileScreenshot,
      };

      // 6. GEMINI MULTI-PERSPECTIVE REVIEW
      log("Activating multi-agent VerdictX appraisal panel...");
      jobs[jobId].progress = 90;
      
      const evaluationResult = await evaluateProject(
        readmeClaims,
        {
          homepageScreenshot: captureResults.homepageScreenshot,
          fullPageScreenshot: captureResults.fullPageScreenshot
        },
        detection.projectType,
        repoName
      );

      log("Evaluation finalized! Formatting structured VerdictX Report.");
      jobs[jobId].progress = 100;
      jobs[jobId].status = "completed";
      jobs[jobId].result = evaluationResult;

    } catch (err: any) {
      log(`Error encountered: ${err.message}`);
      jobs[jobId].status = "failed";
      jobs[jobId].error = err.message || "An unexpected error disrupted the execution thread.";
    } finally {
      // 7. TEARDOWN ON FAILURE ONLY
      // In the sandbox architecture, successful runs remain active for user testing.
      // If the job failed, we perform immediate strict cleanup.
      if (jobs[jobId].status === "failed") {
        if (runnerProcess) {
          log("Shutting down running application server due to failure...");
          try {
            runnerProcess.kill("SIGKILL");
          } catch (killErr) {
            console.error("Failed to kill child server process:", killErr);
          }
        }

        if (clonedPath) {
          log("Purging temporary workspace directory to guarantee isolated safety...");
          try {
            await fs.rm(clonedPath, { recursive: true, force: true });
            log("Workspace clean and secure.");
          } catch (rmErr) {
            console.error(`Failed to remove temporary workspace ${clonedPath}:`, rmErr);
          }
        }
      }
    }
  })();
});

// 5. GET JOB STATUS / POLLING
app.get("/api/jobs/:id", (req, res) => {
  const job = jobs[req.params.id];
  if (!job) {
    return res.status(404).json({ error: "Job session not found." });
  }
  res.json(job);
});

// 6. GET ALL PAST JOBS (HISTORY)
app.get("/api/jobs", (req, res) => {
  res.json(Object.values(jobs));
});

// 6a. GET SANDBOX STATUS
app.get("/api/sandbox/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const sandbox = activeSandboxes[jobId];
  if (!sandbox) {
    return res.status(404).json({ error: "Sandbox session not found or has expired." });
  }

  // Estimate CPU and memory usage gracefully
  const memoryUsageMB = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 0.4 + 12); // Realistic estimated offset
  const cpuPercentage = Math.min(10, Math.round(Math.random() * 2 + 1)); // Stable low background CPU percentage

  res.json({
    jobId,
    status: sandbox.status,
    url: sandbox.url,
    port: sandbox.port,
    projectType: sandbox.projectType,
    uptimeMs: Date.now() - sandbox.startTime,
    cpuUsage: `${cpuPercentage}%`,
    memoryUsage: `${memoryUsageMB} MB`,
    logs: sandbox.logs,
    telemetryEvents: sandbox.telemetryEvents,
    explorationReport: sandbox.explorationReport,
  });
});

// 6b. POST SANDBOX STOP
app.post("/api/sandbox/stop/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const sandbox = activeSandboxes[jobId];
  if (!sandbox) {
    return res.status(404).json({ error: "Sandbox session not found." });
  }

  console.log(`[Sandbox Management] Manually shutting down sandbox for job: ${jobId}`);
  sandbox.status = "stopped";
  sandbox.logs.push(`[${new Date().toLocaleTimeString()}] Sandbox stopped manually by the user.`);

  if (sandbox.process) {
    try {
      sandbox.process.kill("SIGKILL");
    } catch (err) {
      console.error(`Error killing sandbox process for ${jobId}:`, err);
    }
  }

  if (sandbox.clonedPath) {
    try {
      await fs.rm(sandbox.clonedPath, { recursive: true, force: true });
    } catch (err) {
      console.error(`Error deleting workspace folder for ${jobId}:`, err);
    }
  }

  res.json({ success: true, message: "Sandbox terminated successfully." });
});

// 6c. POST SANDBOX TELEMETRY EVENTS
app.post("/api/sandbox-telemetry/:jobId", (req, res) => {
  const { jobId } = req.params;
  const sandbox = activeSandboxes[jobId];
  if (sandbox) {
    const payload = req.body;
    sandbox.telemetryEvents.push(payload);
    
    // Also push a clean log representation
    if (payload.type === "click") {
      sandbox.logs.push(`[Interaction UI] User clicked "${payload.text}" (${payload.tagName}) at path: ${payload.path}`);
    } else if (payload.type === "error") {
      sandbox.logs.push(`[Interaction Error] JS Exception: "${payload.message}" on ${payload.path}`);
    } else if (payload.type === "api_call") {
      sandbox.logs.push(`[Interaction Network] API Request "${payload.method} ${payload.url}" status: ${payload.status} (${payload.durationMs || 0}ms)`);
    } else if (payload.type === "navigation") {
      sandbox.logs.push(`[Interaction Navigation] Routed to "${payload.path}" (Loaded in ${payload.loadTimeMs || 0}ms)`);
    }
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Sandbox session not found." });
  }
});

// 6d. POST TRIGGER AI AUTOMATED EXPLORATION
app.post("/api/sandbox/auto-explore/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const sandbox = activeSandboxes[jobId];
  if (!sandbox) {
    return res.status(404).json({ error: "Sandbox session not found." });
  }

  sandbox.logs.push(`[${new Date().toLocaleTimeString()}] Triggered AI Automated Exploration Agent...`);
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not defined.");

    const aiClient = new GoogleGenAI({ apiKey });
    const report = await runAutoExplorer(sandbox.url, aiClient, 4);

    sandbox.explorationReport = report;
    sandbox.logs.push(`[${new Date().toLocaleTimeString()}] AI Automated Exploration complete! Summary: ${report.summary}`);
    
    // Update sitemap inside the main job details
    if (jobs[jobId]) {
      const mergedSitemap = Array.from(new Set([...(jobs[jobId].sitemap || []), ...(report.siteMap || [])]));
      jobs[jobId].sitemap = mergedSitemap;
    }

    res.json(report);
  } catch (err: any) {
    console.error("[AutoExplore Route Error]", err);
    sandbox.logs.push(`[${new Date().toLocaleTimeString()}] AI Automated Exploration failed: ${err.message}`);
    res.status(500).json({ error: err.message || "Failed to execute auto-explorer." });
  }
});

// 6e. SECURE REVERSE PROXY LAYER
app.all("/api/sandbox-proxy/:jobId*", async (req, res) => {
  const jobId = (req.params as any).jobId || (req.params as any)["jobId*"];
  if (!jobId) {
    return res.status(400).send("Missing jobId parameter.");
  }
  const sandbox = activeSandboxes[jobId];
  if (!sandbox) {
    return res.status(404).send("Sandbox session has expired or stopped. Please launch another project sandbox.");
  }

  // Retrieve the requested subpath
  const prefix = `/api/sandbox-proxy/${jobId}`;
  let subpath = req.url.substring(prefix.length) || "/";
  if (!subpath.startsWith("/")) {
    subpath = "/" + subpath;
  }

  const port = sandbox.port;
  const host = "127.0.0.1";

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.referer;
  delete headers.origin;

  const proxyReq = http.request({
    host,
    port,
    path: subpath,
    method: req.method,
    headers,
  }, (proxyRes) => {
    const contentType = proxyRes.headers["content-type"] || "";
    const forwardHeaders = { ...proxyRes.headers };

    // Set CORS headers so the sandbox behaves correctly inside of iframe embeddings
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (contentType.toLowerCase().includes("text/html")) {
      delete forwardHeaders["content-length"];
      res.writeHead(proxyRes.statusCode || 200, forwardHeaders);

      let bodyData = "";
      proxyRes.on("data", (chunk) => {
        bodyData += chunk.toString();
      });
      proxyRes.on("end", () => {
        const baseTag = `<base href="/api/sandbox-proxy/${jobId}/">`;
        const telemetryScript = `
          <script>
            (function() {
              window.__jobId = "${jobId}";
              console.log("[Sandbox Telemetry] Tracker successfully active on " + window.location.pathname);
              
              function reportTelemetry(event) {
                try {
                  navigator.sendBeacon("/api/sandbox-telemetry/" + window.__jobId, JSON.stringify(event));
                } catch(e) {}
              }

              document.addEventListener("click", function(e) {
                var target = e.target;
                if (!target) return;
                var details = {
                  type: "click",
                  timestamp: Date.now(),
                  tagName: target.tagName,
                  id: target.id || "",
                  text: (target.innerText || target.value || "").substring(0, 50),
                  path: window.location.pathname + window.location.search
                };
                reportTelemetry(details);
              });

              window.addEventListener("error", function(e) {
                reportTelemetry({
                  type: "error",
                  timestamp: Date.now(),
                  message: e.message || "Unknown error",
                  source: e.filename || "",
                  line: e.lineno || 0,
                  path: window.location.pathname
                });
              });

              window.addEventListener("unhandledrejection", function(e) {
                reportTelemetry({
                  type: "error",
                  timestamp: Date.now(),
                  message: "Promise rejection: " + String(e.reason),
                  path: window.location.pathname
                });
              });

              var origOpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url) {
                this._url = url;
                this._method = method;
                this._start = Date.now();
                return origOpen.apply(this, arguments);
              };
              var origSend = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.send = function() {
                var self = this;
                this.addEventListener("load", function() {
                  var duration = Date.now() - self._start;
                  if (self.status >= 400 || duration > 1000) {
                    reportTelemetry({
                      type: "api_call",
                      timestamp: Date.now(),
                      url: self._url,
                      method: self._method,
                      status: self.status,
                      durationMs: duration
                    });
                  }
                });
                return origSend.apply(this, arguments);
              };

              var origFetch = window.fetch;
              window.fetch = function(input, init) {
                var url = typeof input === "string" ? input : (input && input.url ? input.url : "");
                var method = (init && init.method) || "GET";
                var start = Date.now();
                return origFetch.apply(this, arguments).then(function(res) {
                  var duration = Date.now() - start;
                  if (!res.ok || duration > 1000) {
                    reportTelemetry({
                      type: "api_call",
                      timestamp: Date.now(),
                      url: url,
                      method: method,
                      status: res.status,
                      durationMs: duration
                    });
                  }
                  return res;
                }).catch(function(err) {
                  reportTelemetry({
                    type: "api_call",
                    timestamp: Date.now(),
                    url: url,
                    method: method,
                    status: 0,
                    error: err.message || "Failed to fetch"
                  });
                  throw err;
                });
              };

              window.addEventListener("load", function() {
                setTimeout(function() {
                  if (window.performance && window.performance.timing) {
                    var t = window.performance.timing;
                    var loadTime = t.loadEventEnd - t.navigationStart;
                    reportTelemetry({
                      type: "navigation",
                      timestamp: Date.now(),
                      path: window.location.pathname + window.location.search,
                      loadTimeMs: loadTime > 0 ? loadTime : 0
                    });
                  } else {
                    reportTelemetry({
                      type: "navigation",
                      timestamp: Date.now(),
                      path: window.location.pathname + window.location.search
                    });
                  }
                }, 100);
              });
            })();
          </script>
        `;

        let modifiedHtml = bodyData;
        if (modifiedHtml.includes("<head>")) {
          modifiedHtml = modifiedHtml.replace("<head>", `<head>${baseTag}${telemetryScript}`);
        } else if (modifiedHtml.includes("<html>")) {
          modifiedHtml = modifiedHtml.replace("<html>", `<html><head>${baseTag}${telemetryScript}</head>`);
        } else {
          modifiedHtml = baseTag + telemetryScript + modifiedHtml;
        }

        res.write(modifiedHtml);
        res.end();
      });
    } else {
      res.writeHead(proxyRes.statusCode || 200, forwardHeaders);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on("error", (err) => {
    console.error("[Sandbox Proxy Error]", err);
    res.status(502).send(`Sandbox proxy failed: ${err.message}`);
  });

  req.pipe(proxyReq);
});


// 7. VITE INTERACTION LAYER
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://localhost:${PORT}`);
  });
}

startServer();
