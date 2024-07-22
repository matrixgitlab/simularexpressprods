const puppeteer = require('puppeteer');

async function fetchFinalUrl(url) {
  const browser = await puppeteer.launch({ headless: true }); // Mettre à false pour voir le navigateur
  const page = await browser.newPage();

  // Intercepter les requêtes
  await page.setRequestInterception(true);

  let productId = null;

  // Fonction pour extraire l'ID de produit de l'URL
  function extractProductId(url) {
    const match = url.match(/https:\/\/www\.aliexpress\.com\/item\/(\d+)\.html/);
    return match ? match[1] : null;
  }

  page.on('request', interceptedRequest => {
    interceptedRequest.continue();
  });

  page.on('response', async response => {
    const status = response.status();
    if ((status === 302 || status === 301) && !productId) {
      const locationHeader = response.headers()['location'];
      if (locationHeader) {
        console.log('Redirection trouvée:', locationHeader);
        
        // Extraire l'ID de produit dès la première redirection
        productId = extractProductId(locationHeader);
        if (productId) {
          console.log('Produit trouvé avec ID:', productId);
          await browser.close();
        }
      }
    }
  });

  // Aller à l'URL initiale
  page.goto(url).catch(e => {
    console.error('Erreur de navigation:', e);
  });

  // Attendre que l'ID du produit soit intercepté ou un délai de 30 secondes
  const waitForProductId = new Promise(resolve => {
    const checkProductId = () => {
      if (productId) {
        resolve(productId);
      } else {
        setTimeout(checkProductId, 100); // Réessayer après 100ms
      }
    };
    checkProductId();
  });

  const timeout = new Promise(resolve => setTimeout(() => resolve(null), 30000)); // Timeout après 30 secondes

  const result = await Promise.race([waitForProductId, timeout]);

  if (!result) {
    console.log('Aucun produit correspondant trouvé ou délai dépassé.');
    await browser.close();
  }

  return result;
}

module.exports = { fetchFinalUrl };
