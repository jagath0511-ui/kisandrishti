import { describe, it, expect } from 'vitest';
import { buildOfficerShareText, OfficerCardInput } from '../lib/shareCard';

describe('WhatsApp MPEO / Rythu Bharosa Card Text Builder', () => {
  const sampleInput: OfficerCardInput = {
    cropName: 'Chilli',
    problemName: 'Chilli Anthracnose',
    confidenceScore: 0.62,
    confidenceLevel: 'medium',
    districtName: 'Guntur',
    weatherSummary: '31°C, Humidity 82%',
    lang: 'en',
  };

  it('builds clear English text message with district, crop and safety notice', () => {
    const res = buildOfficerShareText(sampleInput);
    expect(res.text).toContain('Guntur');
    expect(res.text).toContain('Chilli');
    expect(res.text).toContain('62%');
    expect(res.text).toContain('MPEO / Agronomist requested');
    expect(res.whatsappUrl).toContain('wa.me');
  });

  it('builds authentic Telugu text message for Rythu Bharosa Kendra officers', () => {
    const res = buildOfficerShareText({ ...sampleInput, lang: 'te' });
    expect(res.text).toContain('కిసాన్‌దృష్టి');
    expect(res.text).toContain('రైతు భరోసా');
    expect(res.text).toContain('వ్యవసాయ అధికారి (MPEO)');
    expect(res.text).toContain('Guntur');
    expect(res.whatsappUrl).toContain('wa.me');
  });

  it('builds authentic Hindi text message for Kisan Seva Kendra', () => {
    const res = buildOfficerShareText({ ...sampleInput, lang: 'hi' });
    expect(res.text).toContain('किसानदृष्टि');
    expect(res.text).toContain('कृषि अधिकारी');
    expect(res.whatsappUrl).toContain('wa.me');
  });
});
