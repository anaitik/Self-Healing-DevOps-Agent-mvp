
import { GoogleGenAI, Type } from "@google/genai";
import { Incident, RemediationPlan } from "../types";
import { SYSTEM_PROMPT } from "../constants";

export const analyzeIncident = async (incident: Incident): Promise<RemediationPlan> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze the following production monitoring alert.

    Service Name: ${incident.service}
    Environment: ${incident.environment}
    Alert Type: ${incident.alertType}
    Error Rate: ${incident.errorRate}
    Threshold: ${incident.threshold}
    Recent Deployment: ${incident.recentDeployment}
    Last Commit Message: ${incident.lastCommitMessage}
    System Metrics: ${incident.metrics.map(m => m.value).join(', ')}
    Recent Logs:
    ${incident.logs.map(l => `[${l.level}] ${l.message}`).join('\n')}
    Repository Language: ${incident.repositoryLanguage}

    Identify: (1) runtime errors and suggest fixes, (2) security vulnerabilities (CVEs, secrets, auth) and suggest patches/upgrades, (3) config or connectivity issues.
    Return JSON in this format:

    {
      "root_cause_category": "",
      "root_cause_summary": "",
      "severity": "low | medium | high | critical",
      "confidence": 0.0,
      "auto_patch_safe": true | false,
      "recommended_fix_description": "",
      "suggested_code_patch": "",
      "suggested_branch_name": "",
      "suggested_commit_message": "",
      "finding_type": "runtime_error | security_vulnerability | performance | config | connectivity | other",
      "cve_ids": [],
      "affected_components": []
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1, // Lower temperature for higher determinism
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            root_cause_category: { type: Type.STRING },
            root_cause_summary: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
            confidence: { type: Type.NUMBER },
            auto_patch_safe: { type: Type.BOOLEAN },
            recommended_fix_description: { type: Type.STRING },
            suggested_code_patch: { type: Type.STRING },
            suggested_branch_name: { type: Type.STRING },
            suggested_commit_message: { type: Type.STRING },
            finding_type: { type: Type.STRING, enum: ['runtime_error', 'security_vulnerability', 'performance', 'config', 'connectivity', 'other'] },
            cve_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
            affected_components: { type: Type.ARRAY, items: { type: Type.STRING } },
            target_file: { type: Type.STRING }
          },
          required: [
            "root_cause_category",
            "root_cause_summary",
            "severity",
            "confidence",
            "auto_patch_safe",
            "recommended_fix_description",
            "suggested_code_patch",
            "suggested_branch_name",
            "suggested_commit_message"
          ]
        }
      }
    });

    const text = response.text.trim();
    return JSON.parse(text) as RemediationPlan;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze incident using Gemini.");
  }
};
