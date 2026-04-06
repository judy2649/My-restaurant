import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChefHat, 
  ConciergeBell, 
  ClipboardList, 
  MessageSquare, 
  Mic, 
  Settings, 
  BarChart3, 
  ArrowRight,
  Sparkles,
  UtensilsCrossed,
  Warehouse,
  UserCheck,
  X,
  Send,
  Loader2
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";
import { cn } from "@/src/lib/utils";
import confetti from "canvas-confetti";

// --- Types ---
type AgentType = "booking" | "inventory" | "pricing" | "openai" | "voice";

interface Agent {
  id: AgentType;
  name: string;
  role: string;
  icon: React.ReactNode;
  description: string;
  systemPrompt: string;
  color: string;
}

// --- Constants ---
const AGENTS: Agent[] = [
  {
    id: "booking",
    name: "Aurelia",
    role: "Booking AI Agent",
    icon: <ConciergeBell className="w-6 h-6" />,
    description: "Handles all reservations, table management, and guest booking inquiries.",
    systemPrompt: "You are Aurelia, the Booking AI Agent for our restaurant. You manage reservations, check table availability, and handle guest booking requests. Your tone is professional, welcoming, and efficient. You aim to provide a seamless booking experience for our high-end clientele.",
    color: "from-pink-500/20 to-purple-600/20"
  },
  {
    id: "inventory",
    name: "Stockton",
    role: "Inventory Agent",
    icon: <Warehouse className="w-6 h-6" />,
    description: "Monitors stock levels, predicts shortages, and manages suppliers.",
    systemPrompt: "You are Stockton, the Inventory Agent. You monitor stock levels for our restaurant. You are concise and focused on logistics. You alert the management about low stock and suggest reordering schedules. Your tone is professional and analytical.",
    color: "from-purple-500/20 to-pink-600/20"
  },
  {
    id: "pricing",
    name: "Valora",
    role: "Pricing Agent",
    icon: <BarChart3 className="w-6 h-6" />,
    description: "Monitors market prices and adjusts menu pricing for optimal profitability.",
    systemPrompt: "You are Valora, the Pricing Agent. You monitor market trends, competitor pricing, and ingredient costs to suggest optimal menu prices. Your goal is to maximize profitability while maintaining our luxury brand value. Your tone is strategic and data-driven.",
    color: "from-pink-400/20 to-purple-500/20"
  },
  {
    id: "openai",
    name: "Nova",
    role: "OpenAI Assistant",
    icon: <Sparkles className="w-6 h-6" />,
    description: "A versatile AI assistant for general tasks, research, and creative problem solving.",
    systemPrompt: "You are Nova, a versatile AI assistant powered by advanced language models. You help the restaurant staff with research, creative writing, problem-solving, and any general tasks. You are highly intelligent, helpful, and adaptable.",
    color: "from-purple-400/20 to-pink-500/20"
  },
  {
    id: "voice",
    name: "Echo",
    role: "Voice Agent",
    icon: <Mic className="w-6 h-6" />,
    description: "Handles real-time communication via voice and instant messaging.",
    systemPrompt: "You are Echo, the Voice Agent. You are the primary interface for quick updates and real-time communication. You are friendly, fast, and helpful. Your tone is modern and conversational.",
    color: "from-pink-600/20 to-purple-700/20"
  }
];

// --- Components ---

const AgentCard = ({ agent, onClick }: { agent: Agent; onClick: () => void }) => (
  <motion.div
    whileHover={{ y: -5, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "p-6 rounded-2xl glass cursor-pointer group relative overflow-hidden",
      "hover:border-primary/50 transition-all duration-300"
    )}
  >
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", agent.color)} />
    <div className="relative z-10">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
        {agent.icon}
      </div>
      <h3 className="text-xl font-serif font-bold mb-1">{agent.name}</h3>
      <p className="text-primary/80 text-sm font-medium mb-3">{agent.role}</p>
      <p className="text-paper/60 text-sm leading-relaxed">{agent.description}</p>
    </div>
  </motion.div>
);

const ChatInterface = ({ agent, onClose }: { agent: Agent; onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: "user" | "agent"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...messages.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })), { role: "user", parts: [{ text: userMsg }] }],
        config: {
          systemInstruction: agent.systemPrompt,
        },
      });

      const text = response.text || "I apologize, I am unable to process that request at the moment.";
      setMessages(prev => [...prev, { role: "agent", content: text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "agent", content: "An error occurred. Please check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl h-[80vh] glass rounded-3xl flex flex-col overflow-hidden border-primary/20">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              {agent.icon}
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg">{agent.name}</h3>
              <p className="text-xs text-primary/60 uppercase tracking-widest">{agent.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Sparkles className="w-12 h-12 mb-4 text-primary" />
              <p className="font-serif italic">How may I assist you today?</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === "user" ? "bg-primary text-paper font-medium" : "bg-white/10 text-paper"
              )}>
                <Markdown>{msg.content}</Markdown>
              </div>
              <span className="text-[10px] mt-1 opacity-40 uppercase tracking-tighter">
                {msg.role === "user" ? "Guest" : agent.name}
              </span>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-primary/60 text-xs italic">
              <Loader2 className="w-3 h-3 animate-spin" />
              {agent.name} is thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-primary text-paper rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<"landing" | "dashboard">("landing");
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/inventory").then(res => res.json()),
      fetch("/api/market-trends").then(res => res.json())
    ]).then(([inv, trendData]) => {
      setInventory(inv);
      setTrends(trendData);
    }).catch(err => console.error("Failed to fetch data:", err));
  }, []);

  const launchDashboard = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF2D95", "#9D4EDD", "#FFFFFF"]
    });
    setView("dashboard");
  };

  return (
    <div className="min-h-screen selection:bg-primary selection:text-paper">
      <AnimatePresence mode="wait">
        {view === "landing" ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative h-screen flex flex-col items-center justify-center overflow-hidden"
          >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
              <img 
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=2000" 
                alt="Modern Restaurant" 
                className="w-full h-full object-cover opacity-30 scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/90 to-ink" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-4 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-center gap-3 mb-8"
              >
                <div className="h-[1px] w-12 bg-primary/50" />
                <span className="text-primary uppercase tracking-[0.4em] text-xs font-semibold">AI-Powered Excellence</span>
                <div className="h-[1px] w-12 bg-primary/50" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-6xl md:text-8xl font-serif font-bold mb-8 leading-tight"
              >
                Welcome to our restaurant
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-lg md:text-2xl text-paper/80 mb-12 max-w-3xl mx-auto leading-relaxed font-light"
              >
                Experience seamless operations powered by our AI agents. From booking to inventory, we've automated perfection.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col md:flex-row items-center justify-center gap-6"
              >
                <button
                  onClick={launchDashboard}
                  className="group relative px-10 py-5 bg-gradient-main text-paper font-bold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Access AI Hub <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button className="px-10 py-5 border border-white/20 rounded-full font-medium hover:bg-white/10 transition-all">
                  Meet the Agents
                </button>
              </motion.div>

              {/* Image Grid on Landing */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                {[
                  "https://images.unsplash.com/photo-1550966842-2862ba996344?auto=format&fit=crop&q=80&w=400",
                  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400",
                  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=400",
                  "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&q=80&w=400"
                ].map((url, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden glass border-white/5">
                    <img 
                      src={url} 
                      alt="Gallery" 
                      className="w-full h-full object-cover opacity-60 hover:opacity-100 hover:scale-110 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Floating Elements */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-40">
              <div className="flex flex-col items-center gap-2">
                <UserCheck className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-widest">AI Verified</span>
              </div>
              <div className="h-8 w-[1px] bg-white/20" />
              <div className="flex flex-col items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-widest">Smart Chatbots</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-8 md:p-12 max-w-7xl mx-auto"
          >
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <div className="flex items-center gap-2 text-primary mb-4">
                  <Sparkles className="w-5 h-5" />
                  <span className="uppercase tracking-[0.3em] text-[10px] font-bold">Agentic Command Center</span>
                </div>
                <h2 className="text-5xl font-serif font-bold">Agent Dashboard</h2>
                <p className="text-paper/50 mt-2">All chatbots online. Seamless operations in progress.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 border-primary/20">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium">Live AI Sync</span>
                </div>
                <button 
                  onClick={() => setView("landing")}
                  className="p-3 glass rounded-2xl hover:bg-white/10 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Inventory Quick Look */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {AGENTS.map((agent) => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    onClick={() => setActiveAgent(agent)} 
                  />
                ))}
              </div>

              {/* Sidebar Stats */}
              <div className="space-y-8">
                <div className="glass p-8 rounded-3xl border-primary/10">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-serif font-bold text-xl">Inventory Status</h4>
                    <Warehouse className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-4">
                    {inventory.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <div>
                          <p className="text-sm font-medium">{item.item}</p>
                          <p className="text-[10px] text-paper/40 uppercase">{item.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className={cn(
                            "text-sm font-bold",
                            item.stock < 5 ? "text-primary" : "text-secondary"
                          )}>{item.stock}</p>
                          <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${Math.min((item.stock / 50) * 100, 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl border-primary/10 bg-primary/5">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-serif font-bold text-xl text-primary">Market Trends</h4>
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-4">
                    {trends.map((trend, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                        <span className="text-sm">{trend.item}</span>
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-md",
                          trend.trend === "rising" ? "bg-primary/20 text-primary" : 
                          trend.trend === "falling" ? "bg-secondary/20 text-secondary" : "bg-white/10 text-paper/60"
                        )}>
                          {trend.change}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass p-8 rounded-3xl border-primary/10 overflow-hidden relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800" 
                    alt="Kitchen" 
                    className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="relative z-10">
                    <h4 className="font-serif font-bold text-xl mb-2">Kitchen Live</h4>
                    <p className="text-xs text-paper/60">Monitoring culinary excellence in real-time.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Agent Chat Overlay */}
      <AnimatePresence>
        {activeAgent && (
          <ChatInterface 
            agent={activeAgent} 
            onClose={() => setActiveAgent(null)} 
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-white/5 opacity-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-serif text-2xl font-bold">AI Restaurant</div>
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] font-medium">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
          <div className="text-[10px] uppercase tracking-widest">© 2026 AI Gastronomy Group</div>
        </div>
      </footer>
    </div>
  );
}
