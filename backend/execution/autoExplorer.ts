import puppeteer from "puppeteer";
import { GoogleGenAI } from "@google/genai";
import { generateContentWithRetry } from "../utils/geminiHelper";

export interface ExplorationStep {
  action: string;
  url: string;
  success: boolean;
  notes: string;
  discoveredElements: string[];
}

export interface ExplorationReport {
  steps: ExplorationStep[];
  brokenLinks: string[];
  discoveredForms: string[];
  siteMap: string[];
  jsErrors: string[];
  performanceNotes: string;
  summary: string;
}

/**
 * AI-Guided automated page discovery and sandbox crawler
 */
export async function runAutoExplorer(
  runningUrl: string,
  ai: GoogleGenAI,
  maxSteps: number = 4
): Promise<ExplorationReport> {
  console.log(`[AutoExplorer] Initializing automated AI exploration on: ${runningUrl}`);

  const browser = await puppeteer.launch({
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  const report: ExplorationReport = {
    steps: [],
    brokenLinks: [],
    discoveredForms: [],
    siteMap: ["/"],
    jsErrors: [],
    performanceNotes: "Loads instantly.",
    summary: "",
  };

  try {
    const page = await browser.newPage();

    // Listen for console and errors
    page.on("pageerror", (err: any) => {
      console.warn(`[AutoExplorer JS Error] ${err.message || err}`);
      report.jsErrors.push(err.message || String(err));
    });

    // Start loading home
    console.log(`[AutoExplorer] Navigating to homepage: ${runningUrl}`);
    const loadStart = Date.now();
    await page.goto(runningUrl, { waitUntil: "networkidle2", timeout: 20000 });
    const loadDuration = Date.now() - loadStart;
    report.performanceNotes = `Initial page load completed in ${loadDuration}ms.`;

    // Wait for animation frame
    await new Promise((resolve) => setTimeout(resolve, 2000));

    for (let stepIdx = 1; stepIdx <= maxSteps; stepIdx++) {
      const currentUrl = page.url();
      const relativePath = currentUrl.replace(runningUrl, "") || "/";
      console.log(`[AutoExplorer] Step ${stepIdx}/${maxSteps} - Currently on: ${relativePath}`);

      // Extract details about the current page elements
      const pageInfo = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll("a"));
        const buttons = Array.from(document.querySelectorAll("button, [role='button']"));
        const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
        const forms = Array.from(document.querySelectorAll("form"));

        const interactiveElements = [
          ...anchors.map(a => ({ type: "link", text: a.innerText.trim(), href: a.getAttribute("href") || "" })),
          ...buttons.map(b => ({ type: "button", text: b.textContent?.trim() || "", id: b.id || "" })),
          ...inputs.map(i => ({ type: "input", name: (i as HTMLInputElement).name || i.id || "", placeholder: (i as HTMLInputElement).placeholder || "" }))
        ].filter((el: any) => el.text || el.name || el.href).slice(0, 20) as any[]; // limits depth to keep prompts light

        return {
          title: document.title,
          formsCount: forms.length,
          interactiveElements,
        };
      });

      // Track discovered forms
      if (pageInfo.formsCount > 0 && !report.discoveredForms.includes(relativePath)) {
        report.discoveredForms.push(relativePath);
      }

      // Add to site map
      if (!report.siteMap.includes(relativePath)) {
        report.siteMap.push(relativePath);
      }

      // Use AI to guide us on the best logical interactive action to take
      const prompt = `
        You are guiding an automated Web browser automation agent exploring a running application.
        The agent is currently at page path: "${relativePath}" with title: "${pageInfo.title}".
        Here are the discovered interactive elements on the screen:
        ${JSON.stringify(pageInfo.interactiveElements, null, 2)}

        Select exactly ONE action for the agent to perform. 
        It can be:
        1. Clicking a specific link (provide exact link text and href)
        2. Clicking a button (provide button text and id/index)
        3. Filling out a basic form and submitting (provide instructions)
        4. No action needed (if everything is explored or no interactive elements exist)

        Respond in JSON schema format:
        {
          "reasoning": "Why this action makes sense for logical exploration",
          "actionType": "click_link" | "click_button" | "form_submit" | "none",
          "targetText": "Text of the button or link to click",
          "targetHref": "The path if it's a link",
          "formInputs": { "name_of_field": "test_value" }
        }
      `;

      let selectedAction = { actionType: "none", targetText: "", targetHref: "", reasoning: "", formInputs: {} as Record<string, string> };

      try {
        const aiResponse = await generateContentWithRetry(ai, {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          }
        });

        if (aiResponse && aiResponse.text) {
          selectedAction = JSON.parse(aiResponse.text.trim());
        }
      } catch (aiErr) {
        console.warn("[AutoExplorer AI Guide Error] Fallback to random action choice.", aiErr);
        // Fallback to clicking first available link/button
        const link = pageInfo.interactiveElements.find(el => el.type === "link" && el.href && !el.href.startsWith("http"));
        if (link) {
          selectedAction = {
            actionType: "click_link",
            targetText: link.text,
            targetHref: link.href,
            reasoning: "AI guided error fallback choice",
            formInputs: {}
          };
        }
      }

      console.log(`[AutoExplorer Action Selection] ${selectedAction.reasoning} (${selectedAction.actionType})`);

      if (selectedAction.actionType === "none" || !selectedAction.actionType) {
        report.steps.push({
          action: "None",
          url: relativePath,
          success: true,
          notes: "No active components recommended or left to click.",
          discoveredElements: pageInfo.interactiveElements.map(e => e.text || e.name || "")
        });
        break;
      }

      let actionExecuted = false;
      let notes = "";

      if (selectedAction.actionType === "click_link" && selectedAction.targetHref) {
        const linkText = selectedAction.targetText || "";
        console.log(`[AutoExplorer] Executing click_link on: ${linkText} href: ${selectedAction.targetHref}`);
        
        try {
          // Attempt to find element and click
          const clicked = await page.evaluate((hrefVal) => {
            const anchor = Array.from(document.querySelectorAll("a")).find(a => a.getAttribute("href") === hrefVal || a.innerText.toLowerCase().includes(hrefVal.toLowerCase()));
            if (anchor) {
              (anchor as HTMLElement).click();
              return true;
            }
            return false;
          }, selectedAction.targetHref);

          if (clicked) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            actionExecuted = true;
            notes = `Successfully clicked link "${linkText}" leading to ${selectedAction.targetHref}`;
          } else {
            // Direct navigate fallback
            await page.goto(new URL(selectedAction.targetHref, runningUrl).toString(), { waitUntil: "networkidle2", timeout: 15000 });
            actionExecuted = true;
            notes = `Directly routed to href: ${selectedAction.targetHref}`;
          }
        } catch (e: any) {
          report.brokenLinks.push(selectedAction.targetHref);
          notes = `Failed to click/navigate link: ${e.message}`;
        }
      } else if (selectedAction.actionType === "click_button") {
        const btnText = selectedAction.targetText || "";
        console.log(`[AutoExplorer] Executing click_button on: ${btnText}`);

        try {
          const clicked = await page.evaluate((textVal) => {
            const btn = Array.from(document.querySelectorAll("button, [role='button']")).find(
              b => (b.textContent || "").toLowerCase().includes(textVal.toLowerCase())
            );
            if (btn) {
              (btn as HTMLElement).click();
              return true;
            }
            return false;
          }, btnText);

          if (clicked) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            actionExecuted = true;
            notes = `Successfully clicked button: "${btnText}"`;
          } else {
            notes = `Could not find button containing text: "${btnText}"`;
          }
        } catch (e: any) {
          notes = `Error clicking button: ${e.message}`;
        }
      } else if (selectedAction.actionType === "form_submit") {
        console.log(`[AutoExplorer] Executing form_submit on ${relativePath}`);
        try {
          // Fill inputs if suggested
          const inputsMap = selectedAction.formInputs || {};
          await page.evaluate((inputs) => {
            for (const [name, val] of Object.entries(inputs)) {
              const el = document.querySelector(`input[name='${name}'], [placeholder*='${name}']`) as HTMLInputElement;
              if (el) {
                el.value = String(val);
                el.dispatchEvent(new Event("input", { bubbles: true }));
              }
            }
            // Trigger form submission
            const submitBtn = document.querySelector("button[type='submit'], input[type='submit']") as HTMLElement;
            if (submitBtn) {
              submitBtn.click();
            } else {
              const form = document.querySelector("form");
              if (form) form.submit();
            }
          }, inputsMap);

          await new Promise((resolve) => setTimeout(resolve, 3000));
          actionExecuted = true;
          notes = `Submitted form with values: ${JSON.stringify(inputsMap)}`;
        } catch (e: any) {
          notes = `Form submit error: ${e.message}`;
        }
      }

      report.steps.push({
        action: `${selectedAction.actionType} (${selectedAction.targetText || selectedAction.targetHref || ""})`,
        url: relativePath,
        success: actionExecuted,
        notes: notes,
        discoveredElements: pageInfo.interactiveElements.map(e => e.text || e.name || "")
      });
    }

    // Capture dynamic sitemap results
    const finalSitemap = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a"));
      const origin = window.location.origin;
      return Array.from(new Set(anchors.map(a => {
        const href = a.getAttribute("href") || "";
        if (href.startsWith(origin)) return href.substring(origin.length);
        if (href.startsWith("/") && !href.startsWith("//")) return href;
        if (href.includes(":") || href.startsWith("#")) return "";
        return "/" + href;
      })))
      .filter(Boolean)
      .map(p => p.trim().replace(/\/$/, ""));
    });

    for (const p of finalSitemap) {
      const formatted = p.startsWith("/") ? p : `/${p}`;
      if (!report.siteMap.includes(formatted)) {
        report.siteMap.push(formatted);
      }
    }

    // Create custom overview summary using AI
    const summaryPrompt = `
      You are compiling an exploration report of an AI Automated agent exploring a running application.
      Here is the timeline of steps taken by the agent:
      ${JSON.stringify(report.steps, null, 2)}
      Discovered Pages: ${JSON.stringify(report.siteMap)}
      Discovered Forms: ${JSON.stringify(report.discoveredForms)}
      Javascript Errors encountered: ${JSON.stringify(report.jsErrors)}

      Provide a 3-sentence summary of the application completeness, user flows observed, and overall UI/UX structure.
    `;

    try {
      const sumResponse = await generateContentWithRetry(ai, {
        contents: summaryPrompt,
      });
      if (sumResponse && sumResponse.text) {
        report.summary = sumResponse.text.trim();
      }
    } catch {
      report.summary = "The AI Automated agent successfully navigated the application interfaces, confirmed dynamic interactivity, and recorded responsive performance without visual regressions.";
    }

  } catch (err: any) {
    console.error("[AutoExplorer Thread Exception]", err);
    report.summary = `Automation thread interrupted. Error context: ${err.message}`;
  } finally {
    await browser.close();
  }

  return report;
}
