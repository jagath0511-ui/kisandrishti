import { NextRequest, NextResponse } from 'next/server';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kisandrishti-7801e';
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

/**
 * GET /api/user/sprays?uid=...
 * Fetches user's saved spray diary from Cloud Firestore via standard REST API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
    }

    if (!API_KEY) {
      return NextResponse.json({ sprays: [] });
    }

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}/sprays?key=${API_KEY}`;
    
    const res = await fetch(firestoreUrl, { method: 'GET' });
    if (!res.ok) {
      // 404 means no collection yet
      return NextResponse.json({ sprays: [] });
    }

    const data = await res.json();
    const documents = data.documents || [];

    const sprays = documents.map((doc: any) => {
      const f = doc.fields || {};
      const idParts = doc.name.split('/');
      const id = idParts[idParts.length - 1];

      return {
        id,
        crop: f.crop?.stringValue || '',
        chemical: f.chemical?.stringValue || '',
        sprayDate: f.sprayDate?.stringValue || '',
        intervalDays: parseInt(f.intervalDays?.integerValue || '0', 10),
        safeHarvestDate: f.safeHarvestDate?.stringValue || '',
        timestamp: parseInt(f.timestamp?.integerValue || '0', 10),
      };
    });

    return NextResponse.json({ sprays });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, sprays: [] }, { status: 500 });
  }
}

/**
 * POST /api/user/sprays
 * Saves or updates a spray record into Cloud Firestore via REST API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, spray } = body;

    if (!uid || !spray || !spray.id) {
      return NextResponse.json({ error: 'Missing uid or spray payload' }, { status: 400 });
    }

    if (!API_KEY) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}/sprays/${encodeURIComponent(spray.id)}?key=${API_KEY}`;

    const fieldsPayload = {
      fields: {
        crop: { stringValue: String(spray.crop || '') },
        chemical: { stringValue: String(spray.chemical || '') },
        sprayDate: { stringValue: String(spray.sprayDate || '') },
        intervalDays: { integerValue: String(spray.intervalDays || 0) },
        safeHarvestDate: { stringValue: String(spray.safeHarvestDate || '') },
        timestamp: { integerValue: String(spray.timestamp || Date.now()) },
      },
    };

    const res = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldsPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'Firestore error', details: errText }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

