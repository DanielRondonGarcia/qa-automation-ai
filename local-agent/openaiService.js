const OpenAI = require('openai');

/**
 * OpenAI Service for Code Analysis
 * 
 * Configuration:
 * - API_KEY: OpenAI API key (required)
 * - AI_MODEL: AI model to use (optional, defaults to 'gpt-4o')
 *   Available models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
 */

// Ensure the API key is provided
if (!process.env.API_KEY) {
    throw new Error("The API_KEY environment variable is not set. Please set it before running the agent.");
}

// Get AI model from environment variable or use default
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o';

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

const buildSystemInstruction = (rules) => {
  const enabledRules = rules.filter(r => r.enabled);
  let baseInstruction = "You are an expert C# QA code reviewer for a software company. Your task is to analyze the provided C# code snippet and identify issues.";
  
  if (enabledRules.length > 0) {
     const ruleDescriptions = enabledRules
    .map((rule, index) => `${index + 1}. **${rule.name}:** ${rule.description}`)
    .join('\n');
    baseInstruction += `\n\nAnalyze based on the following enabled rules:\n${ruleDescriptions}`
  }

  return `${baseInstruction}\n\nReturn your findings as a JSON array. Each finding should be an object with the following properties:
- lineNumber (number): The line number where the issue is found
- codeSnippet (string): The exact line of code with the issue
- issueToken (string, optional): The specific word or token within the code snippet that contains the issue
- issue (string): A short description of the issue found
- suggestion (string): The suggested corrected code for the identified issue
- reason (string): An explanation of why the change is recommended based on the rules

If no issues are found, return an empty array.`;
};

const analyzeCode = async (code, rules) => {
  try {
    const systemInstruction = buildSystemInstruction(rules);
    
    const response = await openai.chat.completions.create({
      model: AI_MODEL, // Using model from environment variable
      messages: [
        {
          role: "system",
          content: systemInstruction
        },
        {
          role: "user",
          content: `Analyze the following C# code snippet:\n\n\`\`\`csharp\n${code}\n\`\`\``
        }
      ],
      response_format: { type: "json_object" },
      // temperature parameter removed for better compatibility
    });

    const jsonText = response.choices[0].message.content.trim();
    if (!jsonText) {
      return [];
    }
    
    const parsed = JSON.parse(jsonText);
    // Handle both direct array and object with findings array
    return Array.isArray(parsed) ? parsed : (parsed.findings || []);
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    let userFriendlyMessage = "Failed to analyze code via OpenAI API.";

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes("api key") || errorMessage.includes("unauthorized")) {
        userFriendlyMessage = "Authentication failed with OpenAI. Please check if your API key is valid and has the necessary permissions.";
      } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
        userFriendlyMessage = "OpenAI API rate limit exceeded. Please wait a moment and try again later.";
      } else if (errorMessage.includes("insufficient_quota")) {
        userFriendlyMessage = "OpenAI API quota exceeded. Please check your billing and usage limits.";
      }
    }
    throw new Error(userFriendlyMessage);
  }
};

module.exports = { analyzeCode };
