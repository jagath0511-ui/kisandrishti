import compatibilityData from '../data/compatibility.json';

export type CompatibilityStatus = 'SAFE_TO_MIX' | 'COMPATIBLE_WITH_WALE' | 'CAUTION' | 'INCOMPATIBLE';

export interface CompatibilityCheckResult {
  status: CompatibilityStatus;
  statusLabel: string;
  reason: string;
  mixingOrder: Array<{
    step: number;
    letter: string;
    chemical: string;
    formulation: string;
    instructions: string;
  }>;
  jarTestAdvice: string;
  isHazardous: boolean;
}

/**
 * Checks physical and chemical compatibility between two formulation types
 * (e.g. WP, EC, SC, SL, COPPER, SULPHUR, FERTILIZER)
 */
export function checkMixCompatibility(
  formulationA: string,
  formulationB: string,
  chemAName = 'Chemical A',
  chemBName = 'Chemical B',
  language: 'en' | 'te' | 'hi' = 'en'
): CompatibilityCheckResult {
  const normA = (formulationA || '').trim().toUpperCase();
  const normB = (formulationB || '').trim().toUpperCase();

  const rules = compatibilityData.incompatibility_rules;

  // Search rule in either direction (A + B or B + A)
  const matchedRule = rules.find(
    (r) =>
      (r.typeA === normA && r.typeB === normB) ||
      (r.typeA === normB && r.typeB === normA)
  );

  let status: CompatibilityStatus = 'SAFE_TO_MIX';
  let reason = '';
  let isHazardous = false;

  if (matchedRule) {
    status = matchedRule.status as CompatibilityStatus;
    const reasonsMap = matchedRule.reason as Record<'en' | 'te' | 'hi', string>;
    reason = reasonsMap[language] || reasonsMap.en;
    if (status === 'INCOMPATIBLE') isHazardous = true;
  } else {
    // Default safe with general good practice
    const defaultMessages: Record<'en' | 'te' | 'hi', string> = {
      en: 'No known chemical clash detected. Always follow the W-A-L-E order and run a 15-minute jar test before tank mixing.',
      te: 'ఈ మందుల మధ్య తీవ్రమైన ప్రతిచర్యలు లేవు. ఎల్లప్పుడూ W-A-L-E క్రమం పాటించండి మరియు ట్యాంకులో కలపడానికి ముందు జార్ టెస్ట్ చేయండి.',
      hi: 'इन रसायनों के बीच कोई प्रतिकूल प्रतिक्रिया नहीं पाई गई। हमेशा W-A-L-E क्रम का पालन करें और 15 मिनट का जार परीक्षण करें।'
    };
    reason = defaultMessages[language] || defaultMessages.en;
  }

  // Determine W-A-L-E sequence
  const classA = (compatibilityData.formulation_classes as any)[normA] || { wale_order: 2, wale_step: 'L' };
  const classB = (compatibilityData.formulation_classes as any)[normB] || { wale_order: 2, wale_step: 'L' };

  const items = [
    { name: chemAName, formulation: normA, order: classA.wale_order, stepTitle: classA.wale_step },
    { name: chemBName, formulation: normB, order: classB.wale_order, stepTitle: classB.wale_step },
  ];

  // Sort by W-A-L-E sequence (1 to 4)
  items.sort((a, b) => a.order - b.order);

  const mixingOrder = items.map((item, idx) => ({
    step: idx + 1,
    letter: item.order === 1 ? 'W' : item.order === 2 ? 'A' : item.order === 3 ? 'L' : 'E',
    chemical: item.name,
    formulation: item.formulation,
    instructions:
      item.order === 1
        ? 'Pre-mix powder with water in small bucket first to make a smooth slurry before pouring into tank.'
        : item.order === 4
        ? 'Add oil/EC formulation LAST after all powders and water are agitated.'
        : 'Agitate water thoroughly while pouring into half-filled tank.',
  }));

  const statusLabels: Record<CompatibilityStatus, Record<'en' | 'te' | 'hi', string>> = {
    SAFE_TO_MIX: {
      en: 'Generally Compatible',
      te: 'కలపడానికి అనుకూలం',
      hi: 'मिलाने के लिए उपयुक्त',
    },
    COMPATIBLE_WITH_WALE: {
      en: 'Mix With W-A-L-E Order Only',
      te: 'W-A-L-E క్రమంలో మాత్రమే కలపాలి',
      hi: 'केवल W-A-L-E क्रम में ही मिलाएं',
    },
    CAUTION: {
      en: 'Caution: Potential Residue / Sludge',
      te: 'హెచ్చరిక: అవక్షేపం ఏర్పడే ప్రమాదం',
      hi: 'सावधानी: तलछट बनने का खतरा',
    },
    INCOMPATIBLE: {
      en: 'DO NOT MIX — Crop Burn Risk',
      te: 'కలపవద్దు — పంట మాడిపోయే ప్రమాదం',
      hi: 'एक साथ न मिलाएं — फसल जलने का खतरा',
    },
  };

  const jarTestAdvice: Record<'en' | 'te' | 'hi', string> = {
    en: 'Golden Rule: Test in a 500ml glass jar with farm water for 15 minutes. If it curdles, clumps or heats up, never spray.',
    te: 'బంగారు నియమం: 500 మి.లీ గాజు సీసాలో మందులు కలిపి 15 నిమిషాలు ఉంచండి. గడ్డకట్టినా లేదా వేడెక్కినా ట్యాంకులో కలపకండి.',
    hi: 'स्वर्ण नियम: 500 मिलीलीटर कांच के जार में 15 मिनट तक परीक्षण करें। यदि थक्के जमते हैं या गर्म होता है, तो कभी न छिड़कें।'
  };

  return {
    status,
    statusLabel: statusLabels[status][language] || statusLabels[status].en,
    reason,
    mixingOrder,
    jarTestAdvice: jarTestAdvice[language] || jarTestAdvice.en,
    isHazardous,
  };
}

/**
 * Returns W-A-L-E steps guide
 */
export function getWaleStepsGuide() {
  return compatibilityData.wale_rules;
}

/**
 * Returns 15-minute jar test protocol
 */
export function getJarTestGuide() {
  return compatibilityData.jar_test_guide;
}

