import { GoogleGenAI } from "@google/genai";
import type { CheckResult } from '../types';

// Fix: Per coding guidelines, the API key must be obtained exclusively from `process.env.API_KEY`.
// The `GoogleGenAI` constructor must be called with a named `apiKey` parameter.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Fix: Per coding guidelines, use `gemini-2.5-flash` for basic text tasks.
const model = 'gemini-2.5-flash';

export const generateScript = async (failedChecks: CheckResult[]): Promise<string> => {
    const failures = failedChecks.map(c => `
        - Check: ${c.checkId}
        - Message: ${c.message}
        - Suggestion: ${c.suggestion}
    `).join('\n');

    const prompt = `
        You are an expert developer assistant. Based on the following failed health checks from a web development environment, generate a bash script that attempts to fix the issues.
        The script should be executable in a standard Linux/macOS environment.
        Provide comments in the script to explain each step.
        Only output the bash script itself, inside a markdown code block with the language set to "bash". Do not include any other text or explanations outside the code block.

        Failed checks:
        ${failures}
    `;

    try {
        // Fix: Per coding guidelines, use `ai.models.generateContent` to query the model.
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });

        // Fix: Per coding guidelines, use the `.text` property to access the generated content.
        const script = response.text;
        
        const match = script.match(/```bash\n([\s\S]*?)\n```/);
        if (match && match[1]) {
            return match[1].trim();
        }
        
        if (!script.includes("```")) {
            return script.trim();
        }
        return "AIからのスクリプトの解析に失敗しました。";

    } catch (error) {
        console.error("Error generating script:", error);
        return `AIスクリプトの生成中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
};
