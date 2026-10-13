# Results on our test set of 0 photos

> No test images were evaluated.

To evaluate real photos:
1. Add photos to `eval/images/` (e.g. `eval/images/sample.jpg`).
2. Add entries in `eval/labels.csv`:
   ```csv
   filename,true_crop,true_problem_key
   sample.jpg,chilli,chilli_anthracnose
   ```
3. Start dev server in eval mode: `EVAL_MODE=true npm run dev`
4. Run: `npx tsx scripts/eval.ts`
