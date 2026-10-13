import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { getAllowedKeys } from './treatments';

export const DiagnosisOutputSchema = z.object({
  is_plant_photo: z.boolean(),
  image_quality: z.enum(['good', 'fair', 'poor']),
  crop: z.string().nullable(),
  problem_type: z.enum([
    'fungal',
    'bacterial',
    'viral',
    'pest',
    'nutrient_deficiency',
    'environmental',
    'healthy',
    'unknown',
  ]),
  problem_name: z.string(),
  treatment_key: z.string().nullable(),
  confidence_score: z.number().min(0).max(1),
  affected_area_range: z.enum([
    'none',
    'under_10',
    '10_to_30',
    '30_to_60',
    'over_60',
    'unknown',
  ]),
  visible_symptoms: z.array(z.string()),
  reasoning: z.string(),
  retake_advice: z.string().nullable(),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;

export interface CallGeminiDiagnosisParams {
  imageBase64: string;
  mimeType: string;
  language: 'en' | 'te' | 'hi';
  cropHint?: string | null;
}

const LANGUAGE_INSTRUCTIONS: Record<'en' | 'te' | 'hi', string> = {
  en: 'Write "reasoning" and "retake_advice" in simple English using plain words suited for a small farmer.',
  te: 'Write "reasoning" and "retake_advice" in simple Telugu (తెలుగు) using plain, colloquial words that an Indian farmer understands.',
  hi: 'Write "reasoning" and "retake_advice" in simple Hindi (हिंदी) using plain, colloquial words that an Indian farmer understands.',
};

/**
 * Calls Gemini via the official @google/genai SDK to diagnose plant health from a photo.
 * Strictly adheres to safety rules: never mentions chemicals, doses or dilutions.
 */
export async function callGeminiDiagnosis(
  params: CallGeminiDiagnosisParams
): Promise<DiagnosisOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_API_KEY: GEMINI_API_KEY environment variable is not configured.');
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const ai = new GoogleGenAI({ apiKey });

  const allowedKeys = getAllowedKeys();
  const allowedKeysList = allowedKeys.join(', ');
  const langPrompt = LANGUAGE_INSTRUCTIONS[params.language] || LANGUAGE_INSTRUCTIONS.en;

  const systemPrompt = `You are a plant-health diagnosis assistant for small farmers in India.
Your task is to analyze the provided crop photo and describe ONLY what is visually observable.

CRITICAL SAFETY & OPERATIONAL RULES:
1. You must NEVER mention chemical product names, chemical sprays, dosages, dilution ratios, toxicity classes, or pre-harvest intervals. That is strictly forbidden.
2. Treatment key selection:
   - Choose 'treatment_key' ONLY from this exact allowed list: [${allowedKeysList}], OR set it to null.
   - If the crop or disease does not clearly match any allowed key, set 'treatment_key' to null.
3. Image validity & quality:
   - If the photo does not depict a plant, set 'is_plant_photo' to false, 'problem_type' to 'unknown', 'treatment_key' to null, and explain in 'retake_advice'.
   - If the photo is too blurry, too dark, out-of-focus, or unreadable, set 'image_quality' to 'poor', lower 'confidence_score' (< 0.5), and specify friendly retake instructions in 'retake_advice'.
4. Language requirement:
   - ${langPrompt}
   - 'problem_name' must always be in plain English.
   - 'visible_symptoms' must be concise descriptive observations.
5. Farmer Context:
   ${params.cropHint ? `Farmer indicated crop hint: "${params.cropHint}".` : 'No crop hint provided.'}`;

  // Sanitize base64 (strip data URI prefix if present)
  const cleanBase64 = params.imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '').trim();

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: params.mimeType,
        },
      },
      'Analyze this crop photo and diagnose the plant health condition according to your instructions.',
    ],
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          is_plant_photo: {
            type: Type.BOOLEAN,
            description: 'True if the photo contains a plant/crop, false otherwise.',
          },
          image_quality: {
            type: Type.STRING,
            enum: ['good', 'fair', 'poor'],
            description: 'Visual clarity and lighting of the plant.',
          },
          crop: {
            type: Type.STRING,
            nullable: true,
            description: 'Identified crop type (e.g. paddy, chilli, tomato) or null.',
          },
          problem_type: {
            type: Type.STRING,
            enum: [
              'fungal',
              'bacterial',
              'viral',
              'pest',
              'nutrient_deficiency',
              'environmental',
              'healthy',
              'unknown',
            ],
            description: 'Type of condition observed.',
          },
          problem_name: {
            type: Type.STRING,
            description: 'Plain English name of the problem or condition.',
          },
          treatment_key: {
            type: Type.STRING,
            nullable: true,
            description: 'One key from the allowed list, or null.',
          },
          confidence_score: {
            type: Type.NUMBER,
            description: 'Confidence score between 0.0 and 1.0.',
          },
          affected_area_range: {
            type: Type.STRING,
            enum: ['none', 'under_10', '10_to_30', '30_to_60', 'over_60', 'unknown'],
            description: 'Estimated visual plant area damaged.',
          },
          visible_symptoms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Bullet points of observed visual symptoms.',
          },
          reasoning: {
            type: Type.STRING,
            description: 'Short explanation in the farmer chosen language.',
          },
          retake_advice: {
            type: Type.STRING,
            nullable: true,
            description: 'Advice on how to retake a clearer photo, in chosen language.',
          },
        },
        required: [
          'is_plant_photo',
          'image_quality',
          'problem_type',
          'problem_name',
          'confidence_score',
          'affected_area_range',
          'visible_symptoms',
          'reasoning',
        ],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('EMPTY_GEMINI_RESPONSE: Gemini returned an empty response.');
  }

  const parsed = JSON.parse(text);
  return DiagnosisOutputSchema.parse(parsed);
}
