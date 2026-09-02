import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { brain } from "./src/server/core/brain";
import { memoryRouter } from "./src/server/memory/memory_manager";
import { daydreamEngine } from "./src/server/core/dreams/daydream_engine";
import { generateZipFile } from "./src/server/core/zip_export";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Phoenix Brain
  brain.initialize();

  // Background Task: Daydream Engine
  setInterval(() => {
    daydreamEngine.checkIdle();
  }, 120000); // Check idle every 120 seconds

  // API Routes
  app.get("/api/backup", (req, res) => {
    generateZipFile(res);
  });

  
  app.use("/api/memory", memoryRouter);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", brain_status: brain.getStatus() });
  });

  // Neural Status Endpoint
  app.get("/api/status", (req, res) => {
    import("./src/server/psychology/emotion").then(({ emotionEngine }) => {
       import("./src/server/core/blackboard").then(({ blackboard }) => {
          const isDreaming = daydreamEngine.isCurrentlyDreaming();
          res.json({
            status: isDreaming ? "Sonhando..." : brain.getStatus(),
            emotion: emotionEngine.getStatus(),
            blackboard_keys: Object.keys(blackboard.readAll()),
            is_dreaming: isDreaming
          });
       });
    });
  });

  // Memory Vault Endpoint
  app.get("/api/memory", (req, res) => {
    import("./src/server/memory/storage").then(({ storage }) => {
      const userId = req.query.userId as string || "admin_1";
      const memories = storage.loadMemories(userId);
      res.json({ memories });
    });
  });

  // Profile Endpoint
  app.get("/api/profile", (req, res) => {
    import("./src/server/users/profile_manager").then(({ profileManager }) => {
      const userId = req.query.userId as string || "admin_1";
      const profile = profileManager.getProfile(userId);
      res.json({ profile });
    });
  });

  // Feedback Engine Route
  app.post("/api/feedback", (req, res) => {
    import("./src/server/core/evolution/reinforcement").then(({ reinforcement }) => {
      const { reward } = req.body;
      if (typeof reward === 'number') {
        const type = reward > 0 ? "positive" : "negative";
        reinforcement.applyExplicitFeedback("default_user", type);
      }
      res.json({ success: true });
    });
  });

  // Example Interaction Route
  app.post("/api/interact", async (req, res) => {
    try {
      daydreamEngine.updateActivity();
      const { user_input, user_id } = req.body;
      const response = await brain.processInput(user_input, user_id);
      res.json({ response });
    } catch (error) {
      console.error("Error processing interaction:", error);
      res.status(500).json({ error: "Internal Brain Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Since express is v4, use '*'
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Phoenix V2 Server running on http://localhost:${PORT}`);
  });
}

startServer();

