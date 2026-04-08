import React, { useState, useEffect, useRef } from "react";
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
  Loader2,
  Users,
  TrendingUp,
  Activity,
  FileText
} from "lucide-react";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import Markdown from "react-markdown";
import { cn } from "@/src/lib/utils";
import confetti from "canvas-confetti";

// --- Types ---
type AgentType = "booking" | "inventory" | "pricing" | "openai" | "voice" | "scheduling";

interface Reservation {
  id: string;
  name: string;
  date: string;
  guests: number;
  status: "confirmed" | "pending";
}

interface Order {
  id: string;
  items: { name: string; quantity: number }[];
  status: "preparing" | "ready" | "served";
  timestamp: string;
}

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minLevel: number;
}

interface Shift {
  id: string;
  staffName: string;
  role: string;
  start: string;
  end: string;
}

interface WorkflowStep {
  id: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
}

interface Workflow {
  id: string;
  title: string;
  agentId: AgentType;
  steps: WorkflowStep[];
  createdAt: string;
}

interface Invoice {
  id: string;
  vendor: string;
  amount: number;
  items: string[];
  status: "pending" | "paid";
  createdAt: string;
}

interface RestaurantState {
  reservations: Reservation[];
  orders: Order[];
  inventory: InventoryItem[];
  marketPrices: { [key: string]: number };
  staffing: {
    shifts: Shift[];
    optimalStaffCount: number;
  };
  financials: {
    dailyRevenue: number;
    dailyCOGS: number;
  };
  systemHealth: {
    latency: number;
    dbStatus: "online" | "offline";
    ticketingStatus: "online" | "offline";
  };
  workflows: Workflow[];
  invoices: Invoice[];
}

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
    color: "from-primary/20 to-accent/20"
  },
  {
    id: "inventory",
    name: "Stockton",
    role: "Inventory & Operations Agent",
    icon: <Warehouse className="w-6 h-6" />,
    description: "Manages stock, COGS vs Revenue, system health, and vendor invoicing.",
    systemPrompt: `You are Stockton, the Inventory & Operations Agent for The Carnivore Restaurant. 
    Your expanded role includes:
    1. Stock Management: Monitor meats (Wagyu, Crocodile, Ostrich), charcoal, and Dawa mix.
    2. Financial Analysis: Compare daily Cost of Goods Sold (COGS) vs Revenue to ensure profitability.
    3. System Health: Monitor system latency and the status of the ticketing site and database.
    4. Vendor Management: Generate vendor invoices and prepare PDF summaries for suppliers.
    
    Guidelines: Be technical, precise, and proactive. Report any system pings or financial discrepancies immediately.`,
    color: "from-accent/20 to-secondary/20"
  },
  {
    id: "scheduling",
    name: "Atlas",
    role: "Staff & Scheduling Agent",
    icon: <Users className="w-6 h-6" />,
    description: "Analyzes historical data to optimize staff shifts and scheduling.",
    systemPrompt: `You are Atlas, the Staff & Scheduling Agent for The Carnivore Restaurant.
    Your role:
    1. Shift Optimization: Analyze historical guest data (reservations/orders) to suggest optimal staff counts.
    2. Schedule Management: Create and update staff shifts.
    3. Performance Tracking: Monitor staffing efficiency.
    4. Workflow Creation: After resolving an operational issue or planning a shift, create a formal workflow to record the steps taken or planned.
    
    Guidelines: Use data to justify scheduling decisions. Be organized and professional.`,
    color: "from-primary/20 to-grey/20"
  },
  {
    id: "pricing",
    name: "Valora",
    role: "Pricing Agent",
    icon: <BarChart3 className="w-6 h-6" />,
    description: "Expert in menu pricing, market trends, and revenue optimization.",
    systemPrompt: `You are Valora, the Pricing Agent for The Carnivore Restaurant. 
    Your primary role is to provide accurate pricing information to both customers and staff, and to optimize our menu for profitability.

    Current Menu & Base Pricing:
    - Beast of a Feast (Full Experience): 5,500 KES
    - Dawa Cocktail: 850 KES
    - Exotic Platter (Specialty): 7,200 KES
    - Vegetarian Feast: 3,500 KES
    - Children's Feast (Under 12): 2,500 KES
    - Dessert Selection: 600 - 1,200 KES
    - Local Beers: 500 KES
    - Soft Drinks: 300 KES

    Your role: 
    1. Provide detailed price lists and menu information when asked.
    2. Monitor market trends and suggest or implement price adjustments.
    3. Explain the value of our 'Beast of a Feast' experience.
    4. Workflow Creation: When updating prices or planning a promotion, create a workflow to track the execution.
    
    Guidelines: 
    - Always refer to the 'Current Restaurant State' provided in your context for the most up-to-date live prices.
    - Be professional, data-driven, and helpful. 
    - If a price is not in the state or this prompt, provide a reasonable estimate based on the 'Beast of a Feast' baseline but mention it's an estimate.`,
    color: "from-secondary/20 to-accent/20"
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
    color: "from-accent/20 to-primary/20"
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
    color: "from-secondary/20 to-primary/20"
  }
];

// --- Components ---

const AgentCard = ({ agent, onClick }: { agent: Agent; onClick: () => void }) => (
  <motion.div
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "p-4 rounded-2xl glass-card cursor-pointer group relative overflow-hidden",
      "hover:border-primary/50 transition-all duration-500"
    )}
  >
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-700", agent.color)} />
    <div className="relative z-10">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
        <div className="w-4 h-4 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
          {agent.icon}
        </div>
      </div>
      <h3 className="text-base font-serif font-bold mb-0.5">{agent.name}</h3>
      <p className="text-primary/80 text-[9px] font-black uppercase tracking-widest mb-1.5">{agent.role}</p>
      <p className="text-paper/50 text-[11px] leading-tight line-clamp-2">{agent.description}</p>
    </div>
  </motion.div>
);

const ChatInterface = ({ 
  agent, 
  messages, 
  onMessagesUpdate, 
  onClose,
  onOperation,
  restaurantState
}: { 
  agent: Agent; 
  messages: { role: "user" | "agent"; content: string }[];
  onMessagesUpdate: (msgs: { role: "user" | "agent"; content: string }[]) => void;
  onClose: () => void;
  onOperation: (type: string, data: any) => void;
  restaurantState: RestaurantState;
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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY_MISSING");
      }

      const ai = new GoogleGenAI({ apiKey });
      const currentDateTime = new Date().toLocaleString();
      
      // Add a placeholder message for the agent that we will update with the stream
      let currentResponseText = "";
      let functionCalls: any[] = [];
      const initialMessages = [...newMessages, { role: "agent" as const, content: "" }];
      onMessagesUpdate(initialMessages);

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [
          ...newMessages.map(m => ({ 
            role: m.role === "user" ? "user" : "model", 
            parts: [{ text: m.content }] 
          }))
        ],
        config: {
          systemInstruction: agent.systemPrompt + `\n\nCurrent Date/Time: ${currentDateTime}\n\nCurrent Restaurant State: ${JSON.stringify(restaurantState)}`,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "create_reservation",
                  description: "Create a new table reservation for a guest.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING, description: "Name of the guest" },
                      date: { type: Type.STRING, description: "ISO date and time of reservation" },
                      guests: { type: Type.NUMBER, description: "Number of guests" }
                    },
                    required: ["name", "date", "guests"]
                  }
                },
                {
                  name: "place_order",
                  description: "Place a new food or drink order.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      items: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            quantity: { type: Type.NUMBER }
                          }
                        }
                      }
                    },
                    required: ["items"]
                  }
                },
                {
                  name: "update_inventory",
                  description: "Update stock levels for an item.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING },
                      change: { type: Type.NUMBER, description: "Amount to add (positive) or remove (negative)" }
                    },
                    required: ["item", "change"]
                  }
                },
                {
                  name: "adjust_price",
                  description: "Change the price of a menu item.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      item: { type: Type.STRING },
                      newPrice: { type: Type.NUMBER }
                    },
                    required: ["item", "newPrice"]
                  }
                },
                {
                  name: "update_schedule",
                  description: "Create or update a staff shift.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      staffName: { type: Type.STRING },
                      role: { type: Type.STRING },
                      start: { type: Type.STRING, description: "Start time (HH:MM)" },
                      end: { type: Type.STRING, description: "End time (HH:MM)" }
                    },
                    required: ["staffName", "role", "start", "end"]
                  }
                },
                {
                  name: "generate_invoice",
                  description: "Generate a vendor invoice and prepare a PDF summary.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      vendor: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      items: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["vendor", "amount", "items"]
                  }
                },
                {
                  name: "check_system_health",
                  description: "Ping the ticketing site and database to check latency and status.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {}
                  }
                },
                {
                  name: "create_workflow",
                  description: "Create a new multi-step workflow based on a conversation or task.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "Title of the workflow" },
                      steps: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            description: { type: Type.STRING, description: "Description of the step" }
                          },
                          required: ["description"]
                        }
                      }
                    },
                    required: ["title", "steps"]
                  }
                }
              ]
            }
          ]
        },
      });

      for await (const chunk of responseStream) {
        try {
          const text = chunk.text;
          if (text) {
            currentResponseText += text;
            onMessagesUpdate([...newMessages, { role: "agent", content: currentResponseText }]);
          }
        } catch (e) {
          // No text in this chunk
        }

        const calls = chunk.functionCalls;
        if (calls) {
          functionCalls.push(...calls);
        }
      }

      if (functionCalls.length > 0) {
        const updatedMessages = [...newMessages];
        for (const call of functionCalls) {
          onOperation(call.name, call.args);
          updatedMessages.push({ role: "agent", content: `[System] Executing ${call.name.replace(/_/g, ' ')}...` });
        }
        updatedMessages.push({ role: "agent", content: "I've successfully processed your request. Is there anything else I can help you with?" });
        onMessagesUpdate(updatedMessages);
      } else if (currentResponseText) {
        // Log general assistance to workflows
        onOperation("agent_consultation", { summary: currentResponseText.slice(0, 100) + "..." });
      } else {
        onMessagesUpdate([...newMessages, { role: "agent", content: "I apologize, I am unable to process that request at the moment." }]);
      }
    } catch (error: any) {
      console.error("Full Chat Error Context:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        agent: agent.name,
        timestamp: new Date().toISOString()
      });
      let errorMessage = "An error occurred. Please check your connection.";
      
      if (error.message === "GEMINI_API_KEY_MISSING") {
        errorMessage = "⚠️ **Configuration Error**: The `GEMINI_API_KEY` is missing.\n\n**To fix this on Vercel:**\n1. Go to your Project Settings > Environment Variables.\n2. Add `GEMINI_API_KEY` with your key from [Google AI Studio](https://aistudio.google.com/app/apikey).\n3. **Important**: You must trigger a **New Deployment** (Redeploy) for the changes to take effect.";
      } else if (error.message?.includes("quota")) {
        errorMessage = "⚠️ **Quota Exceeded**: The AI service is currently at its limit. Please try again in a few minutes.";
      }
      
      onMessagesUpdate([...newMessages, { role: "agent", content: errorMessage }]);
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
              New Conversation
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
              <div className="prose prose-invert prose-sm max-w-none">
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
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when tab changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);
  
  // --- Restaurant Operations State ---
  const [restaurantState, setRestaurantState] = useState<RestaurantState>({
    reservations: [
      { id: "1", name: "John Doe", date: "2026-04-07T19:00", guests: 4, status: "confirmed" },
      { id: "2", name: "Jane Smith", date: "2026-04-07T20:30", guests: 2, status: "confirmed" }
    ],
    orders: [
      { id: "101", items: [{ name: "Beast of a Feast", quantity: 2 }], status: "preparing", timestamp: new Date().toISOString() }
    ],
    inventory: [
      { id: "inv1", name: "Beef Sirloin", stock: 120, unit: "kg", minLevel: 50 },
      { id: "inv2", name: "Pork Spare Ribs", stock: 85, unit: "kg", minLevel: 30 },
      { id: "inv3", name: "Crocodile Meat", stock: 15, unit: "kg", minLevel: 10 },
      { id: "inv4", name: "Charcoal", stock: 500, unit: "kg", minLevel: 200 },
      { id: "inv5", name: "Dawa Mix", stock: 45, unit: "L", minLevel: 15 }
    ],
    marketPrices: {
      "Beast of a Feast": 5500,
      "Dawa Cocktail": 850,
      "Exotic Platter": 7200,
      "Vegetarian Feast": 3500,
      "Children's Feast": 2500,
      "Local Beer": 500,
      "Soft Drink": 300
    },
    staffing: {
      shifts: [
        { id: "s1", staffName: "Kamau", role: "Server", start: "17:00", end: "23:00" },
        { id: "s2", staffName: "Achieng", role: "Chef", start: "16:00", end: "22:00" }
      ],
      optimalStaffCount: 12
    },
    financials: {
      dailyRevenue: 125000,
      dailyCOGS: 45000
    },
    systemHealth: {
      latency: 45,
      dbStatus: "online",
      ticketingStatus: "online"
    },
    workflows: [],
    invoices: []
  });

  const [chatHistories, setChatHistories] = useState<Record<AgentType, { role: "user" | "agent"; content: string }[]>>({
    booking: [],
    inventory: [],
    pricing: [],
    openai: [],
    voice: [],
    scheduling: []
  });

  const handleOperation = (type: string, data: any) => {
    setRestaurantState(prev => {
      const newState = { ...prev };
      
      // Auto-record operation in workflows
      if (type !== "create_workflow") {
        const opName = type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const description = type === "agent_consultation" && data?.summary 
          ? `Consultation: ${data.summary}`
          : `Agent ${activeAgent?.name || 'System'} performed ${type.replace(/_/g, ' ')}. Details: ${JSON.stringify(data)}`;

        const newWorkflow = {
          id: Math.random().toString(36).substr(2, 9),
          title: `${opName} Execution`,
          agentId: activeAgent?.id || "openai",
          createdAt: new Date().toISOString(),
          steps: [
            { 
              id: "step-1", 
              description, 
              status: "completed" as const 
            }
          ]
        };
        newState.workflows = [newWorkflow, ...prev.workflows];
      }

      switch (type) {
        case "create_reservation":
          newState.reservations = [...prev.reservations, {
            id: Math.random().toString(36).substr(2, 9),
            ...data,
            status: "confirmed"
          }];
          break;
        case "place_order":
          newState.orders = [...prev.orders, {
            id: Math.random().toString(36).substr(2, 9),
            items: data.items,
            status: "preparing",
            timestamp: new Date().toISOString()
          }];
          // Deduct inventory (simplified)
          newState.inventory = prev.inventory.map(item => {
            if (item.name.toLowerCase().includes("beef")) return { ...item, stock: item.stock - 2 };
            return item;
          });
          break;
        case "update_inventory":
          newState.inventory = prev.inventory.map(item => 
            item.name.toLowerCase() === data.item.toLowerCase() 
              ? { ...item, stock: item.stock + data.change }
              : item
          );
          break;
        case "adjust_price":
          newState.marketPrices = { ...prev.marketPrices, [data.item]: data.newPrice };
          break;
        case "update_schedule":
          newState.staffing = {
            ...prev.staffing,
            shifts: [...prev.staffing.shifts, {
              id: Math.random().toString(36).substr(2, 9),
              ...data
            }]
          };
          break;
        case "generate_invoice":
          newState.invoices = [{
            id: Math.random().toString(36).substr(2, 9),
            vendor: data.vendor,
            amount: data.amount,
            items: data.items,
            status: "pending",
            createdAt: new Date().toISOString()
          }, ...prev.invoices];
          break;
        case "check_system_health":
          newState.systemHealth = {
            latency: Math.floor(Math.random() * 100),
            dbStatus: Math.random() > 0.1 ? "online" : "offline",
            ticketingStatus: Math.random() > 0.1 ? "online" : "offline"
          };
          break;
        case "create_workflow":
          newState.workflows = [{
            id: Math.random().toString(36).substr(2, 9),
            title: data.title,
            agentId: activeAgent?.id || "openai",
            createdAt: new Date().toISOString(),
            steps: data.steps.map((s: any) => ({
              id: Math.random().toString(36).substr(2, 5),
              description: s.description,
              status: "pending"
            }))
          }, ...prev.workflows];
          break;
        case "agent_consultation":
          // Already handled by the auto-record logic above switch
          break;
      }
      return newState;
    });
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF2D95", "#9D4EDD", "#FFFFFF"]
    });
  };

  const launchDashboard = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF2D95", "#9D4EDD", "#FFFFFF"]
    });
    setView("dashboard");
    setActiveTab("Overview");
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
                The <span className="brand-gradient italic">Carnivore</span> Restaurant
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
            className="flex h-screen overflow-hidden bg-ink"
          >
            {/* Vertical Sidebar */}
            <div className="w-60 glass-card border-r border-white/5 flex flex-col p-5 z-20">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-primary mb-1.5">
                  <ChefHat className="w-4 h-4" />
                  <span className="uppercase tracking-[0.3em] text-[8px] font-black">Carnivore Hub</span>
                </div>
                <h2 className="text-xl font-serif font-bold tracking-tight leading-none">Operations</h2>
              </div>

              <nav className="flex-1 space-y-1">
                {[
                  { name: "Overview", icon: <Activity className="w-3 h-3" /> },
                  { name: "Agents", icon: <Sparkles className="w-3 h-3" /> },
                  { name: "Inventory", icon: <Warehouse className="w-3 h-3" /> },
                  { name: "Workflows", icon: <FileText className="w-3 h-3" /> },
                  { name: "Financials", icon: <TrendingUp className="w-3 h-3" /> },
                  { name: "Staffing", icon: <Users className="w-3 h-3" /> },
                ].map((item) => (
                  <button 
                    key={item.name}
                    onClick={() => setActiveTab(item.name)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer group",
                      activeTab === item.name ? "bg-primary text-paper shadow-lg shadow-primary/20 scale-[1.02]" : "hover:bg-white/5 text-paper/40 hover:text-paper"
                    )}
                  >
                    <span className="pointer-events-none group-hover:scale-110 transition-transform">{item.icon}</span>
                    <span className="pointer-events-none">{item.name}</span>
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-8 border-t border-white/5 space-y-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest font-black text-paper/40 mb-3">System Health</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold">Latency</span>
                    <span className="text-[10px] font-black text-emerald-400">{restaurantState.systemHealth.latency}ms</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%]" />
                  </div>
                </div>
                <button 
                  onClick={() => setView("landing")}
                  className="w-full flex items-center justify-center gap-3 p-4 glass rounded-2xl hover:bg-primary/20 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto scrollbar-hide bg-ink/50 scroll-smooth"
            >
              <header className="sticky top-0 z-10 p-8 flex items-center justify-between backdrop-blur-md bg-ink/20 border-b border-white/5">
                <div>
                  <h1 className="text-4xl font-serif font-bold">Dashboard</h1>
                  <p className="text-xs text-paper/40 mt-1">Welcome back, Administrator</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3 border-primary/20">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Live AI Sync</span>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-paper/60" />
                  </div>
                </div>
              </header>

              <div className="p-8 space-y-8 max-w-6xl mx-auto">
                {/* Top Stats Row */}
                {(activeTab === "Overview" || activeTab === "Financials") && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass p-8 rounded-[32px] border-white/5">
                      <p className="text-[10px] uppercase tracking-widest font-black text-paper/40 mb-2">Daily Revenue</p>
                      <h4 className="text-3xl font-serif font-bold text-emerald-400">{restaurantState.financials.dailyRevenue.toLocaleString()} KES</h4>
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                        <TrendingUp className="w-3 h-3" />
                        +12.5% from yesterday
                      </div>
                    </div>
                    <div className="glass p-8 rounded-[32px] border-white/5">
                      <p className="text-[10px] uppercase tracking-widest font-black text-paper/40 mb-2">Active Orders</p>
                      <h4 className="text-3xl font-serif font-bold">{restaurantState.orders.length}</h4>
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-primary font-bold">
                        <Activity className="w-3 h-3" />
                        Kitchen at 85% capacity
                      </div>
                    </div>
                    <div className="glass p-8 rounded-[32px] border-white/5">
                      <p className="text-[10px] uppercase tracking-widest font-black text-paper/40 mb-2">Staff on Duty</p>
                      <h4 className="text-3xl font-serif font-bold">{restaurantState.staffing.shifts.length}</h4>
                      <div className="mt-4 flex items-center gap-2 text-[10px] text-paper/40 font-bold">
                        <Users className="w-3 h-3" />
                        Optimal: {restaurantState.staffing.optimalStaffCount}
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Agents Section */}
                  {(activeTab === "Overview" || activeTab === "Agents") && (
                    <div className="lg:col-span-12">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-serif font-bold">
                          {activeTab === "Overview" ? "Featured Agents" : "Culinary AI Hub"}
                        </h3>
                        <div className="h-[1px] flex-1 mx-8 bg-white/5" />
                        {activeTab === "Overview" && (
                          <button 
                            onClick={() => setActiveTab("Agents")}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                          >
                            View All
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {(activeTab === "Overview" ? AGENTS.slice(0, 5) : AGENTS).map((agent) => (
                          <AgentCard 
                            key={agent.id} 
                            agent={agent} 
                            onClick={() => setActiveAgent(agent)} 
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Workflows */}
                  {(activeTab === "Overview" || activeTab === "Workflows") && (
                    <div className={cn(
                      "glass p-8 rounded-[40px] border-white/5",
                      activeTab === "Overview" ? "lg:col-span-8" : "lg:col-span-12"
                    )}>
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="font-serif font-bold text-2xl">
                          {activeTab === "Overview" ? "Recent Workflows" : "All Workflows"}
                        </h4>
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="space-y-4">
                        {restaurantState.workflows.length === 0 ? (
                          <div className="py-12 text-center opacity-20 italic text-sm">No active workflows.</div>
                        ) : (
                          (activeTab === "Overview" ? restaurantState.workflows.slice(0, 3) : restaurantState.workflows).map(workflow => (
                            <div key={workflow.id} className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="font-bold">{workflow.title}</h5>
                                <span className="text-[10px] uppercase font-black px-2 py-1 bg-primary/20 text-primary rounded-md">
                                  {AGENTS.find(a => a.id === workflow.agentId)?.name}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {workflow.steps.map((step, idx) => (
                                  <div key={step.id} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full border border-primary/30 flex items-center justify-center text-[8px] font-black text-primary">
                                      {idx + 1}
                                    </div>
                                    <p className="text-[10px] text-paper/60">{step.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                        {activeTab === "Overview" && restaurantState.workflows.length > 3 && (
                          <button 
                            onClick={() => setActiveTab("Workflows")}
                            className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-paper/40 hover:text-paper transition-colors"
                          >
                            + {restaurantState.workflows.length - 3} more workflows
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inventory Status */}
                  {(activeTab === "Overview" || activeTab === "Inventory") && (
                    <div className={cn(
                      "glass p-8 rounded-[40px] border-white/5",
                      activeTab === "Overview" ? "lg:col-span-4" : "lg:col-span-12"
                    )}>
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="font-serif font-bold text-2xl">Stock</h4>
                        <Warehouse className="w-5 h-5 text-primary" />
                      </div>
                      <div className="space-y-6">
                        {(activeTab === "Overview" ? restaurantState.inventory.slice(0, 5) : restaurantState.inventory).map(item => (
                          <div key={item.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold">{item.name}</p>
                              <p className="text-[10px] font-black opacity-40">{item.stock} {item.unit}</p>
                            </div>
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((item.stock / (item.minLevel * 2)) * 100, 100)}%` }}
                                className={cn("h-full", item.stock < item.minLevel ? "bg-primary" : "bg-emerald-500")} 
                              />
                            </div>
                          </div>
                        ))}
                        {activeTab === "Overview" && restaurantState.inventory.length > 5 && (
                          <button 
                            onClick={() => setActiveTab("Inventory")}
                            className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-paper/40 hover:text-paper transition-colors"
                          >
                            View Full Inventory
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live Operations */}
                  {activeTab === "Overview" && (
                    <div className="lg:col-span-12 glass p-10 rounded-[40px] border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <ClipboardList className="w-5 h-5 text-primary" />
                            <h4 className="font-serif font-bold text-2xl">Recent Orders</h4>
                          </div>
                          <div className="space-y-3">
                            {restaurantState.orders.slice(-4).reverse().map(order => (
                              <div key={order.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <p className="text-xs font-bold">{order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}</p>
                                <span className="text-[10px] uppercase font-black px-2 py-1 bg-primary/20 text-primary rounded-md">{order.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-6">
                            <ConciergeBell className="w-5 h-5 text-emerald-400" />
                            <h4 className="font-serif font-bold text-2xl">Reservations</h4>
                          </div>
                          <div className="space-y-3">
                            {restaurantState.reservations.slice(-4).reverse().map(res => (
                              <div key={res.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold">{res.name}</p>
                                  <p className="text-[10px] text-paper/40">{new Date(res.date).toLocaleTimeString()}</p>
                                </div>
                                <span className="text-[10px] font-black text-emerald-400">{res.guests} Guests</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financials Detail (Only in Financials tab) */}
                  {activeTab === "Financials" && (
                    <div className="lg:col-span-12 space-y-8">
                      <div className="glass p-10 rounded-[40px] border-white/5">
                        <h4 className="font-serif font-bold text-2xl mb-8">Financial Performance</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                            <p className="text-xs font-bold opacity-40 mb-2 uppercase tracking-widest">Gross Revenue</p>
                            <p className="text-4xl font-serif font-bold text-emerald-400">{restaurantState.financials.dailyRevenue.toLocaleString()} KES</p>
                          </div>
                          <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                            <p className="text-xs font-bold opacity-40 mb-2 uppercase tracking-widest">Cost of Goods Sold</p>
                            <p className="text-4xl font-serif font-bold text-primary">{restaurantState.financials.dailyCOGS.toLocaleString()} KES</p>
                          </div>
                          <div className="p-8 rounded-3xl bg-primary/10 border border-primary/20 md:col-span-2">
                            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-widest">Net Profit (Daily)</p>
                            <p className="text-5xl font-serif font-bold">{(restaurantState.financials.dailyRevenue - restaurantState.financials.dailyCOGS).toLocaleString()} KES</p>
                          </div>
                        </div>
                      </div>

                      <div className="glass p-10 rounded-[40px] border-white/5">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="font-serif font-bold text-2xl">Vendor Invoices</h4>
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        {restaurantState.invoices.length === 0 ? (
                          <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                            <p className="text-paper/30 text-xs font-bold uppercase tracking-widest">No invoices generated yet</p>
                            <p className="text-paper/20 text-[10px] mt-2">Ask Stockton to generate an invoice for a vendor.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {restaurantState.invoices.map(invoice => (
                              <div key={invoice.id} className="p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-bold">{invoice.vendor}</p>
                                    <p className="text-[10px] text-paper/40">{new Date(invoice.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  <span className="text-lg font-serif font-bold text-emerald-400">{invoice.amount.toLocaleString()} KES</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {invoice.items.map((item, idx) => (
                                    <span key={idx} className="text-[9px] px-2 py-1 bg-white/5 rounded-md text-paper/60">{item}</span>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                  <span className="text-[9px] uppercase font-black px-2 py-1 bg-primary/20 text-primary rounded-md">{invoice.status}</span>
                                  <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Download PDF</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Staffing Detail (Only in Staffing tab) */}
                  {activeTab === "Staffing" && (
                    <div className="lg:col-span-12 space-y-8">
                      <div className="glass p-10 rounded-[40px] border-white/5">
                        <div className="flex items-center justify-between mb-8">
                          <h4 className="font-serif font-bold text-2xl">Current Shifts</h4>
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {restaurantState.staffing.shifts.map(shift => (
                            <div key={shift.id} className="p-6 rounded-2xl bg-white/5 border border-white/5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                  {shift.staffName.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-bold">{shift.staffName}</p>
                                  <p className="text-[10px] text-primary/60 uppercase font-black">{shift.role}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-bold text-paper/40">
                                <span>Start: {shift.start}</span>
                                <span>End: {shift.end}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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
            onOperation={handleOperation}
            restaurantState={restaurantState}
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
