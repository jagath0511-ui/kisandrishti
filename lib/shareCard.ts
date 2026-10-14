/**
 * lib/shareCard.ts
 *
 * 1-Tap WhatsApp "Ask MPEO / Rythu Bharosa Card" Generator.
 * Uses native HTML5 Canvas API + Web Share API.
 * $0 Free Tier, 0 MB npm dependencies.
 *
 * Safe consultation bridge when AI confidence is Low (<0.5) or Medium (0.5 - 0.75).
 */

export interface OfficerCardInput {
  cropName: string;
  problemName: string;
  confidenceScore: number;
  confidenceLevel: 'low' | 'medium';
  districtName?: string;
  weatherSummary?: string;
  photoUrl?: string; // Data URL or Image URL
  lang?: 'en' | 'te' | 'hi';
}

export interface OfficerShareMessage {
  text: string;
  whatsappUrl: string;
}

/**
 * Builds formatted text summary for sharing with agricultural officers
 */
export function buildOfficerShareText(data: OfficerCardInput): OfficerShareMessage {
  const lang = data.lang || 'en';
  const confidencePct = Math.round(data.confidenceScore * 100);
  const district = data.districtName || 'Andhra Pradesh / Telangana';
  const weather = data.weatherSummary || 'Sunny / Normal';

  let text = '';
  if (lang === 'te') {
    text = `🌾 *కిసాన్‌దృష్టి - రైతు భరోసా / వ్యవసాయ అధికారి (MPEO) పరిశీలన కార్డు*
📍 *ప్రాంతం/జిల్లా:* ${district}
🌱 *పంట:* ${data.cropName}
🔍 *అనుమానిత సమస్య:* ${data.problemName} (ఖచ్చితత్వం: ${confidencePct}%)
⛅ *క్షేత్ర వాతావరణం:* ${weather}
⚠️ *గమనిక:* AI ఖచ్చితత్వం తక్కువ/మధ్యస్థంగా ఉంది కాబట్టి సరైన నివారణ మందుల కోసం మానవ వ్యవసాయ నిపుణుల / MPEO సలహా కోరబడుతోంది.`;
  } else if (lang === 'hi') {
    text = `🌾 *किसानदृष्टि - कृषि अधिकारी / किसान सेवा केंद्र परामर्श कार्ड*
📍 *जिला/स्थान:* ${district}
🌱 *फसल:* ${data.cropName}
🔍 *संभावित समस्या:* ${data.problemName} (सटीकता: ${confidencePct}%)
⛅ *मौसम स्थिति:* ${weather}
⚠️ *सूचना:* AI सटीकता स्तर कम/मध्यम है। सही दवा और रोकथाम के लिए कृषि अधिकारी (MPEO) का परामर्श आवश्यक है।`;
  } else {
    text = `🌾 *KisanDrishti - Rythu Bharosa / Agriculture Officer Consultation Card*
📍 *District:* ${district}
🌱 *Crop:* ${data.cropName}
🔍 *Suspected Problem:* ${data.problemName} (AI Confidence: ${confidencePct}%)
⛅ *Field Weather:* ${weather}
⚠️ *Notice:* Confidence is low/medium. In-person verification by MPEO / Agronomist requested before chemical application.`;
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return { text, whatsappUrl };
}

/**
 * Generates a high-contrast 720x960 Canvas image consultation card
 */
export async function generateConsultationCardBlob(data: OfficerCardInput): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('Canvas card generation is only supported in browser runtime.');
  }

  const canvas = document.createElement('canvas');
  const width = 720;
  const height = 960;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not acquire 2D canvas context.');
  }

  // Background
  ctx.fillStyle = '#064e3b'; // Emerald 900
  ctx.fillRect(0, 0, width, height);

  // Inner card background
  ctx.fillStyle = '#ffffff';
  ctx.roundRect ? ctx.roundRect(20, 20, width - 40, height - 40, 24) : ctx.rect(20, 20, width - 40, height - 40);
  ctx.fill();

  // Top header banner
  ctx.fillStyle = '#047857'; // Emerald 700
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(20, 20, width - 40, 110, [24, 24, 0, 0]);
    ctx.fill();
  } else {
    ctx.fillRect(20, 20, width - 40, 110);
  }

  // Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText('🌾 KisanDrishti Field Consultation Card', 44, 65);
  ctx.font = '500 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#d1fae5';
  ctx.fillText('Rythu Bharosa Kendra (RBK) / MPEO Expert Verification', 44, 98);

  // Metadata pill
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(44, 150, width - 88, 55);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(`📍 ${data.districtName || 'AP / Telangana'}`, 60, 185);
  ctx.font = 'normal 16px system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`📅 ${dateStr}`, width - 200, 185);

  // Crop Photo area
  const photoY = 220;
  const photoHeight = 360;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.fillRect(44, photoY, width - 88, photoHeight);
  ctx.strokeRect(44, photoY, width - 88, photoHeight);

  if (data.photoUrl) {
    try {
      const img = await loadImage(data.photoUrl);
      // Fit inside photo box keeping aspect ratio
      const boxW = width - 88;
      const boxH = photoHeight;
      const hRatio = boxW / img.width;
      const vRatio = boxH / img.height;
      const ratio = Math.min(hRatio, vRatio);
      const centerShiftX = (boxW - img.width * ratio) / 2;
      const centerShiftY = (boxH - img.height * ratio) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(44, photoY, boxW, boxH);
      ctx.clip();
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        44 + centerShiftX,
        photoY + centerShiftY,
        img.width * ratio,
        img.height * ratio
      );
      ctx.restore();
    } catch {
      // Photo failed to load, display fallback placeholder
      drawPhotoPlaceholder(ctx, width, photoY, photoHeight);
    }
  } else {
    drawPhotoPlaceholder(ctx, width, photoY, photoHeight);
  }

  // Diagnostic Results Box
  const diagY = 600;
  ctx.fillStyle = '#fef2f2';
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 2;
  ctx.fillRect(44, diagY, width - 88, 170);
  ctx.strokeRect(44, diagY, width - 88, 170);

  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`Crop: ${data.cropName}`, 64, diagY + 40);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`Suspected: ${data.problemName}`, 64, diagY + 75);

  const confPct = Math.round(data.confidenceScore * 100);
  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(`AI Confidence: ${data.confidenceLevel.toUpperCase()} (${confPct}%)`, 64, diagY + 110);

  ctx.fillStyle = '#475569';
  ctx.font = 'italic 15px system-ui, sans-serif';
  ctx.fillText('⚠️ Strict Safety Gate: AI withheld chemical dosages. Human verification required.', 64, diagY + 145);

  // Footer notes
  ctx.fillStyle = '#10b981';
  ctx.fillRect(44, 790, width - 88, 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText('👨‍🌾 Action for Farmer / MPEO:', 64, 825);
  ctx.font = 'normal 15px system-ui, sans-serif';
  ctx.fillText('1. Show this card to your Village Agriculture Assistant (VAA) at RBK.', 64, 855);
  ctx.fillText('2. Verify leaf underside & stem before purchasing any agrochemical.', 64, 880);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create JPEG Blob from canvas'));
      }
    }, 'image/jpeg', 0.9);
  });
}

function drawPhotoPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  photoY: number,
  photoHeight: number
) {
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('📷 Crop Leaf Photo Attached', width / 2, photoY + photoHeight / 2);
  ctx.textAlign = 'start';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Triggers native Web Share API with card file, or falls back to WhatsApp wa.me text link
 */
export async function shareConsultationCard(data: OfficerCardInput): Promise<{ sharedVia: 'native' | 'whatsapp' }> {
  const shareText = buildOfficerShareText(data);

  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.share) {
    try {
      const blob = await generateConsultationCardBlob(data);
      const file = new File([blob], `kisandrishti_${data.cropName}_consultation.jpg`, { type: 'image/jpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'KisanDrishti Field Consultation Card',
          text: shareText.text,
          files: [file],
        });
        return { sharedVia: 'native' };
      }
    } catch {
      // User cancelled or file sharing unsupported, continue to WhatsApp fallback
    }
  }

  // Fallback: Open WhatsApp directly
  if (typeof window !== 'undefined') {
    window.open(shareText.whatsappUrl, '_blank', 'noopener,noreferrer');
  }
  return { sharedVia: 'whatsapp' };
}
