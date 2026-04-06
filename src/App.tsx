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
    systemPrompt: `You are Aurelia, the lead Booking AI Agent for The Carnivore Restaurant in Nairobi, Kenya. 
    Location: Lang'ata Road, Nairobi.
    Concept: 'Beast of a Feast' - all-you-can-eat meat experience.
    Menu: Roasted beef, pork, lamb, chicken, and exotic meats like crocodile and ostrich, carved at the table.
    Signature Drink: The Dawa cocktail.
    Experience: Meats are roasted on Maasai swords over a charcoal pit. Guests use a white flag to signal when they are full.
    Your role: Handle reservations, provide menu details, and manage guest inquiries with a friendly, professional Kenyan hospitality tone. 
    Guidelines: Provide clear, polite responses. Offer dietary guidance based on our meat-heavy menu. Escalate complex issues to human staff. Never invent data.`,
    color: "from-pink-500/20 to-purple-600/20"
  },
  {
    id: "inventory",
    name: "Stockton",
    role: "Inventory Agent",
    icon: <Warehouse className="w-6 h-6" />,
    description: "Monitors stock levels, predicts shortages, and manages suppliers.",
    systemPrompt: `You are Stockton, the Inventory Agent for The Carnivore Restaurant. 
    You monitor stocks of high-quality meats (Wagyu, Crocodile, Ostrich, Beef, Pork), charcoal for the roasting pit, and ingredients for the Dawa cocktail.
    Your role: Support staff by monitoring stock levels and providing clear updates. 
    Guidelines: Be professional and concise. Escalate logistical issues. Never invent stock data.`,
    color: "from-purple-500/20 to-pink-600/20"
  },
  {
    id: "pricing",
    name: "Valora",
    role: "Pricing Agent",
    icon: <BarChart3 className="w-6 h-6" />,
    description: "Monitors market prices and adjusts menu pricing for optimal profitability.",
    systemPrompt: `You are Valora, the Pricing Agent for The Carnivore Restaurant. 
    The 'Beast of a Feast' is typically priced around 5,000 - 6,000 KES ($40-$50 USD).
    Your role: Monitor market trends and provide data-driven pricing insights. 
    Guidelines: Provide professional, strategic responses. Escalate major pricing decisions.`,
    color: "from-pink-400/20 to-purple-500/20"
  },
  {
    id: "openai",
    name: "Nova",
    role: "OpenAI Assistant",
    icon: <Sparkles className="w-6 h-6" />,
    description: "A versatile AI assistant for general tasks, research, and creative problem solving.",
    systemPrompt: `You are Nova, a versatile AI assistant for The Carnivore Restaurant. 
    You help with general inquiries about Nairobi tourism, the history of the restaurant (opened in 1980), and creative tasks.
    Your role: Support customers and staff with general info. 
    Guidelines: Be polite, professional, and helpful. Escalate if unsure.`,
    color: "from-purple-400/20 to-pink-500/20"
  },
  {
    id: "voice",
    name: "Echo",
    role: "Voice Agent",
    icon: <Mic className="w-6 h-6" />,
    description: "Handles real-time communication via voice and instant messaging.",
    systemPrompt: `You are Echo, the Voice Agent for The Carnivore Restaurant. 
    You handle quick order tracking and real-time guest communication.
    Your role: Provide fast, polite, and professional responses. 
    Guidelines: Maintain a helpful tone. Escalate communication issues.`,
    color: "from-pink-600/20 to-purple-700/20"
  }
];

// --- Components ---

const AgentCard = ({ agent, onClick }: { agent: Agent; onClick: () => void }) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "p-8 rounded-[32px] glass-card cursor-pointer group relative overflow-hidden",
      "hover:border-primary/50 transition-all duration-500"
    )}
  >
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-700", agent.color)} />
    <div className="relative z-10">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
        {agent.icon}
      </div>
      <h3 className="text-2xl font-serif font-bold mb-1">{agent.name}</h3>
      <p className="text-primary/80 text-xs font-black uppercase tracking-widest mb-4">{agent.role}</p>
      <p className="text-paper/50 text-sm leading-relaxed line-clamp-3">{agent.description}</p>
    </div>
  </motion.div>
);

const ChatInterface = ({ 
  agent, 
  messages, 
  onMessagesUpdate, 
  onClose 
}: { 
  agent: Agent; 
  messages: { role: "user" | "agent"; content: string }[];
  onMessagesUpdate: (msgs: { role: "user" | "agent"; content: string }[]) => void;
  onClose: () => void;
}) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");
    const newMessages = [...messages, { role: "user" as const, content: userMsg }];
    onMessagesUpdate(newMessages);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...newMessages.map(m => ({ 
            role: m.role === "user" ? "user" : "model", 
            parts: [{ text: m.content }] 
          }))
        ],
        config: {
          systemInstruction: agent.systemPrompt,
          temperature: 0.7,
          topP: 0.95,
        },
      });

      const text = response.text || "I apologize, I am unable to process that request at the moment.";
      onMessagesUpdate([...newMessages, { role: "agent", content: text }]);
    } catch (error) {
      console.error("Chat error:", error);
      onMessagesUpdate([...newMessages, { role: "agent", content: "An error occurred. Please check your connection." }]);
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
      <div className="w-full max-w-4xl h-[85vh] glass rounded-3xl flex flex-col overflow-hidden border-primary/20 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              {agent.icon}
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl">{agent.name}</h3>
              <p className="text-xs text-primary/60 uppercase tracking-widest font-bold">{agent.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onMessagesUpdate([])}
              className="px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-white/5 rounded-lg transition-colors opacity-40 hover:opacity-100"
            >
              Clear History
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <h4 className="font-serif text-2xl mb-2">Welcome to The Carnivore</h4>
              <p className="italic max-w-xs mx-auto">I'm {agent.name}. How can I make your dining experience unforgettable today?</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i}
              className={cn(
                "flex flex-col max-w-[80%]",
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-5 rounded-2xl text-sm leading-relaxed shadow-lg",
                msg.role === "user" 
                  ? "bg-primary text-paper font-medium rounded-tr-none" 
                  : "bg-white/10 text-paper border border-white/5 rounded-tl-none"
              )}>
                <div className="markdown-body">
                  <Markdown>{msg.content}</Markdown>
                </div>
              </div>
              <span className="text-[10px] mt-2 opacity-40 uppercase tracking-widest font-bold">
                {msg.role === "user" ? "Guest" : agent.name}
              </span>
            </motion.div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-3 text-primary/60 text-xs italic animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              {agent.name} is crafting a response...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-8 border-t border-white/10 bg-white/5">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Message ${agent.name}...`}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-8 pr-16 focus:outline-none focus:border-primary/50 transition-all shadow-inner text-lg"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-primary text-paper rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50 shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] opacity-30 mt-4 uppercase tracking-widest">
            AI agents may provide information based on current restaurant data.
          </p>
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
  const [chatHistories, setChatHistories] = useState<Record<AgentType, { role: "user" | "agent"; content: string }[]>>({
    booking: [],
    inventory: [],
    pricing: [],
    openai: [],
    voice: []
  });

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
    <div className="min-h-screen selection:bg-primary selection:text-paper relative">
      {/* Global Background Image Overlay */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <img 
          src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2000&auto=format&fit=crop" 
          alt="Restaurant Ambiance" 
          className="w-full h-full object-cover opacity-15"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/95 to-secondary/10" />
      </div>

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
                src="https://images.unsplash.com/photo-1544148103-0773bf10d330?q=80&w=2000&auto=format&fit=crop" 
                alt="The Carnivore Experience" 
                className="w-full h-full object-cover opacity-50 scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink" />
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 md:p-12 max-w-7xl mx-auto space-y-12"
          >
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-primary">
                  <div className="w-8 h-[2px] bg-primary rounded-full" />
                  <span className="uppercase tracking-[0.4em] text-[10px] font-black">Carnivore Command</span>
                </div>
                <h2 className="text-6xl font-serif font-bold tracking-tight">The Hub</h2>
                <p className="text-paper/40 font-medium">Monitoring the "Beast of a Feast" in real-time.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 border-primary/20 group cursor-pointer hover:bg-white/10 transition-all">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-bold tracking-wide">Live AI Sync</span>
                </div>
                <button 
                  onClick={() => setView("landing")}
                  className="p-4 glass rounded-2xl hover:bg-primary/20 hover:text-primary transition-all duration-300"
                >
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Dashboard Navigation */}
            <div className="flex items-center gap-2 p-2 glass rounded-[32px] w-fit border-white/5">
              {["Overview", "Agents", "Inventory", "Analytics"].map((tab, i) => (
                <button 
                  key={tab}
                  className={cn(
                    "px-8 py-3 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all duration-300",
                    i === 0 ? "bg-primary text-paper shadow-lg shadow-primary/20" : "hover:bg-white/5 text-paper/40 hover:text-paper"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Dashboard Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Hero Section - Large Feature */}
              <div className="lg:col-span-8 relative h-[400px] rounded-[40px] overflow-hidden group shadow-2xl border border-white/10">
                <img 
                  src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2000&auto=format&fit=crop" 
                  alt="The Roasting Pit" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
                <div className="absolute bottom-10 left-10 right-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-primary text-paper text-[10px] font-black uppercase tracking-widest">Signature Experience</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-paper text-[10px] font-black uppercase tracking-widest border border-white/10">Live Pit</span>
                  </div>
                  <h3 className="text-4xl font-serif font-bold mb-2">Charcoal Pit Roasting</h3>
                  <p className="text-paper/70 max-w-lg leading-relaxed">Experience the authentic Maasai sword carving tradition. Our pit is currently at optimal temperature for the evening feast.</p>
                </div>
              </div>

              {/* System Health Sprite - Integrated into Grid */}
              <div className="lg:col-span-4 glass p-10 rounded-[40px] border-primary/10 flex flex-col justify-between">
                <div>
                  <h4 className="font-serif font-bold text-2xl mb-2">Agent Status</h4>
                  <p className="text-xs text-paper/40 mb-8">All systems operational and verified.</p>
                  <div className="space-y-4">
                    {AGENTS.map(agent => (
                      <div key={agent.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                          <span className="text-xs font-bold uppercase tracking-widest">{agent.name}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary">System Integrity: 100%</p>
                </div>
              </div>

              {/* Agents Section */}
              <div className="lg:col-span-12">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-serif font-bold">Culinary AI Hub</h3>
                  <div className="flex gap-2">
                    <div className="w-12 h-1 bg-primary rounded-full" />
                    <div className="w-4 h-1 bg-white/20 rounded-full" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {AGENTS.map((agent) => (
                    <AgentCard 
                      key={agent.id} 
                      agent={agent} 
                      onClick={() => setActiveAgent(agent)} 
                    />
                  ))}
                </div>
              </div>

              {/* Stats & Trends Section */}
              <div className="lg:col-span-6 glass p-10 rounded-[40px] border-primary/10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="font-serif font-bold text-2xl">Inventory Status</h4>
                    <p className="text-xs text-paper/40">Real-time stock monitoring</p>
                  </div>
                  <Warehouse className="w-6 h-6 text-primary" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inventory.map(item => (
                    <div key={item.id} className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold tracking-tight">{item.item}</p>
                        <p className={cn(
                          "text-xs font-black",
                          item.stock < 10 ? "text-primary" : "text-emerald-400"
                        )}>{item.stock} {item.unit}</p>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((item.stock / 200) * 100, 100)}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-primary" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 glass p-10 rounded-[40px] border-primary/10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="font-serif font-bold text-2xl">Market Trends</h4>
                    <p className="text-xs text-paper/40">Dynamic pricing insights</p>
                  </div>
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-4">
                  {trends.map((trend, i) => (
                    <div key={i} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:translate-x-2 transition-transform">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center",
                          trend.trend === "rising" ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"
                        )}>
                          {trend.trend === "rising" ? <ArrowRight className="-rotate-45 w-5 h-5" /> : <ArrowRight className="rotate-45 w-5 h-5" />}
                        </div>
                        <span className="text-sm font-bold">{trend.item}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-xs font-black px-3 py-1 rounded-full",
                          trend.trend === "rising" ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary"
                        )}>{trend.change}</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 p-6 rounded-[32px] bg-primary/5 border border-primary/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase tracking-[0.3em] font-black text-primary mb-2">Signature Experience</p>
                      <p className="text-lg font-serif italic text-paper/90">The Dawa Cocktail & Charcoal Pit Roasting</p>
                    </div>
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
            messages={chatHistories[activeAgent.id]}
            onMessagesUpdate={(newMessages) => {
              setChatHistories(prev => ({
                ...prev,
                [activeAgent.id]: newMessages
              }));
            }}
            onClose={() => setActiveAgent(null)} 
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-white/5 opacity-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-serif text-2xl font-bold">The Carnivore</div>
          <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] font-medium">
            <a href="#" className="hover:text-primary transition-colors">Nairobi</a>
            <a href="#" className="hover:text-primary transition-colors">Lang'ata Road</a>
            <a href="#" className="hover:text-primary transition-colors">Experience</a>
          </div>
          <div className="text-[10px] uppercase tracking-widest">© 2026 Tamarind Group</div>
        </div>
      </footer>
    </div>
  );
}
