// Gemini API bridge — adapted from Promptulus
// Uses @google/genai SDK loaded from ESM CDN
let genAI = null;

export function initAPI(apiKey) {
  genAI = { apiKey };
}

export function hasAPIKey() {
  return genAI !== null && !!genAI.apiKey;
}

/**
 * Call Gemini API with conversation history
 * @param {string} systemPrompt - The system prompt
 * @param {Array} conversationHistory - Array of {role: 'user'|'model', text: string}
 * @param {string} userMessage - The new user message
 * @returns {Promise<string>} The model's response text
 */
export async function callGemini(systemPrompt, conversationHistory, userMessage) {
  if (!genAI) {
    throw new Error('API key not set. Please enter your Gemini API key.');
  }

  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: genAI.apiKey });

  const contents = [];
  for (const turn of conversationHistory) {
    contents.push({
      role: turn.role,
      parts: [{ text: turn.text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: contents,
    config: {
      systemInstruction: systemPrompt
    }
  });

  return response.text;
}
