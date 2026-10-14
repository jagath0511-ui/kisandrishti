/**
 * lib/soilTexture.ts
 *
 * USDA Soil Texture Triangle pure calculation and classification engine.
 * Implements SPEC.md Sections 5 (F7) and 10.
 *
 * Zero external network calls.
 */

export interface SoilFractions {
  sand: number;
  silt: number;
  clay: number;
}

export type USDAClassKey =
  | 'sand'
  | 'loamy_sand'
  | 'sandy_loam'
  | 'loam'
  | 'silt_loam'
  | 'silt'
  | 'sandy_clay_loam'
  | 'clay_loam'
  | 'silty_clay_loam'
  | 'sandy_clay'
  | 'silty_clay'
  | 'clay';

export interface LocalizedText {
  en: string;
  te: string;
  hi: string;
}

export interface SoilTextureInfo {
  key: USDAClassKey;
  name: LocalizedText;
  description: LocalizedText;
  tips: LocalizedText[];
}

export interface SoilTextureResult {
  fractions: SoilFractions;
  textureClass: USDAClassKey;
  info: SoilTextureInfo;
  /** Normalized coordinates inside an equilateral triangle (0 to 1 range) */
  triangleCoords: {
    x: number;
    y: number;
  };
}

/**
 * Normalizes sand, silt, and clay inputs so that they strictly sum to 100%.
 */
export function normalizeSoilFractions(
  sandRaw: number,
  siltRaw: number,
  clayRaw: number
): SoilFractions {
  const s = Math.max(0, sandRaw);
  const si = Math.max(0, siltRaw);
  const c = Math.max(0, clayRaw);

  const total = s + si + c;
  if (total === 0) {
    return { sand: 34, silt: 33, clay: 33 };
  }

  // Round to nearest integer and balance rounding error
  let sand = Math.round((s / total) * 100);
  const silt = Math.round((si / total) * 100);
  let clay = 100 - (sand + silt);

  // Guard edge rounding overshoot
  if (clay < 0) {
    sand = Math.max(0, sand + clay);
    clay = 0;
  }

  return { sand, silt, clay };
}

/**
 * Pure USDA texture triangle classifier based on official USDA NRCS soil taxonomy rules.
 */
export function classifySoilTexture(
  sand: number,
  silt: number,
  clay: number
): USDAClassKey {
  if (clay >= 40) {
    if (silt >= 40) return 'silty_clay';
    if (sand <= 45) return 'clay';
    return 'sandy_clay';
  }

  if (clay >= 35 && sand >= 45) {
    return 'sandy_clay';
  }

  if (clay >= 27) {
    if (sand <= 20) return 'silty_clay_loam';
    if (sand <= 45) return 'clay_loam';
    return 'sandy_clay_loam';
  }

  if (clay >= 20 && sand >= 45 && silt < 28) {
    return 'sandy_clay_loam';
  }

  if (silt >= 80 && clay < 12) {
    return 'silt';
  }

  if (
    (silt >= 50 && clay < 27) ||
    (silt >= 50 && silt < 80 && clay < 12)
  ) {
    return 'silt_loam';
  }

  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) {
    return 'loam';
  }

  if (sand >= 85 && silt + 1.5 * clay < 15) {
    return 'sand';
  }

  if (sand >= 70 && silt + 1.5 * clay >= 15 && sand < 90) {
    return 'loamy_sand';
  }

  if (
    (clay < 20 && sand >= 52 && silt + 2 * clay >= 30) ||
    (clay >= 7 && clay < 20 && sand >= 43 && sand <= 52)
  ) {
    return 'sandy_loam';
  }

  return 'loam';
}

export const USDA_SOIL_PROFILES: Record<USDAClassKey, SoilTextureInfo> = {
  loam: {
    key: 'loam',
    name: {
      en: 'Loam Soil',
      te: 'ఒండ్రు నేల (లోమ్)',
      hi: 'दोमट मिट्टी',
    },
    description: {
      en: 'Ideal balanced soil with near-equal properties of sand, silt, and clay. Excellent moisture and nutrient retention.',
      te: 'ఇసుక, సిల్ట్ మరియు బంకమట్టి సమాన నిష్పత్తిలో ఉండే అత్యుత్తమ నేల. తేమ మరియు పోషకాలను చక్కగా నిలుపుకుంటుంది.',
      hi: 'रेत, गाद और चिकनी मिट्टी का आदर्श संतुलन। नमी और पोषक तत्वों को अच्छी तरह बनाए रखती है।',
    },
    tips: [
      {
        en: 'Maintain high organic carbon by incorporating well-rotted farmyard manure (FYM) or green manure every season.',
        te: 'ప్రతి సీజన్‌లో పశువుల ఎరువు లేదా పచ్చిరొట్ట ఎరువులను కలిపి నేలలో సేంద్రీయ కర్బనాన్ని కాపాడండి.',
        hi: 'हर मौसम में अच्छी तरह सड़ी हुई गोबर की खाद या हरी खाद मिलाकर जैविक कार्बन बनाए रखें।',
      },
      {
        en: 'Suitable for a wide variety of crops including paddy, chilli, cotton, maize, and horticultural crops.',
        te: 'వరి, మిర్చి, పత్తి, మొక్కజొన్న మరియు ఉద్యాన పంటలన్నింటికీ అత్యంత అనుకూలం.',
        hi: 'धान, मिर्च, कपास, मक्का और सब्जियों जैसी अधिकांश फसलों के लिए बहुत उपयुक्त।',
      },
      {
        en: 'Avoid over-tillage when the soil is overly moist to preserve natural aggregate structure.',
        te: 'నేల నిర్మాణం దెబ్బతినకుండా ఉండేందుకు తేమ ఎక్కువగా ఉన్నప్పుడు అధికంగా దున్నవద్దు.',
        hi: 'मिट्टी की प्राकृतिक संरचना बनाए रखने के लिए अधिक गीली होने पर गहरी जुताई से बचें।',
      },
    ],
  },
  sand: {
    key: 'sand',
    name: {
      en: 'Sandy Soil',
      te: 'ఇసుక నేల',
      hi: 'बलुई (रेतीली) मिट्टी',
    },
    description: {
      en: 'Gritty, loose particles with very large pore spaces. Drains water and leaches nutrients rapidly.',
      te: 'ఇసుక రేణువులు ఎక్కువగా ఉండే వదులైన నేల. నీరు మరియు పోషకాలు త్వరగా ఇంకిపోతాయి.',
      hi: 'मोटे कणों वाली ढीली मिट्टी। इसमें पानी और खाद बहुत तेजी से नीचे बह जाते हैं।',
    },
    tips: [
      {
        en: 'Apply organic matter, vermicompost, and bio-fertilizers frequently to build water-holding capacity.',
        te: 'నీటిని పట్టి ఉంచే శక్తిని పెంచడానికి పశువుల ఎరువు, వర్మీకంపోస్ట్ మరియు జీవ ఎరువులను క్రమం తప్పకుండా వేయండి.',
        hi: 'जल धारण क्षमता बढ़ाने के लिए गोबर की खाद, वर्मीकम्पोस्ट और जैविक खाद प्रचुर मात्रा में डालें।',
      },
      {
        en: 'Irrigate with smaller amounts of water at more frequent intervals (drip irrigation is ideal).',
        te: 'తక్కువ మోతాదులో ఎక్కువ సార్లు నీరు పెట్టండి (బిందు సేద్యం / డ్రిప్ ఇరిగేషన్ చాలా మంచిది).',
        hi: 'कम मात्रा में बार-बार सिंचाई करें (ड्रिप सिंचाई सबसे उपयुक्त है)।',
      },
      {
        en: 'Split chemical or organic fertilizer applications into multiple small doses to prevent leaching loss.',
        te: 'ఎరువులు నీటిలో కొట్టుకుపోకుండా ఉండటానికి ఒకేసారి కాకుండా తక్కువ మోతాదుల్లో పలుమార్లు వేయండి.',
        hi: 'खाद को एक साथ न देकर 3-4 किस्तों में थोड़ा-थोड़ा दें ताकि वह बह न जाए।',
      },
      {
        en: 'Use crop residue mulch to shade the soil and reduce surface evaporation under hot sun.',
        te: 'ఎండ తీవ్రతకు నేల ఆరిపోకుండా ఉండటానికి పంట వ్యర్థాలతో ఆచ్ఛాదన (మల్చింగ్) చేయండి.',
        hi: 'गर्मियों में नमी बनाए रखने के लिए पुआल या सूखी पत्तियों से पलवार (मल्चिंग) करें।',
      },
    ],
  },
  clay: {
    key: 'clay',
    name: {
      en: 'Clay Soil',
      te: 'బంకమట్టి నేల (నల్లరేగడి)',
      hi: 'चिकनी मिट्टी (काली मिट्टी)',
    },
    description: {
      en: 'Dense, sticky when wet, and forms hard clods when dry. Holds large amounts of water and nutrients but drains slowly.',
      te: 'తడిగా ఉన్నప్పుడు జిగటగా, ఎండినప్పుడు గట్టిగా ఉండే బరువైన నేల. నీటిని, ఎరువులను బాగా నిల్వ ఉంచుకుంటుంది కానీ నీరు త్వరగా ఇంకదు.',
      hi: 'गीली होने पर चिपचिपी और सूखने पर सख्त। पानी और पोषक तत्वों को बहुत रोकती है, पर जल निकासी धीमी होती है।',
    },
    tips: [
      {
        en: 'Ensure proper drainage channels in the field to avoid waterlogging and root suffocation during heavy rains.',
        te: 'భారీ వర్షాల సమయంలో నీరు నిల్వ ఉండి వేరు కుళ్ళు రాకుండా పొలంలో మురుగు కాలువలు ఏర్పాటు చేయండి.',
        hi: 'भारी बारिश में जलभराव रोकने के लिए खेत में जल निकासी की नालियां अवश्य बनाएं।',
      },
      {
        en: 'Do not work or plow the field when it is completely saturated, as it causes severe compaction and clodding.',
        te: 'నేల బాగా తడిగా ఉన్నప్పుడు దున్నితే గడ్డలు కట్టి గట్టిపడుతుంది, కాబట్టి సరైన పదును ఉన్నప్పుడే దున్నండి.',
        hi: 'खेत बहुत गीला होने पर जुताई न करें, अन्यथा मिट्टी सख्त ढेलों में बदल जाएगी।',
      },
      {
        en: 'Add gypsum and coarse organic manure to improve aeration, workability, and soil pore space.',
        te: 'నేల వదులుగా మారడానికి జిప్సం మరియు ముతక సేంద్రీయ ఎరువులను కలపండి.',
        hi: 'मिट्टी को भुरभुरी बनाने के लिए जिप्सम और कम्पोस्ट खाद मिलाएं।',
      },
    ],
  },
  sandy_loam: {
    key: 'sandy_loam',
    name: {
      en: 'Sandy Loam Soil',
      te: 'ఇసుక ఒండ్రు నేల',
      hi: 'बलुई दोमट मिट्टी',
    },
    description: {
      en: 'Gritty feel with enough silt and clay to bind nutrients. Warms up quickly and easy to cultivate.',
      te: 'సులభంగా సాగు చేయగల నేల. తేమ మరియు పోషకాలను మితంగా పట్టి ఉంచుతుంది, త్వరగా వేడెక్కుతుంది.',
      hi: 'खेती के लिए आसान और अच्छी मिट्टी। इसमें पर्याप्त मात्रा में गाद और चिकनी मिट्टी होती है।',
    },
    tips: [
      {
        en: 'Excellent for root crops, groundnut, vegetables, and early-season crops.',
        te: 'వేరుశనగ, కూరగాయలు, దుంప పంటలకు చాలా అనుకూలమైన నేల.',
        hi: 'मूंगफली, आलू, प्याज और सब्जियों की खेती के लिए अत्यंत उपयुक्त।',
      },
      {
        en: 'Incorporate regular compost to prevent rapid organic matter depletion.',
        te: 'సేంద్రీయ పదార్థం త్వరగా నశించకుండా ఉండటానికి క్రమం తప్పకుండా కంపోస్ట్ వేయండి.',
        hi: 'मिट्टी की उर्वरता बनाए रखने के लिए नियमित रूप से जैविक खाद डालते रहें।',
      },
      {
        en: 'Monitor moisture levels during hot spells; benefits greatly from mulching.',
        te: 'వేసవి కాలంలో తేమను కాపాడుకోవడానికి మల్చింగ్ పద్ధతిని పాటించండి.',
        hi: 'तेज धूप में नमी की जांच करते रहें और मल्चिंग का उपयोग करें।',
      },
    ],
  },
  silt: {
    key: 'silt',
    name: {
      en: 'Silt Soil',
      te: 'సిల్ట్ నేల (మెత్తటి మట్టి)',
      hi: 'सिल्ट (गादयुक्त) मिट्टी',
    },
    description: {
      en: 'Smooth, floury feel when dry and soapy when wet. Holds significant moisture but susceptible to erosion and surface crusting.',
      te: 'పిండిలా మెత్తగా ఉండే నేల. తేమను బాగా పట్టి ఉంచుతుంది కానీ ఎండినప్పుడు పైభాగం గట్టిగా పెచ్చులు కడుతుంది.',
      hi: 'मुलायम आटे जैसी मिट्टी। नमी को अच्छा रखती है, पर सूखने पर ऊपर से कड़ी पपड़ी बन जाती है।',
    },
    tips: [
      {
        en: 'Gently break surface crusting after rains to help germinating seedlings emerge and breathe.',
        te: 'వర్షం తర్వాత ఏర్పడే పై పొర పెచ్చులను విరిచి విత్తనాలు సులభంగా మొలకెత్తేలా చేయండి.',
        hi: 'बारिश के बाद बनने वाली ऊपरी पपड़ी को हल्की गुड़ाई करके तोड़ें ताकि अंकुरण अच्छा हो।',
      },
      {
        en: 'Incorporate organic matter to strengthen aggregate stability against wind and water erosion.',
        te: 'నేల కోతకు గురికాకుండా సేంద్రీయ ఎరువులను కలిపి నేల బలాన్ని పెంచండి.',
        hi: 'मिट्टी के कटाव को रोकने के लिए कम्पोस्ट और हरी खाद का प्रयोग करें।',
      },
      {
        en: 'Manage irrigation carefully to prevent water stagnation on the surface.',
        te: 'నీరు పైభాగంలో నిలిచిపోకుండా చూసుకుంటూ తగు మోతాదులో తడులు ఇవ్వండి.',
        hi: 'सतह पर पानी जमा होने से बचाने के लिए संतुलित सिंचाई करें।',
      },
    ],
  },
  silt_loam: {
    key: 'silt_loam',
    name: {
      en: 'Silt Loam Soil',
      te: 'సిల్ట్ లోమ్ నేల',
      hi: 'सिल्ट दोमट मिट्टी',
    },
    description: {
      en: 'High silt content with balanced clay and sand. Highly fertile with superior available water capacity.',
      te: 'అధిక సారవంతమైన నేల. మొక్కలకు కావలసిన తేమ మరియు పోషకాలను సమృద్ధిగా అందిస్తుంది.',
      hi: 'अत्यधिक उपजाऊ मिट्टी। इसमें पानी रोकने की बहुत अच्छी क्षमता होती है।',
    },
    tips: [
      {
        en: 'One of the most naturally fertile soils for grains, pulses, and vegetables.',
        te: 'వరి, పప్పుధాన్యాలు మరియు కూరగాయలకు అత్యంత సారవంతమైన సహజ నేల.',
        hi: 'अनाज, दालों और सब्जियों के लिए सबसे उपजाऊ मिट्टियों में से एक।',
      },
      {
        en: 'Protect against surface sealing by maintaining soil cover or mulch.',
        te: 'నేల పైభాగం గట్టిపడకుండా పంట అవశేషాలతో కప్పి ఉంచండి.',
        hi: 'सतह को सख्त होने से बचाने के लिए फसल अवशेषों की परत रखें।',
      },
    ],
  },
  sandy_clay_loam: {
    key: 'sandy_clay_loam',
    name: {
      en: 'Sandy Clay Loam',
      te: 'ఇసుక బంకమట్టి లోమ్',
      hi: 'बलुई चिकनी दोमट',
    },
    description: {
      en: 'Contains both gritty sand and sticky clay in balanced proportions with loam characteristics.',
      te: 'ఇసుక మరియు బంకమట్టి సమానంగా ఉండే మంచి సాగు నేల.',
      hi: 'रेत और चिकनी मिट्टी का अच्छा मिश्रण, खेती के लिए अनुकूल।',
    },
    tips: [
      {
        en: 'Good moisture retention with decent drainage. Responds well to balanced NPK application.',
        te: 'తేమ నిలుపుదల బాగుంటుంది. సమతుల్య ఎరువుల వినియోగానికి మంచి ఫలితాలు ఇస్తుంది.',
        hi: 'संतुलित सिंचाई और खाद के साथ बहुत अच्छा उत्पादन देती है।',
      },
    ],
  },
  clay_loam: {
    key: 'clay_loam',
    name: {
      en: 'Clay Loam Soil',
      te: 'బంకమట్టి లోమ్ నేల',
      hi: 'चिकनी दोमट मिट्टी',
    },
    description: {
      en: 'Heavier loam soil with significant clay content. Very fertile with strong nutrient holding capacity.',
      te: 'బంకమట్టి శాతం ఎక్కువగా ఉండే సారవంతమైన లోమ్ నేల. పోషకాలను బలంగా నిలుపుకుంటుంది.',
      hi: 'भारी और उपजाऊ दोमट मिट्टी, पोषक तत्वों को बांधकर रखती है।',
    },
    tips: [
      {
        en: 'Excellent for cotton, maize, sugarcane, and paddy crops.',
        te: 'పత్తి, మొక్కజొన్న, చెరకు మరియు వరి పంటలకు చాలా మంచిది.',
        hi: 'कपास, मक्का, गन्ना और धान के लिए उत्कृष्ट।',
      },
      {
        en: 'Allow surface to dry slightly before field traffic to minimize compaction.',
        te: 'ట్రాక్టర్లు, యంత్రాలు వాడే ముందు నేల పైభాగం ఆరేవరకు ఆగండి.',
        hi: 'दबाव से बचाने के लिए थोड़ा सूखने पर ही भारी मशीनें चलाएं।',
      },
    ],
  },
  silty_clay_loam: {
    key: 'silty_clay_loam',
    name: {
      en: 'Silty Clay Loam',
      te: 'సిల్టీ క్లే లోమ్',
      hi: 'सिल्टी चिकनी दोमट',
    },
    description: {
      en: 'Smooth and sticky when wet, contains high silt and clay. Fertile but requires careful water management.',
      te: 'అధిక సిల్ట్ మరియు బంకమట్టి ఉండే నేల. నీటి నిర్వహణ జాగ్రత్తగా చేయాలి.',
      hi: 'गाद और चिकनी मिट्टी से भरपूर, उचित जल प्रबंधन की आवश्यकता होती है।',
    },
    tips: [
      {
        en: 'Provide drainage outlets to prevent prolonged ponding.',
        te: 'నీరు ఎక్కువ కాలం నిల్వ ఉండకుండా బయటకు పోయేలా చూడండి.',
        hi: 'जलभराव से बचने के लिए जल निकास की व्यवस्था करें।',
      },
    ],
  },
  sandy_clay: {
    key: 'sandy_clay',
    name: {
      en: 'Sandy Clay Soil',
      te: 'ఇసుక బంకమట్టి నేల',
      hi: 'बलुई चिकनी मिट्टी',
    },
    description: {
      en: 'Relatively uncommon soil containing high clay and sand fractions with little silt.',
      te: 'ఇసుక మరియు బంకమట్టి ఎక్కువగా ఉండే అరుదైన నేల.',
      hi: 'रेत और चिकनी मिट्टी की अधिकता वाली मिट्टी।',
    },
    tips: [
      {
        en: 'Improve crumb structure with compost and green manuring.',
        te: 'కంపోస్ట్ మరియు పచ్చిరొట్ట ఎరువులతో నేలను మెరుగుపరచండి.',
        hi: 'कम्पोस्ट और हरी खाद से मिट्टी की संरचना सुधारें।',
      },
    ],
  },
  silty_clay: {
    key: 'silty_clay',
    name: {
      en: 'Silty Clay Soil',
      te: 'సిల్టీ క్లే నేల',
      hi: 'सिल्टी चिकनी मिट्टी',
    },
    description: {
      en: 'Composed of fine silt and clay particles with very little sand. Highly plastic and sticky.',
      te: 'సూక్ష్మ రేణువులు ఉండే నేల. తడిగా ఉన్నప్పుడు బాగా జిగటగా ఉంటుంది.',
      hi: 'महीन कणों वाली चिपचिपी मिट्टी, बहुत अधिक जल धारण क्षमता।',
    },
    tips: [
      {
        en: 'Requires good field levelling and systematic drainage channels.',
        te: 'పొలాన్ని సమాంతరంగా చేసి మురుగు కాలువలు తీయడం తప్పనిసరి.',
        hi: 'खेत का समतलीकरण और जल निकासी अत्यंत आवश्यक है।',
      },
    ],
  },
  loamy_sand: {
    key: 'loamy_sand',
    name: {
      en: 'Loamy Sand',
      te: 'లోమీ సాండ్ (ఇసుక నేల)',
      hi: 'दोमट बलुई मिट्टी',
    },
    description: {
      en: 'Predominantly sand with enough silt and clay to form fragile soil balls when moist.',
      te: 'ఎక్కువగా ఇసుక ఉండే నేల, తేమ ఉన్నప్పుడు మాత్రమే చిన్న ముద్దలా మారుతుంది.',
      hi: 'अधिकांशतः रेत वाली मिट्टी, जो केवल गीली होने पर थोड़ी बंधती है।',
    },
    tips: [
      {
        en: 'Enrich with organic manures and bio-fertilizers every crop cycle.',
        te: 'ప్రతి పంటకు పశువుల ఎరువు మరియు జీవ ఎరువులు విరివిగా వేయండి.',
        hi: 'हर फसल में प्रचुर मात्रा में जैविक और हरी खाद दें।',
      },
      {
        en: 'Adopt micro-irrigation to maintain uniform soil moisture.',
        te: 'తేమను స్థిరంగా ఉంచడానికి తుంపర లేదా బిందు సేద్యం ఉపయోగించండి.',
        hi: 'नमी बनाए रखने के लिए ड्रिप या फव्वारा सिंचाई अपनाएं।',
      },
    ],
  },
};

/**
 * Calculates 2D coordinates on an equilateral USDA texture triangle.
 * Triangle has top vertex (Clay = 100%), bottom-left (Sand = 100%), bottom-right (Silt = 100%).
 * Returns x (0 to 1) and y (0 to 1).
 */
export function calculateTriangleCoordinates(
  sand: number,
  silt: number,
  clay: number
): { x: number; y: number } {
  const norm = normalizeSoilFractions(sand, silt, clay);
  const S = norm.sand / 100;
  const Si = norm.silt / 100;
  const C = norm.clay / 100;

  // Top peak is at (0.5, 0), Bottom-left (0, 1), Bottom-right (1, 1)
  const x = 0.5 * C + Si;
  const y = 1 - C;

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
  };
}

/**
 * Main evaluation function for soil texture analysis.
 */
export function evaluateSoilTexture(
  sandRaw: number,
  siltRaw: number,
  clayRaw: number
): SoilTextureResult {
  const fractions = normalizeSoilFractions(sandRaw, siltRaw, clayRaw);
  const textureClass = classifySoilTexture(
    fractions.sand,
    fractions.silt,
    fractions.clay
  );

  const info = USDA_SOIL_PROFILES[textureClass] || USDA_SOIL_PROFILES.loam;
  const triangleCoords = calculateTriangleCoordinates(
    fractions.sand,
    fractions.silt,
    fractions.clay
  );

  return {
    fractions,
    textureClass,
    info,
    triangleCoords,
  };
}
