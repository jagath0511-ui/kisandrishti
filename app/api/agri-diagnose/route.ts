import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGeminiDiagnosis, DiagnosisOutputSchema } from '../../../lib/gemini';
import { getAllowedKeys, getTreatment, resolveConfidence } from '../../../lib/treatments';
import { checkRateLimit } from '../../../lib/rateLimit';
// Increase Vercel function timeout to 30 seconds for Gemini multimodal inference
export const maxDuration = 30;

// Input validation schema
const RequestBodySchema = z.object({
  imageBase64: z.string().min(1, 'Image data is required'),
  mimeType: z
    .string()
    .refine(
      (m) => ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(m.toLowerCase()),
      'Supported image formats are JPEG, PNG, or WebP'
    ),
  language: z.enum(['en', 'te', 'hi'], {
    message: 'Supported languages are en, te, or hi',
  }),
  cropHint: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting Check (10 req/10 min per IP, skipped if EVAL_MODE === "true")
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous-client';

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'rate_limit_exceeded',
          message: `Too many diagnosis requests. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    // 2. Parse & Validate Request Body
    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'invalid_json',
          message: 'Malformed JSON payload.',
        },
        { status: 400 }
      );
    }

    const validation = RequestBodySchema.safeParse(bodyJson);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: 'Invalid request data.',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType, language, cropHint } = validation.data;

    // 3. Size Check (Reject images larger than ~3 MB)
    // Clean potential data URL prefix
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '').trim();
    const approximateBytes = Math.ceil((cleanBase64.length * 3) / 4);
    const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

    if (approximateBytes > MAX_BYTES) {
      return NextResponse.json(
        {
          error: 'image_too_large',
          message: 'Image size exceeds the 3 MB limit. Please compress or resize the photo before submitting.',
        },
        { status: 413 }
      );
    }

    // 4. API Key Check
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: 'server_configuration_error',
          message: 'Gemini API key is not configured on the server. Please configure GEMINI_API_KEY.',
        },
        { status: 503 }
      );
    }

    // 5. Call Gemini with retry on validation failure
    let rawDiagnosis = null;
    let lastError: Error | null = null;
    const allowedKeys = getAllowedKeys();

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await callGeminiDiagnosis({
          imageBase64: cleanBase64,
          mimeType,
          language,
          cropHint,
        });

        // Validate Gemini output strictly against SPEC schema
        const outputValidation = DiagnosisOutputSchema.safeParse(result);
        if (outputValidation.success) {
          rawDiagnosis = outputValidation.data;
          break;
        } else {
          lastError = new Error('Schema validation failed on Gemini response');
        }
      } catch (err: any) {
        lastError = err;
        // Don't retry on quota limit or missing key
        if (
          err?.message?.includes('429') ||
          err?.message?.includes('RESOURCE_EXHAUSTED') ||
          err?.message?.includes('MISSING_API_KEY')
        ) {
          break;
        }
      }
    }

    if (!rawDiagnosis) {
      // Determine user-friendly error message without leaking sensitive data
      const errMsg = lastError?.message || '';
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        return NextResponse.json(
          {
            error: 'quota_exhausted',
            message: 'Diagnosis service is temporarily busy. Please try again in 1 minute.',
          },
          { status: 429 }
        );
      }

      if (errMsg.includes('FETCH_ERROR') || errMsg.includes('ECONNRESET') || errMsg.includes('ENOTFOUND')) {
        return NextResponse.json(
          {
            error: 'network_error',
            message: 'Could not connect to the diagnosis service. Please check your internet connection.',
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          error: 'diagnosis_failed',
          message: 'Could not analyze this photo clearly. Please take a closer, well-lit photo and try again.',
        },
        { status: 500 }
      );
    }

    // 6. Enforce Safety Rule 4: Treatment key must be in allowedKeys, else null
    let safeKey = rawDiagnosis.treatment_key;
    if (safeKey && !allowedKeys.includes(safeKey)) {
      safeKey = null;
    }

    // 7. Enforce Safety Rule 5: Compute confidence level (low / medium / high)
    const confidence = resolveConfidence(rawDiagnosis.confidence_score);

    // 8. Attach verified treatment from getTreatment (Safety Rules 2, 3, 5)
    const treatment = safeKey ? getTreatment(safeKey, confidence) : null;

    // Return final safe response
    return NextResponse.json({
      is_plant_photo: rawDiagnosis.is_plant_photo,
      image_quality: rawDiagnosis.image_quality,
      crop: rawDiagnosis.crop,
      problem_type: rawDiagnosis.problem_type,
      problem_name: rawDiagnosis.problem_name,
      treatment_key: safeKey,
      confidence_score: rawDiagnosis.confidence_score,
      confidence, // Server-computed: 'low' | 'medium' | 'high'
      affected_area_range: rawDiagnosis.affected_area_range,
      visible_symptoms: rawDiagnosis.visible_symptoms,
      reasoning: rawDiagnosis.reasoning,
      retake_advice: rawDiagnosis.retake_advice,
      treatment,
    });
  } catch (error: any) {
    // Top-level catch guard (never log raw photos)
    return NextResponse.json(
      {
        error: 'internal_server_error',
        message: 'An unexpected error occurred while processing the request.',
      },
      { status: 500 }
    );
  }
}
