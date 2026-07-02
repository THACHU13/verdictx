import puppeteer from "puppeteer";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

export interface ScreenshotResults {
  homepageScreenshot: string; // Relative path to served desktop viewport
  fullPageScreenshot: string; // Relative path to served desktop full scroll
  tabletScreenshot: string; // Relative path to served tablet viewport
  mobileScreenshot: string; // Relative path to served mobile viewport
  sitemap: string[]; // Discovered internal routes
  metadata: {
    title: string;
    description?: string;
    width: number;
    height: number;
  };
}

const CAPTURES_DIR = path.resolve(process.cwd(), "public/captures");

/**
 * Automates headless browser interactions to load local projects and capture 
 * responsive viewports (Desktop, Tablet, Mobile) and perform page discovery.
 * 
 * @param runningUrl Port-specific local URL where the project is running.
 * @param timeoutMs Maximum timeframe allowed for loading and taking snapshots.
 */
export async function puppeteerCapture(runningUrl: string, timeoutMs: number = 35000): Promise<ScreenshotResults> {
  await fs.mkdir(CAPTURES_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "shell",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    // 1. Navigation & Page Load
    console.log(`[Puppeteer] Launching analysis of: ${runningUrl}`);
    await page.goto(runningUrl, {
      waitUntil: "networkidle2",
      timeout: timeoutMs,
    });

    // Wait for final dynamic layouts to settle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 2. Discover metadata
    const title = await page.title();
    const description = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]');
      return meta ? meta.getAttribute("content") : "";
    });

    // 3. Extract sitemap / internal links
    const sitemap = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a"));
      const origin = window.location.origin;
      
      const paths = anchors
        .map(a => {
          const href = a.getAttribute("href");
          if (!href) return "";
          
          try {
            // Check if absolute URL on same origin
            if (href.startsWith(origin)) {
              return href.substring(origin.length);
            }
            // Check if relative route
            if (href.startsWith("/") && !href.startsWith("//")) {
              return href;
            }
            // Ignore hashes, external links, mailto, etc.
            if (href.includes(":") || href.startsWith("#") || href.startsWith("//")) {
              return "";
            }
            return "/" + href;
          } catch {
            return "";
          }
        })
        .filter(Boolean);

      // Deduplicate and filter out standard subpaths
      const unique = Array.from(new Set(paths));
      return unique.map(u => u.trim().replace(/\/$/, "")).filter(u => u !== "");
    });

    // Ensure '/' is always in sitemap and sanitize the paths
    const cleanedSitemap = ["/", ...sitemap.map(p => p.startsWith("/") ? p : `/${p}`)].slice(0, 8);
    const uniqueSitemap = Array.from(new Set(cleanedSitemap));

    // 4. Captures
    const fileId = crypto.randomBytes(6).toString("hex");
    const desktopFilename = `desktop-${fileId}.png`;
    const fullFilename = `full-${fileId}.png`;
    const tabletFilename = `tablet-${fileId}.png`;
    const mobileFilename = `mobile-${fileId}.png`;

    // A. Desktop Viewport (1440x900)
    await page.setViewport({ width: 1440, height: 900 });
    const desktopPath = path.join(CAPTURES_DIR, desktopFilename);
    await page.screenshot({ path: desktopPath, fullPage: false });

    // B. Desktop Full Page
    const fullPath = path.join(CAPTURES_DIR, fullFilename);
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    await page.screenshot({ path: fullPath, fullPage: true });

    // C. Tablet Viewport (768x1024)
    await page.setViewport({ width: 768, height: 1024 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const tabletPath = path.join(CAPTURES_DIR, tabletFilename);
    await page.screenshot({ path: tabletPath });

    // D. Mobile Viewport (390x844)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    const mobilePath = path.join(CAPTURES_DIR, mobileFilename);
    await page.screenshot({ path: mobilePath });

    return {
      homepageScreenshot: `/captures/${desktopFilename}`,
      fullPageScreenshot: `/captures/${fullFilename}`,
      tabletScreenshot: `/captures/${tabletFilename}`,
      mobileScreenshot: `/captures/${mobileFilename}`,
      sitemap: uniqueSitemap,
      metadata: {
        title: title || "Loaded Project",
        description: description || undefined,
        width: 1440,
        height: bodyHeight || 900,
      },
    };
  } finally {
    console.log("[Puppeteer] Closing browser process.");
    await browser.close();
  }
}
