/**
 * lib/diseaseRadar.ts
 *
 * Pest & Disease Outbreak Early Warning Radar.
 * Pure deterministic epidemiological rules running on 48h Open-Meteo forecast data.
 * $0 Free Tier, 0 MB npm dependencies.
 *
 * Recommends Stage 1 Preventive Organic Sprays BEFORE chemical intervention is needed.
 */

import { HourlyDataPoint, LocalizedText } from './sprayRules';

export interface OutbreakAlert {
  id: 'paddy_blast' | 'chilli_thrips' | 'tomato_late_blight';
  crop: 'paddy' | 'chilli' | 'tomato';
  diseaseName: LocalizedText;
  severity: 'HIGH' | 'MODERATE';
  conditionSummary: LocalizedText;
  preventiveAction: LocalizedText;
  organicSpray: LocalizedText;
}

export interface DiseaseRadarResult {
  hasAlerts: boolean;
  alerts: OutbreakAlert[];
  evaluatedHours: number;
}

/**
 * Pure evaluation function for 48-hour pest and disease early warning
 */
export function evaluateDiseaseRadar(
  hourly: HourlyDataPoint[],
  maxLookaheadHours = 48
): DiseaseRadarResult {
  if (!hourly || hourly.length === 0) {
    return {
      hasAlerts: false,
      alerts: [],
      evaluatedHours: 0,
    };
  }

  const window = hourly.slice(0, maxLookaheadHours);
  const alerts: OutbreakAlert[] = [];

  // --- Rule 1: Paddy Blast Alert ---
  // Night temp < 22°C + Relative Humidity > 85% for >= 3 hours
  const blastFavorableHours = window.filter(
    (p) => p.temperature <= 22 && p.humidity >= 85
  );

  if (blastFavorableHours.length >= 3) {
    alerts.push({
      id: 'paddy_blast',
      crop: 'paddy',
      diseaseName: {
        en: 'Paddy Blast Warning (Leaf & Neck Blast)',
        te: 'వరి అగ్గితెగులు ముందస్తు హెచ్చరిక',
        hi: 'धान का झुलसा रोग (ब्लास्ट) पूर्व चेतावनी',
      },
      severity: blastFavorableHours.length >= 6 ? 'HIGH' : 'MODERATE',
      conditionSummary: {
        en: `Cool temperatures (≤22°C) with persistent high humidity (≥85%) detected across ${blastFavorableHours.length} hours in the forecast. Blast fungal spores germinate rapidly in these conditions.`,
        te: `రాబోయే 48 గంటల్లో చల్లని ఉష్ణోగ్రతలు (≤22°C) మరియు అధిక తేమ (≥85%) ${blastFavorableHours.length} గంటల పాటు కొనసాగే అవకాశం ఉంది. ఈ వాతావరణంలో అగ్గితెగులు శిలీంధ్రం వేగంగా వ్యాపిస్తుంది.`,
        hi: `पूर्वानुमान में ${blastFavorableHours.length} घंटों तक ठंडा तापमान (≤22°C) और अत्यधिक नमी (≥85%) रहने की संभावना है। ऐसे मौसम में ब्लास्ट रोग के बीजाणु तेजी से अंकुरित होते हैं।`,
      },
      preventiveAction: {
        en: 'Scout leaf tips and neck joints immediately. Drain excess stagnant water and withhold top-dressing of urea.',
        te: 'ఆకుల చివర్లు మరియు పిలకలను పరిశీలించండి. పొలంలో నీటిని నిల్వ ఉంచవద్దు, యూరియా వేయడం తాత్కాలికంగా ఆపండి.',
        hi: 'पत्तियों की नोक और तनों का तुरंत निरीक्षण करें। खेत से अतिरिक्त पानी निकालें और यूरिया डालना बंद करें।',
      },
      organicSpray: {
        en: 'Foliar spray with Pseudomonas fluorescens @ 10g/L or Trichoderma viride @ 5g/L as a preventive bio-barrier.',
        te: 'ముందస్తు రక్షణగా సూడోమోనాస్ ఫ్లోరోసెన్స్ 10 గ్రా/లీ లేదా ట్రైకోడెర్మా విరిడే 5 గ్రా/లీ ఆకులపై పిచికారీ చేయండి.',
        hi: 'निवारक जैव-सुरक्षा के लिए स्यूडोमोनास 10 ग्राम/लीटर या ट्राइकोडर्मा 5 ग्राम/लीटर का पर्णीय छिड़काव करें।',
      },
    });
  }

  // --- Rule 2: Chilli Thrips / Mites Flare-up ---
  // Hot and dry spell: Max temp >= 33°C AND all daylight hours have rainProbability < 25%
  const hotHours = window.filter((p) => p.temperature >= 33);
  const maxRainProb = Math.max(...window.map((p) => p.rainProbability));

  if (hotHours.length >= 3 && maxRainProb < 25) {
    alerts.push({
      id: 'chilli_thrips',
      crop: 'chilli',
      diseaseName: {
        en: 'Chilli Sucking Pest Surge (Thrips & Mites)',
        te: 'మిరప తామర పురుగులు & నల్లి పురుగుల హెచ్చరిక',
        hi: 'मिर्च के रस चूसक कीट (थ्रिप्स व माइट्स) चेतावनी',
      },
      severity: hotHours.length >= 6 ? 'HIGH' : 'MODERATE',
      conditionSummary: {
        en: `High temperatures (≥33°C) and completely dry conditions detected across ${hotHours.length} peak hours. Dry heat triggers explosive population growth of sucking pests leading to leaf curl.`,
        te: `ఎండ తీవ్రత (≥33°C) మరియు వర్షం లేని పొడి వాతావరణం ${hotHours.length} గంటల పాటు ఉంది. పొడి వేడి వల్ల తామర మరియు నల్లి పురుగులు తీవ్రమై ఆకు ముడత వస్తుంది.`,
        hi: `पूर्वानुमान में ${hotHours.length} घंटों तक उच्च तापमान (≥33°C) और सूखा मौसम है। शुष्क गर्मी में रस चूसक कीट तेजी से बढ़ते हैं जिससे पत्तियां मुड़ने लगती हैं।`,
      },
      preventiveAction: {
        en: 'Inspect leaf undersides with a hand lens. Erect 15-20 blue and yellow sticky traps per acre.',
        te: 'ఆకుల అడుగు భాగాన్ని పరిశీలించండి. ఎకరానికి 15-20 పసుపు మరియు నీలి రంగు జిగురు అట్టలను అమర్చండి.',
        hi: 'पत्तियों की निचली सतह की जांच करें। प्रति एकड़ 15-20 नीले और पीले चिपचिपे ट्रैप लगाएं।',
      },
      organicSpray: {
        en: 'Spray 5% Neem Seed Kernel Extract (NSKE) or Neem Oil 10,000 ppm @ 2 ml/L in the early morning.',
        te: 'ఉదయాన్నే 5% వేప గింజల కషాయం (NSKE) లేదా వేప నూనె 2 మి.లీ/లీటరు పిచికారీ చేయండి.',
        hi: 'सुबह के समय 5% नीम बीज अर्क (NSKE) या नीम का तेल (2 मिली/लीटर) का छिड़काव करें।',
      },
    });
  }

  // --- Rule 3: Tomato Late Blight Alert ---
  // Overcast/wet + Humidity > 85% + Temp between 18°C and 25°C
  const blightFavorableHours = window.filter(
    (p) => p.temperature >= 18 && p.temperature <= 25 && p.humidity >= 85 && p.rainProbability >= 30
  );

  if (blightFavorableHours.length >= 3) {
    alerts.push({
      id: 'tomato_late_blight',
      crop: 'tomato',
      diseaseName: {
        en: 'Tomato Late Blight Watch',
        te: 'టమాట లేట్ బ్లైట్ (మచ్చ తెగులు) హెచ్చరిక',
        hi: 'टमाटर का पछेती झुलसा (लेट ब्लाइट) निगरानी',
      },
      severity: blightFavorableHours.length >= 6 ? 'HIGH' : 'MODERATE',
      conditionSummary: {
        en: `Prolonged moderate temperatures (18–25°C) with rain and high humidity (>85%) over ${blightFavorableHours.length} hours. Late blight fungus spreads aggressively in wet, cool conditions.`,
        te: `చల్లని ఉష్ణోగ్రతలు (18-25°C), వర్షం మరియు అధిక తేమ (>85%) ${blightFavorableHours.length} గంటల పాటు ఉన్నాయి. లేట్ బ్లైట్ తెగులు త్వరగా వ్యాపించే ప్రమాదం ఉంది.`,
        hi: `पूर्वानुमान में वर्षा और उच्च आर्द्रता (>85%) के साथ मध्यम तापमान (18-25°C) है। गीले और ठंडे मौसम में लेट ब्लाइट फंगस तेजी से फैलता है।`,
      },
      preventiveAction: {
        en: 'Remove lower foliage touching the wet soil. Stake tomato plants to enhance air circulation.',
        te: 'నేలను తాకుతున్న కింది ఆకులను తొలగించండి. మొక్కలకు కర్రలు కట్టి గాలి వెలుతురు తగిలేలా చేయండి.',
        hi: 'गीली मिट्टी को छूने वाली निचली पत्तियों को काटें और पौधों को सहारा देकर हवा का आवागमन बढ़ाएं।',
      },
      organicSpray: {
        en: 'Foliar spray with Trichoderma harzianum @ 5g/L before rain or apply certified Copper Oxychloride 50% WP @ 2.5g/L as a protective barrier.',
        te: 'వర్షానికి ముందు ట్రైకోడెర్మా హర్జియానమ్ 5 గ్రా/లీ లేదా కాపర్ ఆక్సీక్లోరైడ్ 2.5 గ్రా/లీ పిచికారీ చేయండి.',
        hi: 'बारिश से पहले ट्राइकोडर्मा 5 ग्राम/लीटर या कॉपर ऑक्सीक्लोराइड 2.5 ग्राम/लीटर का सुरक्षात्मक छिड़काव करें।',
      },
    });
  }

  return {
    hasAlerts: alerts.length > 0,
    alerts,
    evaluatedHours: window.length,
  };
}
