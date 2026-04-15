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

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemPrompt
        }
      });
      return response.text;
    } catch (e) {
      const msg = e.message || '';
      // Parse retry delay from 429 error
      const delayMatch = msg.match(/retryDelay.*?(\d+)s/);
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        var waitSec = delayMatch ? parseInt(delayMatch[1]) + 2 : 30;
        if (attempt < maxRetries - 1) {
          console.log('Rate limited, retrying in ' + waitSec + 's...');
          await new Promise(function (r) { setTimeout(r, waitSec * 1000); });
          continue;
        }
      }
      throw e;
    }
  }
}
