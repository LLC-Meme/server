import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export function generateUrl(encodedSearchTerms: string[]): string {
  const baseUrl = "https://amazon.co.jp";
  const keyword = encodedSearchTerms.join("+");
  const locale = encodeURIComponent("カタカナ");
  const sprefix = keyword;
  return `${baseUrl}/s?k=${keyword}&__mk_ja_JP=${locale}&sprefix=${sprefix}`;
}


export async function scrapeSponsoredProducts(encodedSearchTerms: string[]): Promise<Array<{title: string}>> {
  console.log(`スクレイピングを開始します`);
  
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    devtools: false,
    args: [
      '--lang=ja-JP',
      '--accept-lang=ja-JP',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-gpu',
      '--single-process'
    ]
  });

  const japaneseCookies = [
    { name: 'i18n-prefs', value: 'JPY', domain: '.amazon.co.jp' },
    { name: 'lc-main', value: 'ja_JP', domain: '.amazon.co.jp' },
    { name: 'sp-cdn', value: 'L5Z9:JP', domain: '.amazon.co.jp' },
    { name: 'ubid-acbjp', value: 'xxx-xxxxxxx-xxxxxxx', domain: '.amazon.co.jp' },
    { name: 'session-id', value: 'xxx-xxxxxxx-xxxxxxx', domain: '.amazon.co.jp' },
    { name: 'csm-hit', value: 'tb:xxx+s-xxx|xxx', domain: '.amazon.co.jp' }
  ];
  browser.setCookie(...japaneseCookies);

  const page = await browser.newPage();

  // Remove automation indicators
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  // Set viewport to mimic a real browser
  await page.setViewport({ width: 1366, height: 768 });

  const requestHeaders = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Content-Language": "ja-JP",
    "Accept-Language": "ja-JP,ja;q=1.0",
    "Referer": "https://www.amazon.co.jp/",
    "Cache-Control": "no-cache",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1"
  };

  await page.setExtraHTTPHeaders({...requestHeaders});

  const url = generateUrl(encodedSearchTerms);
  console.log(`${url}に遷移します`);

  await page.goto(url, { waitUntil: 'networkidle2' });
  console.log('ページの読み込みに成功');

  // Simulate human behavior - scroll and wait
  console.log('スクロール動作を再現します');
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 4);
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight / 2);
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('広告商品がロードされるのを待機します');
  try {
    await page.waitForSelector('span.puis-sponsored-label-info-icon', { timeout: 10000 });
    console.log('広告商品が見つかりました');
  } catch (error) {
    // Continue even if no sponsored products found
    console.error("広告商品が見つかりませんでした。");
    return [];
  }

  console.log('広告商品データを抽出します');
  const sponsoredProducts = await page.evaluate(() => {
    const products: any[] = [];

    const sponsoredSelectors = [
      'span.puis-sponsored-label-info-icon',
      'a.puis-label-popover.puis-sponsored-label-text',
      'span.sponsored-brand-label-info-desktop',
      'span.puis-sponsored-label-text'
    ];

    sponsoredSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el: Element) => {
        const productContainer = el.closest('div[data-cy="title-recipe"]') || 
                                el.closest('[data-cy="title-recipe"]') ||
                                el.closest('div[role="listitem"]')?.querySelector('[data-cy="title-recipe"]');

        if (productContainer && !products.some(p => p.innerHTML === productContainer.innerHTML)) {
          const h2Element = productContainer.querySelector('h2');
          const title = h2Element ? h2Element.textContent?.trim() : '';

          products.push({
            title: title,
          });
        }
      });
    });

    return products;
  });

  await browser.close();
  console.log(`${sponsoredProducts.length}個の広告商品が見つかりました`);

  return sponsoredProducts;
}
