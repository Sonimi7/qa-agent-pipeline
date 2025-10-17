import { chromium, type Page } from 'playwright';
import fs from 'fs';

type TestAction =
  | { action: 'navigate'; url: string }
  | { action: 'fill'; selector: string; value: string }
  | { action: 'click'; selector: string }
  | { action: 'expectVisible'; selector: string; timeoutMs?: number }
  | { action: 'expectUrlMatch'; pattern: string; timeoutMs?: number };

type TestCase = {
  id: string;
  title: string;
  preconditions?: string[];
  steps: TestAction[];
  expected?: string;
  priority?: string;
  area?: string;
};

async function runAction(page: Page, action: TestAction): Promise<void> {
  switch (action.action) {
    case 'navigate': {
      await page.goto(action.url, { waitUntil: 'load' });
      return;
    }
    case 'fill': {
      await page.fill(action.selector, action.value);
      return;
    }
    case 'click': {
      await page.click(action.selector);
      return;
    }
    case 'expectVisible': {
      await page.waitForSelector(action.selector, { state: 'visible', timeout: action.timeoutMs ?? 5000 });
      return;
    }
    case 'expectUrlMatch': {
      const timeout = action.timeoutMs ?? 5000;
      const start = Date.now();
      const regex = new RegExp(action.pattern);
      // poll for URL to match until timeout
      while (Date.now() - start < timeout) {
        const url = page.url();
        if (regex.test(url)) return;
        await page.waitForTimeout(100);
      }
      throw new Error(`URL did not match pattern: ${action.pattern}`);
    }
  }
}

async function runCases(baseUrl: string | undefined, cases: TestCase[]): Promise<number> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let failed = 0;
  for (const testCase of cases) {
    try {
      console.log(`CASE ${testCase.id}: ${testCase.title}`);
      for (const step of testCase.steps) {
        const resolvedStep = { ...step } as TestAction;
        if (resolvedStep.action === 'navigate') {
          const rawUrl = (resolvedStep as Extract<TestAction, { action: 'navigate' }>).url;
          const finalUrl = baseUrl && rawUrl.startsWith('/') ? `${baseUrl}${rawUrl}` : rawUrl;
          (resolvedStep as Extract<TestAction, { action: 'navigate' }>).url = finalUrl;
        }
        await runAction(page, resolvedStep);
      }
      console.log(`PASS ${testCase.id}`);
    } catch (err: any) {
      failed += 1;
      console.error(`FAIL ${testCase.id}: ${err?.message ?? err}`);
      // Save a screenshot per failure
      try {
        await page.screenshot({ path: `failure-${testCase.id}.png` });
      } catch {}
    }
  }

  await browser.close();
  return failed;
}

function parseArgs(): { urlEnv: string | undefined; casesPath: string } {
  const args = process.argv.slice(2);
  let urlEnv: string | undefined;
  let casesPath = './testcases.json';
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--url' || a === '-u') && args[i + 1]) {
      urlEnv = args[i + 1] as string;
      i++;
    } else if ((a === '--cases' || a === '-c') && args[i + 1]) {
      casesPath = args[i + 1] as string;
      i++;
    }
  }
  return { urlEnv, casesPath };
}

async function main() {
  const { urlEnv, casesPath } = parseArgs();
  const baseUrl = urlEnv || process.env.UI_URL;
  const raw = fs.readFileSync(casesPath, 'utf8');
  const cases: TestCase[] = JSON.parse(raw);
  const failed = await runCases(baseUrl, cases);
  if (failed > 0) {
    console.error(`Completed with ${failed} failed case(s).`);
    process.exit(2);
  }
  console.log('All dynamic cases passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


