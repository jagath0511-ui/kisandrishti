import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { checkRateLimit } from '../../../lib/rateLimit';

export const maxDuration = 30;

const RequestBodySchema = z.object({
  imageBase64: z.string().min(1, 'Image data is required'),
  mimeType: z
    .string()
    .refine(
      (m) => ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(m.toLowerCase()),
      'Supported image formats are JPEG, PNG, or WebP'
    ),
});

export interface LandParseResponse {
  village: string | null;
  mandal: string | null;
  surveyNumber: string | null;
  acres: number | null;
  centsOrGuntas: number | null;
  cornerCoordinates: { lat: number; lng: number }[] | null;
  rawTextSummary?: string;
  isMockFallback?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check (10 req/10 min per IP)
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous-client';

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: `Too many land scan requests. Please wait ${rateLimit.resetInSeconds} seconds.`,
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } }
      );
    }

    // 2. Parse & Validate JSON payload
    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'invalid_json', message: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    const validation = RequestBodySchema.safeParse(bodyJson);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'validation_error', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType } = validation.data;
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '').trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Safe fallback when API key is not configured in environment
      return NextResponse.json<LandParseResponse>({
        village: 'Surampalem',
        mandal: 'Gandepalli',
        surveyNumber: '142/2B',
        acres: 1.4,
        centsOrGuntas: 40,
        cornerCoordinates: null,
        rawTextSummary: 'Offline Mode: Default AP Pattadar Land Record loaded.',
        isMockFallback: true,
      });
    }

    // 3. Call Gemini Flash Multimodal with strict JSON schema
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const prompt = `You are an expert Indian revenue and land records OCR parser.
Analyze this image of an agricultural land document from Andhra Pradesh (Meebhoomi 1B, Adangal, Bhu Hakku LP Map, FMB, Pattadar Passbook) or Telangana (Dharani Passbook, Bhu Bharati, Pahani).
Extract:
1. Village name (గ్రామము / गाँव)
2. Mandal / Tehsil name (మండలం / तहसील)
3. Survey Number / Sub-division / LP Number (సర్వే నంబరు / सर्वे नंबर)
4. Total Extent / Area in Acres (ఎకరాలు / एकड़) as a numeric float (e.g., 1.40).
5. Remaining Cents or Guntas as a numeric float (e.g., 40).
6. Corner GPS coordinates (latitude, longitude) IF and ONLY IF printed explicitly on the map/document. Otherwise, set to null.

Be resilient to printed Telugu, Hindi, and English fonts, table grids, stamps, and seals.`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            village: { type: Type.STRING, nullable: true },
            mandal: { type: Type.STRING, nullable: true },
            surveyNumber: { type: Type.STRING, nullable: true },
            acres: { type: Type.NUMBER, nullable: true },
            centsOrGuntas: { type: Type.NUMBER, nullable: true },
            cornerCoordinates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lat: { type: Type.NUMBER },
                  lng: { type: Type.NUMBER },
                },
                required: ['lat', 'lng'],
              },
              nullable: true,
            },
            rawTextSummary: { type: Type.STRING, nullable: true },
          },
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error('Empty response received from Gemini model.');
    }

    const parsedData = JSON.parse(responseText);

    return NextResponse.json<LandParseResponse>({
      village: parsedData.village || null,
      mandal: parsedData.mandal || null,
      surveyNumber: parsedData.surveyNumber || null,
      acres: typeof parsedData.acres === 'number' ? parsedData.acres : null,
      centsOrGuntas: typeof parsedData.centsOrGuntas === 'number' ? parsedData.centsOrGuntas : null,
      cornerCoordinates: Array.isArray(parsedData.cornerCoordinates) && parsedData.cornerCoordinates.length >= 3
        ? parsedData.cornerCoordinates
        : null,
      rawTextSummary: parsedData.rawTextSummary || undefined,
    });
  } catch (error) {
    console.error('Land parse error:', error);
    // Safe try/catch fallback so the frontend never crashes on blurry images or API hiccups
    return NextResponse.json<LandParseResponse>({
      village: null,
      mandal: null,
      surveyNumber: null,
      acres: null,
      centsOrGuntas: null,
      cornerCoordinates: null,
      rawTextSummary: 'Could not extract clear land data. Please enter survey number and acres manually.',
      isMockFallback: true,
    });
  }
}
