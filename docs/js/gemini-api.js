// LLM bridge — adapted from Promptulus. One key box, two backends, chosen by
// the key itself:
//   - a University of Idaho MindRouter key (prefix "mr2_") goes to MindRouter,
//     an OpenAI-compatible gateway, through the public proxy on the lakehouse VM
//     (MindRouter itself is campus-only, and the proxy adds the CORS headers a
//     page on github.io needs);
//   - any other key is treated as a Google Gemini key and goes to Google via the
//     @google/genai SDK loaded from an ESM CDN.

export const MINDROUTER_BASE_URL = 'https://nlayman-external.insight.uidaho.edu/v1';
export const MINDROUTER_MODEL = 'qwen/qwen3.8-27b';
export const GEMINI_MODEL = 'gemini-2.5-flash';

let apiState = null;

export function initAPI(apiKey) {
  apiState = { apiKey };
}

export function hasAPIKey() {
  return apiState !== null && !!apiState.apiKey;
}

export function isMindRouterKey(key) {
  return typeof key === 'string' && key.trim().startsWith('mr2_');
}

export function backendName(key) {
  return isMindRouterKey(key) ? 'MindRouter' : 'Google Gemini';
}

/**
 * Send a message to whichever backend the current key selects.
 * @param {string} systemPrompt - The system prompt
 * @param {Array} conversationHistory - Array of {role: 'user'|'model', text: string}
 * @param {string} userMessage - The new user message
 * @returns {Promise<string>} The model's response text
 */
export async function callModel(systemPrompt, conversationHistory, userMessage) {
  if (!apiState) {
    throw new Error('API key not set. Please enter your Gemini API key.');
  }
  return isMindRouterKey(apiState.apiKey)
    ? callMindRouter(systemPrompt, conversationHistory, userMessage)
    : callGemini(systemPrompt, conversationHistory, userMessage);
}

async function callGemini(systemPrompt, conversationHistory, userMessage) {
  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: apiState.apiKey });

  const contents = conversationHistory.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.text }]
  }));
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
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

async function callMindRouter(systemPrompt, conversationHistory, userMessage) {
  // OpenAI chat format: the history's 'model' role is 'assistant' here.
  const messages = [{ role: 'system', content: systemPrompt }];
  for (const turn of conversationHistory) {
    messages.push({ role: turn.role === 'model' ? 'assistant' : turn.role, content: turn.text });
  }
  messages.push({ role: 'user', content: userMessage });

  let response;
  try {
    response = await fetch(`${MINDROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiState.apiKey}`
      },
      body: JSON.stringify({ model: MINDROUTER_MODEL, messages: messages })
    });
  } catch (e) {
    throw new Error(`Could not reach MindRouter (${e.message}).`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const err = await response.json();
      detail = err.detail || err.error?.message || err.error || '';
    } catch (_) { /* body was not JSON */ }
    if (response.status === 401) {
      throw new Error('MindRouter rejected the API key. Check it and try again.');
    }
    throw new Error(`MindRouter error ${response.status}${detail ? ': ' + detail : ''}`);
  }

  const data = await response.json();
  let text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') {
    throw new Error('MindRouter returned no text.');
  }
  // Thinking models sometimes leave their reasoning inline; never show it.
  text = text.replace(/<think>[\s\S]*?<\/think>\s*/g, '');
  return text.trim();
}
