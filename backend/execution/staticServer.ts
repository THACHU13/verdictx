import express from "express";
import path from "path";

const dir = process.argv[2];
const port = parseInt(process.argv[3] || "5000", 10);

if (!dir) {
  console.error("[StaticServer] Error: Directory path is required.");
  process.exit(1);
}

const app = express();

// Serve files statically
app.use(express.static(path.resolve(dir)));

// Fallback index.html for single-page style apps if needed
app.get("*", (req, res, next) => {
  res.sendFile(path.join(path.resolve(dir), "index.html"), (err) => {
    if (err) {
      next();
    }
  });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[StaticServer] Ready: http://localhost:${port}`);
});

// Handle thermal shutdown signals
process.on("SIGTERM", () => {
  server.close(() => {
    console.log("[StaticServer] Stopped.");
    process.exit(0);
  });
});
