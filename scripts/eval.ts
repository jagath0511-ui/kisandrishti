import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export interface EvalLabelRow {
  filename: string;
  true_crop: string;
  true_problem_key: string;
}

export interface EvalItemResult {
  filename: string;
  true_crop: string;
  true_problem_key: string;
  predicted_crop: string | null;
  predicted_problem_key: string | null;
  confidence_level: 'high' | 'medium' | 'low' | 'unknown';
  confidence_score: number | null;
  crop_match: boolean;
  problem_match: boolean;
  is_low_confidence: boolean;
  error?: string;
}

export interface CropSummary {
  crop: string;
  total: number;
  crop_correct: number;
  problem_correct: number;
  low_confidence: number;
}

export interface EvalReportData {
  total: number;
  crop_correct_total: number;
  problem_correct_total: number;
  low_confidence_total: number;
  per_crop: CropSummary[];
  wrong_answers: Array<{
    filename: string;
    expected: string;
    got: string;
    confidence: string;
  }>;
  items: EvalItemResult[];
}

/**
 * Parses eval/labels.csv supporting columns: filename, true_crop, true_problem_key
 * (with fallback support for crop / treatment_key headers).
 */
export function parseLabelsCsv(csvContent: string): EvalLabelRow[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // Parse header
  const headerParts = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  
  const filenameIdx = headerParts.indexOf('filename');
  let cropIdx = headerParts.indexOf('true_crop');
  if (cropIdx === -1) cropIdx = headerParts.indexOf('crop');
  
  let problemIdx = headerParts.indexOf('true_problem_key');
  if (problemIdx === -1) problemIdx = headerParts.indexOf('treatment_key');
  if (problemIdx === -1) problemIdx = headerParts.indexOf('problem_key');

  if (filenameIdx === -1) {
    throw new Error('CSV header missing "filename" column');
  }

  const rows: EvalLabelRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split by comma ignoring inner quotes if present
    const cols = rawLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const filename = cols[filenameIdx] || '';
    if (!filename) continue;

    const true_crop = cropIdx !== -1 ? cols[cropIdx] || '' : '';
    const true_problem_key = problemIdx !== -1 ? cols[problemIdx] || '' : '';

    rows.push({
      filename,
      true_crop,
      true_problem_key,
    });
  }

  return rows;
}

/**
 * Compresses an image file buffer like the app:
 * Longest dimension scaled to at most 1024px, JPEG quality ~80% (0.8).
 */
export async function compressImageLikeApp(imageBuffer: Buffer): Promise<{
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  let pipeline = sharp(imageBuffer);

  if (width > 1024 || height > 1024) {
    pipeline = pipeline.resize({
      width: width >= height ? 1024 : undefined,
      height: height > width ? 1024 : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  const compressedBuffer = await pipeline.jpeg({ quality: 80 }).toBuffer();
  const compressedMeta = await sharp(compressedBuffer).metadata();

  return {
    imageBase64: compressedBuffer.toString('base64'),
    mimeType: 'image/jpeg',
    width: compressedMeta.width || width,
    height: compressedMeta.height || height,
  };
}

/**
 * Aggregates individual evaluation results into overall metrics and per-crop breakdowns.
 */
export function aggregateEvalResults(results: EvalItemResult[]): EvalReportData {
  const total = results.length;
  let crop_correct_total = 0;
  let problem_correct_total = 0;
  let low_confidence_total = 0;

  const cropMap = new Map<string, CropSummary>();
  const wrong_answers: EvalReportData['wrong_answers'] = [];

  for (const res of results) {
    if (res.crop_match) crop_correct_total++;
    if (res.problem_match) problem_correct_total++;
    if (res.is_low_confidence) low_confidence_total++;

    const cropKey = (res.true_crop || 'unknown').toLowerCase().trim();
    const existing = cropMap.get(cropKey) || {
      crop: cropKey,
      total: 0,
      crop_correct: 0,
      problem_correct: 0,
      low_confidence: 0,
    };

    existing.total++;
    if (res.crop_match) existing.crop_correct++;
    if (res.problem_match) existing.problem_correct++;
    if (res.is_low_confidence) existing.low_confidence++;
    cropMap.set(cropKey, existing);

    // Record misclassifications or errors
    if (!res.crop_match || !res.problem_match || res.error) {
      wrong_answers.push({
        filename: res.filename,
        expected: `${res.true_crop || 'N/A'} / ${res.true_problem_key || 'N/A'}`,
        got: res.error
          ? `ERROR: ${res.error}`
          : `${res.predicted_crop || 'null'} / ${res.predicted_problem_key || 'null'}`,
        confidence: res.confidence_level,
      });
    }
  }

  return {
    total,
    crop_correct_total,
    problem_correct_total,
    low_confidence_total,
    per_crop: Array.from(cropMap.values()).sort((a, b) => a.crop.localeCompare(b.crop)),
    wrong_answers,
    items: results,
  };
}

/**
 * Formats report markdown.
 * Mandatory safety rule: Never call it "accuracy of the app".
 * Must call it: "results on our test set of N photos".
 */
export function generateResultsMarkdown(report: EvalReportData): string {
  const n = report.total;
  const cropPct = n > 0 ? ((report.crop_correct_total / n) * 100).toFixed(1) : '0.0';
  const probPct = n > 0 ? ((report.problem_correct_total / n) * 100).toFixed(1) : '0.0';
  const lowPct = n > 0 ? ((report.low_confidence_total / n) * 100).toFixed(1) : '0.0';

  let md = `# Results on our test set of ${n} photos\n\n`;

  if (n === 0) {
    md += `> No test images were evaluated.\n\n`;
    md += `To evaluate real photos:\n`;
    md += `1. Add photos to \`eval/images/\` (e.g. \`eval/images/sample.jpg\`).\n`;
    md += `2. Add entries in \`eval/labels.csv\`:\n`;
    md += `   \`\`\`csv\n`;
    md += `   filename,true_crop,true_problem_key\n`;
    md += `   sample.jpg,chilli,chilli_anthracnose\n`;
    md += `   \`\`\`\n`;
    md += `3. Start dev server in eval mode: \`EVAL_MODE=true npm run dev\`\n`;
    md += `4. Run: \`npx tsx scripts/eval.ts\`\n`;
    return md;
  }

  md += `> Test benchmark evaluated on ${new Date().toISOString().split('T')[0]} against KisanDrishti diagnosis API.\n\n`;

  md += `## Overall Summary\n\n`;
  md += `- **Total images**: ${n}\n`;
  md += `- **Crop correct**: ${report.crop_correct_total} / ${n} (${cropPct}%)\n`;
  md += `- **Problem correct (overall)**: ${report.problem_correct_total} / ${n} (${probPct}%)\n`;
  md += `- **Low confidence count**: ${report.low_confidence_total} / ${n} (${lowPct}%)\n\n`;

  md += `## Per-Crop Breakdown\n\n`;
  md += `| Crop | Total Photos | Crop Correct | Problem Correct | Low Confidence |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;
  for (const c of report.per_crop) {
    const cCropPct = c.total > 0 ? ((c.crop_correct / c.total) * 100).toFixed(1) : '0.0';
    const cProbPct = c.total > 0 ? ((c.problem_correct / c.total) * 100).toFixed(1) : '0.0';
    md += `| ${c.crop} | ${c.total} | ${c.crop_correct} (${cCropPct}%) | ${c.problem_correct} (${cProbPct}%) | ${c.low_confidence} |\n`;
  }
  md += `\n`;

  md += `## Wrong Answers\n\n`;
  if (report.wrong_answers.length === 0) {
    md += `*None — all ${n} images matched both true crop and true problem key perfectly!*\n\n`;
  } else {
    md += `| Filename | Expected (Crop / Key) | Got (Crop / Key) | Confidence |\n`;
    md += `| :--- | :--- | :--- | :---: |\n`;
    for (const w of report.wrong_answers) {
      md += `| \`${w.filename}\` | ${w.expected} | ${w.got} | ${w.confidence} |\n`;
    }
    md += `\n`;
  }

  md += `## Detailed Item Results\n\n`;
  md += `| Filename | True Crop | Pred Crop | True Key | Pred Key | Confidence | Match |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :---: | :---: |\n`;
  for (const item of report.items) {
    const matchMark = item.crop_match && item.problem_match ? '✅ Yes' : '❌ No';
    md += `| \`${item.filename}\` | ${item.true_crop} | ${item.predicted_crop || 'null'} | ${item.true_problem_key} | ${item.predicted_problem_key || 'null'} | ${item.confidence_level} | ${matchMark} |\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Main evaluation runner function.
 */
export async function runEvaluation(): Promise<void> {
  const rootDir = process.cwd();
  const labelsCsvPath = path.join(rootDir, 'eval', 'labels.csv');
  const imagesDirPath = path.join(rootDir, 'eval', 'images');
  const resultsMdPath = path.join(rootDir, 'eval', 'results.md');
  const apiUrl = process.env.EVAL_API_URL || 'http://localhost:3000/api/agri-diagnose';

  console.log(`\n======================================================`);
  console.log(`🌱 KisanDrishti Evaluation Runner`);
  console.log(`Target API: ${apiUrl}`);
  console.log(`Labels:     ${labelsCsvPath}`);
  console.log(`Images:     ${imagesDirPath}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(labelsCsvPath)) {
    console.error(`Error: Labels file not found at ${labelsCsvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(labelsCsvPath, 'utf-8');
  const rows = parseLabelsCsv(csvContent);

  if (rows.length === 0) {
    console.log(`ℹ️  No test images defined in ${labelsCsvPath}.`);
    const emptyReport = aggregateEvalResults([]);
    const reportMd = generateResultsMarkdown(emptyReport);
    fs.writeFileSync(resultsMdPath, reportMd, 'utf-8');
    console.log(`Wrote placeholder report to ${resultsMdPath}`);
    console.log(`\n${reportMd}`);
    return;
  }

  console.log(`Found ${rows.length} images to evaluate.`);

  // Pre-flight check: ensure API is accessible
  try {
    const checkRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: 'invalid', mimeType: 'image/jpeg', language: 'en' }),
    });
    // If we reach the endpoint, even a 400 or 500 means server is up
    if (checkRes.status === 429) {
      console.warn(`⚠️ Warning: Server responded with 429 Rate Limit. Ensure server was started with EVAL_MODE=true.`);
    }
  } catch (err: any) {
    console.error(`\n❌ Could not connect to dev server at ${apiUrl}`);
    console.error(`Please ensure your Next.js server is running with EVAL_MODE=true:`);
    console.error(`  PowerShell: $env:EVAL_MODE="true"; npm run dev`);
    console.error(`  Bash/Linux: EVAL_MODE=true npm run dev\n`);
    process.exit(1);
  }

  const itemResults: EvalItemResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const imagePath = path.join(imagesDirPath, row.filename);
    console.log(`[${i + 1}/${rows.length}] Evaluating ${row.filename}...`);

    if (!fs.existsSync(imagePath)) {
      console.error(`  ⚠️ Image file not found: ${imagePath}`);
      itemResults.push({
        filename: row.filename,
        true_crop: row.true_crop,
        true_problem_key: row.true_problem_key,
        predicted_crop: null,
        predicted_problem_key: null,
        confidence_level: 'unknown',
        confidence_score: null,
        crop_match: false,
        problem_match: false,
        is_low_confidence: false,
        error: `File not found at ${imagePath}`,
      });
      continue;
    }

    try {
      const rawBuffer = fs.readFileSync(imagePath);
      // Compress like the browser app
      const compressed = await compressImageLikeApp(rawBuffer);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: compressed.imageBase64,
          mimeType: compressed.mimeType,
          language: 'en',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`  ❌ API Error (${response.status}): ${errText}`);
        itemResults.push({
          filename: row.filename,
          true_crop: row.true_crop,
          true_problem_key: row.true_problem_key,
          predicted_crop: null,
          predicted_problem_key: null,
          confidence_level: 'unknown',
          confidence_score: null,
          crop_match: false,
          problem_match: false,
          is_low_confidence: false,
          error: `API HTTP ${response.status}: ${errText.slice(0, 100)}`,
        });
      } else {
        const data = await response.json();
        const predCrop = data.crop ? String(data.crop).trim().toLowerCase() : null;
        const predKey = data.treatment_key ? String(data.treatment_key).trim().toLowerCase() : null;
        const trueCrop = row.true_crop.trim().toLowerCase();
        const trueKey = row.true_problem_key.trim().toLowerCase();

        const cropMatch = predCrop === trueCrop;
        const problemMatch = predKey === trueKey;
        const confLevel = (data.confidence as EvalItemResult['confidence_level']) || 'unknown';
        const isLowConf = confLevel === 'low' || (typeof data.confidence_score === 'number' && data.confidence_score < 0.6);

        console.log(`  Prediction: Crop='${predCrop}' (${cropMatch ? 'MATCH' : 'MISMATCH'}), Key='${predKey}' (${problemMatch ? 'MATCH' : 'MISMATCH'}), Conf='${confLevel}'`);

        itemResults.push({
          filename: row.filename,
          true_crop: row.true_crop,
          true_problem_key: row.true_problem_key,
          predicted_crop: data.crop || null,
          predicted_problem_key: data.treatment_key || null,
          confidence_level: confLevel,
          confidence_score: typeof data.confidence_score === 'number' ? data.confidence_score : null,
          crop_match: cropMatch,
          problem_match: problemMatch,
          is_low_confidence: isLowConf,
        });
      }
    } catch (err: any) {
      console.error(`  ❌ Error processing ${row.filename}: ${err.message}`);
      itemResults.push({
        filename: row.filename,
        true_crop: row.true_crop,
        true_problem_key: row.true_problem_key,
        predicted_crop: null,
        predicted_problem_key: null,
        confidence_level: 'unknown',
        confidence_score: null,
        crop_match: false,
        problem_match: false,
        is_low_confidence: false,
        error: err.message,
      });
    }

    // Wait 2 seconds between calls to avoid hitting rate limits or spamming API
    if (i < rows.length - 1) {
      console.log(`  Waiting 2 seconds before next call...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Aggregate and format results
  const reportData = aggregateEvalResults(itemResults);
  const resultsMarkdown = generateResultsMarkdown(reportData);

  // Save to eval/results.md
  fs.writeFileSync(resultsMdPath, resultsMarkdown, 'utf-8');
  console.log(`\n💾 Saved evaluation report to: ${resultsMdPath}\n`);

  // Print results to stdout
  console.log(resultsMarkdown);
}

// Auto-run if executed directly via tsx
if (process.argv[1] && (process.argv[1].endsWith('eval.ts') || process.argv[1].endsWith('eval.js'))) {
  runEvaluation().catch((err) => {
    console.error('Fatal evaluation error:', err);
    process.exit(1);
  });
}
