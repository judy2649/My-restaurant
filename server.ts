import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Agentic Restaurant Backend is live." });
  });

  // Simulated Inventory & Pricing Endpoint
  let inventory = [
    { id: 1, item: "Wagyu Beef", stock: 15, unit: "kg", price: 250 },
    { id: 2, item: "Truffles", stock: 2, unit: "kg", price: 1200 },
    { id: 3, item: "Vintage Wine", stock: 48, unit: "bottles", price: 85 },
    { id: 4, item: "Organic Saffron", stock: 500, unit: "g", price: 15 },
  ];

  app.get("/api/inventory", (req, res) => {
    res.json(inventory);
  });

  app.get("/api/market-trends", (req, res) => {
    res.json([
      { item: "Wagyu Beef", trend: "rising", change: "+5%" },
      { item: "Truffles", trend: "stable", change: "0%" },
      { item: "Vintage Wine", trend: "falling", change: "-2%" },
    ]);
  });

  app.post("/api/inventory/update", (req, res) => {
    const { id, change } = req.body;
    const item = inventory.find(i => i.id === id);
    if (item) {
      item.stock += change;
      res.json({ success: true, item });
    } else {
      res.status(404).json({ error: "Item not found" });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
