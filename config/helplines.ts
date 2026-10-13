// VERIFY on official sites before launch

export interface EmergencyHelpline {
  id: string;
  name: {
    en: string;
    te: string;
    hi: string;
  };
  number: string;
  displayNumber: string;
  description: {
    en: string;
    te: string;
    hi: string;
  };
  badge: string;
  primary: boolean;
}

export const EMERGENCY_HELPLINES: EmergencyHelpline[] = [
  {
    id: 'national_emergency',
    name: {
      en: 'National Emergency',
      te: 'జాతీయ అత్యవసర విభాగం',
      hi: 'राष्ट्रीय आपातकालीन सेवा',
    },
    number: '112',
    displayNumber: '112',
    description: {
      en: 'Ambulance & Police (24/7 All India)',
      te: 'అంబులెన్స్ & పోలీస్ (24/7)',
      hi: 'एंबुलेंस व पुलिस (24/7)',
    },
    badge: '24/7',
    primary: true,
  },
  {
    id: 'poison_centre',
    name: {
      en: 'National Poisons Info Centre',
      te: 'జాతీయ విష సమాచార కేంద్రం',
      hi: 'राष्ट्रीय विष सूचना केंद्र',
    },
    // VERIFY on official sites before launch (AIIMS New Delhi toll-free: 1800 116 117 / 011-26589391)
    number: '1800116117',
    displayNumber: '1800-116-117',
    description: {
      en: 'Pesticide & Poison Emergency (AIIMS)',
      te: 'పురుగుమందు అత్యవసర సహాయం (AIIMS)',
      hi: 'कीटनाशक विष आपातकाल (एम्स)',
    },
    badge: 'POISON DESK',
    primary: true,
  },
  {
    id: 'kisan_call_centre',
    name: {
      en: 'Kisan Call Centre',
      te: 'కిసాన్ కాల్ సెంటర్',
      hi: 'किसान कॉल सेंटर',
    },
    // VERIFY on official sites before launch (Govt of India Farmer Portal toll-free: 1800 180 1551)
    number: '18001801551',
    displayNumber: '1800-180-1551',
    description: {
      en: 'Govt Agriculture Helpline',
      te: 'ప్రభుత్వ వ్యవసాయ సహాయ కేంద్రం',
      hi: 'सरकारी कृषि सहायता केंद्र',
    },
    badge: 'AGRICULTURE',
    primary: false,
  },
];
