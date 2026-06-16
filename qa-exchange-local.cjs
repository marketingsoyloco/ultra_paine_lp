const { chromium } = require("C:/Users/knors/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 1000 } });
  const logs = [];
  const requests = [];

  page.on("console", (message) => logs.push(`${message.type()}: ${message.text()}`));
  page.on("requestfailed", (request) => requests.push({
    url: request.url(),
    failure: request.failure()?.errorText
  }));

  await page.goto("file:///C:/SLP/Maturo/ULTRA%20PAINE/index.html", { waitUntil: "load" });
  await page.waitForTimeout(4000);
  const result = {
    price: await page.textContent("#quoteEntry"),
    rate: await page.textContent("#usd-sell"),
    notice: await page.textContent("#quoteNotice"),
    logs,
    requests
  };
  await browser.close();
  console.log(JSON.stringify(result, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
