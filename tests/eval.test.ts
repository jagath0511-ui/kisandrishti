import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  parseLabelsCsv,
  compressImageLikeApp,
  aggregateEvalResults,
  generateResultsMarkdown,
  type EvalItemResult,
} from '../scripts/eval';

describe('Evaluation Script - scripts/eval.ts', () => {
  describe('parseLabelsCsv', () => {
    it('parses standard columns: filename, true_crop, true_problem_key', () => {
      const csv = `filename,true_crop,true_problem_key
leaf1.jpg,chilli,chilli_anthracnose
leaf2.jpg,rice,paddy_blast`;

      const rows = parseLabelsCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        filename: 'leaf1.jpg',
        true_crop: 'chilli',
        true_problem_key: 'chilli_anthracnose',
      });
      expect(rows[1]).toEqual({
        filename: 'leaf2.jpg',
        true_crop: 'rice',
        true_problem_key: 'paddy_blast',
      });
    });

    it('parses alternative headers (crop, treatment_key) gracefully', () => {
      const csv = `filename,crop,treatment_key
photoA.png,cotton,cotton_whitefly`;

      const rows = parseLabelsCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        filename: 'photoA.png',
        true_crop: 'cotton',
        true_problem_key: 'cotton_whitefly',
      });
    });

    it('trims whitespace and ignores empty lines', () => {
      const csv = `
filename, true_crop , true_problem_key

  test.jpg  ,  tomato  ,  tomato_early_blight  

`;
      const rows = parseLabelsCsv(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0].filename).toBe('test.jpg');
      expect(rows[0].true_crop).toBe('tomato');
      expect(rows[0].true_problem_key).toBe('tomato_early_blight');
    });

    it('throws error if filename column is absent', () => {
      const csv = `crop,true_problem_key\nchilli,chilli_anthracnose`;
      expect(() => parseLabelsCsv(csv)).toThrow('CSV header missing "filename" column');
    });
  });

  describe('compressImageLikeApp', () => {
    it('resizes image exceeding 1024px and encodes as JPEG quality 80', async () => {
      // Create a 2000x1000 test image in memory
      const inputBuffer = await sharp({
        create: {
          width: 2000,
          height: 1000,
          channels: 3,
          background: { r: 34, g: 139, b: 34 },
        },
      })
        .png()
        .toBuffer();

      const result = await compressImageLikeApp(inputBuffer);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.width).toBeLessThanOrEqual(1024);
      expect(result.height).toBeLessThanOrEqual(1024);
      expect(result.imageBase64).toBeTruthy();
      expect(result.imageBase64).not.toContain('data:image');
    });
  });

  describe('aggregateEvalResults and generateResultsMarkdown', () => {
    const mockItems: EvalItemResult[] = [
      {
        filename: 'img1.jpg',
        true_crop: 'chilli',
        true_problem_key: 'chilli_anthracnose',
        predicted_crop: 'chilli',
        predicted_problem_key: 'chilli_anthracnose',
        confidence_level: 'high',
        confidence_score: 0.92,
        crop_match: true,
        problem_match: true,
        is_low_confidence: false,
      },
      {
        filename: 'img2.jpg',
        true_crop: 'chilli',
        true_problem_key: 'chilli_powdery_mildew',
        predicted_crop: 'chilli',
        predicted_problem_key: 'chilli_anthracnose',
        confidence_level: 'medium',
        confidence_score: 0.65,
        crop_match: true,
        problem_match: false,
        is_low_confidence: false,
      },
      {
        filename: 'img3.jpg',
        true_crop: 'rice',
        true_problem_key: 'paddy_blast',
        predicted_crop: 'wheat',
        predicted_problem_key: 'unknown',
        confidence_level: 'low',
        confidence_score: 0.35,
        crop_match: false,
        problem_match: false,
        is_low_confidence: true,
      },
    ];

    it('aggregates overall numbers and per-crop breakdowns accurately', () => {
      const summary = aggregateEvalResults(mockItems);
      expect(summary.total).toBe(3);
      expect(summary.crop_correct_total).toBe(2);
      expect(summary.problem_correct_total).toBe(1);
      expect(summary.low_confidence_total).toBe(1);
      expect(summary.wrong_answers).toHaveLength(2);

      const chilliStats = summary.per_crop.find((c) => c.crop === 'chilli');
      expect(chilliStats).toBeDefined();
      expect(chilliStats?.total).toBe(2);
      expect(chilliStats?.crop_correct).toBe(2);
      expect(chilliStats?.problem_correct).toBe(1);

      const riceStats = summary.per_crop.find((c) => c.crop === 'rice');
      expect(riceStats).toBeDefined();
      expect(riceStats?.total).toBe(1);
      expect(riceStats?.crop_correct).toBe(0);
      expect(riceStats?.low_confidence).toBe(1);
    });

    it('generates markdown with required phrase and NEVER calls it "accuracy of the app"', () => {
      const summary = aggregateEvalResults(mockItems);
      const markdown = generateResultsMarkdown(summary);

      // Rule 4: Do not call it "accuracy of the app". Call it "results on our test set of N photos".
      expect(markdown).toContain('# Results on our test set of 3 photos');
      expect(markdown.toLowerCase()).not.toContain('accuracy of the app');

      // Verify sections
      expect(markdown).toContain('## Overall Summary');
      expect(markdown).toContain('## Per-Crop Breakdown');
      expect(markdown).toContain('## Wrong Answers');
      expect(markdown).toContain('img2.jpg');
      expect(markdown).toContain('img3.jpg');
    });

    it('handles empty results set without division by zero', () => {
      const summary = aggregateEvalResults([]);
      const markdown = generateResultsMarkdown(summary);

      expect(markdown).toContain('# Results on our test set of 0 photos');
      expect(markdown.toLowerCase()).not.toContain('accuracy of the app');
      expect(markdown).toContain('No test images were evaluated');
    });
  });
});
