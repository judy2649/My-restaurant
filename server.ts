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
    console.log("Health check pinged at:", new Date().toISOString());
    res.json({ status: "ok", message: "Agentic Restaurant Backend is live." });
  });

  // Simulated Inventory & Pricing Endpoint
  let inventory = [
    { id: 1, item: "Beef Prime Cuts", stock: 150, unit: "kg", price: 2500 },
    { id: 2, item: "Pork Spare Ribs", stock: 80, unit: "kg", price: 1800 },
    { id: 3, item: "Leg of Lamb", stock: 45, unit: "kg", price: 2200 },
    { id: 4, item: "Crocodile Meat", stock: 12, unit: "kg", price: 4500 },
    { id: 5, item: "Ostrich Meat", stock: 8, unit: "kg", price: 5200 },
    { id: 6, item: "Camel Meat", stock: 5, unit: "kg", price: 4800 },
    { id: 7, item: "Dawa Ingredients", stock: 500, unit: "servings", price: 850 },
  ];

  app.get("/api/inventory", (req, res) => {
    res.json(inventory);
  });

  app.get("/api/market-trends", (req, res) => {
    res.json([
      { item: "Beef Prime Cuts", trend: "rising", change: "+5%" },
      { item: "Crocodile Meat", trend: "stable", change: "0%" },
      { item: "Ostrich Meat", trend: "falling", change: "-2%" },
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
