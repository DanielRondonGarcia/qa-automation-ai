const OpenAI = require('openai');

/**
 * OpenAI Service for Code Analysis
 *
 * Works with modern models via the Responses API, including:
 * - gpt-5, gpt-5-mini, gpt-5-nano
 * - gpt-4o, gpt-4o-mini, gpt-4-turbo
 * - gpt-3.5-turbo
 */

// Ensure the API key is provided
if (!process.env.API_KEY) {
  throw new Error("The API_KEY environment variable is not set. Please set it before running the agent.");
}

// Get AI model from environment variable or use default
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o';
const REQUEST_TIMEOUT_MS = parseInt(process.env.OPENAI_TIMEOUT_MS || '120000', 10); // 2 min default

const openai = new OpenAI({ apiKey: process.env.API_KEY });

const buildSystemInstruction = (rules) => {
  const enabledRules = (rules || []).filter(r => r.enabled);
  let baseInstruction = "You are an expert C# QA code reviewer for a software company. Your task is to analyze the provided C# code snippet and identify issues.";

  if (enabledRules.length > 0) {
    const ruleDescriptions = enabledRules
      .map((rule, index) => `${index + 1}. ${rule.name}: ${rule.description}`)
      .join('\n');
    baseInstruction += `\n\nAnalyze based on the following enabled rules:\n${ruleDescriptions}`;
  }

  return `${baseInstruction}\n\nReturn your findings as a JSON object with a 'findings' property containing an array. Each finding should be an object with the following properties:\n- lineNumber (number)\n- codeSnippet (string)\n- issue (string)\n- suggestion (string)\n- reason (string)\n\nIf no issues are found, return an object with an empty findings array: {"findings": []}.`;
};

const findingsJsonSchema = {
  name: 'findings_schema',
  schema: {
    type: 'object',
    properties: {
      findings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            lineNumber: { type: 'integer' },
            codeSnippet: { type: 'string' },
            issue: { type: 'string' },
            suggestion: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['lineNumber', 'codeSnippet', 'issue', 'suggestion', 'reason'],
          additionalProperties: false,
        },
      },
    },
    required: ['findings'],
    additionalProperties: false,
  },
  strict: true,
};

const analyzeCode = async (code, rules) => {
  // Validate input parameters
  if (!code || typeof code !== 'string' || code.trim() === '') {
    throw new Error('Code parameter is required and must be a non-empty string');
  }
  
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    throw new Error('Rules parameter is required and must be a non-empty array');
  }

  try {
    const systemInstruction = buildSystemInstruction(rules);

    const request = openai.responses.create({
      model: AI_MODEL,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemInstruction }] },
        { role: 'user', content: [{ type: 'input_text', text: `Analyze the following C# code snippet:\n\n${code}` }] }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: findingsJsonSchema.name,
          strict: findingsJsonSchema.strict,
          schema: findingsJsonSchema.schema
        }
      },
      max_output_tokens: 2000
    });

    // Timeout guard to avoid hanging forever
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`OpenAI request timed out after ${REQUEST_TIMEOUT_MS}ms`)), REQUEST_TIMEOUT_MS)
    );

    const response = await Promise.race([request, timeoutPromise]);

    let jsonText = '';
    // Prefer the convenience field if available
    if (response && typeof response.output_text === 'string') {
      jsonText = response.output_text.trim();
    }

    // Fallback: try to extract JSON from the structured output
    if (!jsonText && response && Array.isArray(response.output)) {
      for (const item of response.output) {
        if (item && Array.isArray(item.content)) {
          for (const c of item.content) {
            if (c.type === 'output_json' && c.json) {
              jsonText = JSON.stringify(c.json);
              break;
            }
            if (c.type === 'text' && c.text) {
              jsonText = c.text.trim();
              break;
            }
          }
        }
        if (jsonText) break;
      }
    }

    if (!jsonText) {
      throw new Error('OpenAI response does not contain valid output text');
    }

    let parsed;
    if (typeof jsonText === 'string') {
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        // This is a JSON parsing error - throw it directly to be caught by the outer catch
        const jsonError = new Error('OpenAI response contains invalid JSON format');
        jsonError.isJsonParsingError = true;
        throw jsonError;
      }
    } else {
      parsed = jsonText;
    }
    
    // Handle the new object format with 'findings' property
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.findings)) {
      return parsed.findings; // This can be an empty array, which is valid
    }
    
    // Handle legacy array format (direct array of findings)
    if (Array.isArray(parsed)) {
      return parsed; // This can be an empty array, which is valid
    }
    
    // If parsed is not in expected format, throw an error instead of returning empty array
    const formatError = new Error('OpenAI response does not contain expected findings format');
    formatError.isJsonParsingError = true;
    throw formatError;
  } catch (error) {
    // Re-throw JSON parsing and format errors immediately without transformation
    if (error.isJsonParsingError) {
      throw error;
    }
    
    console.error('Error calling OpenAI API:', error);
    let userFriendlyMessage = 'Failed to analyze code via OpenAI API.';

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('api key') || errorMessage.includes('unauthorized')) {
        userFriendlyMessage = 'Authentication failed with OpenAI. Please check if your API key is valid and has the necessary permissions.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        userFriendlyMessage = 'OpenAI API rate limit exceeded. Please wait a moment and try again later.';
      } else if (errorMessage.includes('insufficient_quota')) {
        userFriendlyMessage = 'OpenAI API quota exceeded. Please check your billing and usage limits.';
      } else if (errorMessage.includes('timed out')) {
        userFriendlyMessage = 'The OpenAI request timed out. Try a faster model (e.g., gpt-5-mini or gpt-4o-mini) or reduce input size.';
      } else if (errorMessage.includes('openai api error') || error.message === 'OpenAI API Error') {
        // Keep generic OpenAI API errors as-is for testing
        userFriendlyMessage = error.message;
      }
    }
    throw new Error(userFriendlyMessage);
  }
};

module.exports = { analyzeCode };
