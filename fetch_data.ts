import { GoogleGenAI } from "@google/genai";

async function fetchRestaurantData() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "Provide a detailed summary of 'The Carnivore Restaurant' in Nairobi, Kenya. Include its famous 'Beast of a Feast' menu (types of meat), typical prices, location (Langata Road), opening hours, and unique dining experience (the charcoal pit, the flags, the Dawa cocktail). Format it as a structured knowledge base for an AI agent.",
    config: {
      tools: [{ googleSearch: {} }],
    },
  });
  console.log("---DATA_START---");
  console.log(response.text);
  console.log("---DATA_END---");
}

fetchRestaurantData();
