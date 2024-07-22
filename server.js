const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const puppeteer = require('puppeteer');
const session = require('express-session');
const { stringify } = require('querystring');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const { waitForDebugger } = require('inspector');
const url = require('url');
const { fetchFinalUrl } = require('./fetchFinalUrl');

const app = express();
const port = process.env.PORT || 4000;

// Configuration de la session
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Utilisez secure: true en production avec HTTPS
}));

// Middleware pour parser les requêtes URL-encoded
app.use(bodyParser.urlencoded({ extended: true }));

// Affichage du formulaire sur la page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Fonction pour défiler vers le bas
  async function scrollDown(page, distance) {
    await page.evaluate(async (distance) => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(distance, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 190);
        });
    }, distance);
}
////////////////////////////////////////////////////
async function searchByImage(productUrl) {
 
    // URL du produit AliExpress
    const aliexpressUrl = productUrl;
    const productidcheck = extractProductId(aliexpressUrl) ? extractProductId(aliexpressUrl) : extractInfo(aliexpressUrl).url;
    console.log(productidcheck);
  
    if (!productidcheck) {
      console.error('Numéro de produit non trouvé dans l\'URL.');
      return null;
    }

    if (extractProductId(aliexpressUrl)){
      const productId = await extractProductId(aliexpressUrl);
      //const testurl = await fetchFinalUrl(productidcheck);
    console.log("voir idurl cherche par la fonction fetchfinalurl : ", productId );
    
     

    // Lance le navigateur
    const browser = await puppeteer.launch({ headless: true});//,args: ['--proxy-server=35.185.196.38:3128'] 
    const page = await browser.newPage();
   
    // Aller sur Google
    await page.goto('https://thieve.co/tools/suppliers-search', { waitUntil: 'networkidle2', timeout: 50000 });
    
    // Utiliser un sélecteur plus simple si possible
    await page.waitForSelector('input[placeholder="https://www.aliexpress.com/item/4000414708937.html"]');

    await page.type('input[placeholder="https://www.aliexpress.com/item/4000414708937.html"]', 'https://www.aliexpress.com/item/'+productId+'.html');

     // Soumettre le formulaire de recherche
    await page.keyboard.press('Enter');
    await page.screenshot({ path: 'page.png' });

     // Sélecteur de la div avec la classe spécifique
     const divImgs = '.group.relative.opacity-100';


     // Attendre que l'élément soit disponible et cliquer dessus
     await page.waitForSelector(divImgs);
     await page.screenshot({ path: 'page.png' });

      // Sélectionner les divs avec une classe spécifique et extraire les src des images
      const similarItems = await page.evaluate(() => {
       // Sélectionner toutes les divs avec la classe 'items'
      const divs = document.querySelectorAll('.group.relative.opacity-100');
        // Extraire les src des images à l'intérieur de ces divs
         return Array.from(divs).map(div => {
                    const img = div.querySelector('img')?.src || null;
                    const title = div.querySelector('.overflow-hidden.text-ellipsis.whitespace-nowrap.font-medium')?.innerHTML || null;
                    const price = div.querySelector('.font-semibold')?.innerText || null;
                    //get link of aliexpress
                    const fullUrl = div.querySelector('a')?.href || null;
                    const parsedUrl = new URL(fullUrl);
                    const link = parsedUrl.searchParams.get('productUrl');

                    return {img, title, price, link};

                  })

        });

     
     // Attendre que la nouvelle page soit chargée

  await page.screenshot({ path: 'page.png' });
  await browser.close();
  return similarItems;
      
    }else if (!extractProductId(aliexpressUrl)){
      const productId = await fetchFinalUrl(productidcheck);
      //const testurl = await fetchFinalUrl(productidcheck);
    console.log("voir idurl cherche par la fonction fetchfinalurl : ", productId );
    
     

    // Lance le navigateur
    const browser = await puppeteer.launch({ headless: true});//,args: ['--proxy-server=35.185.196.38:3128'] 
    const page = await browser.newPage();
   
    // Aller sur Google
    await page.goto('https://thieve.co/tools/suppliers-search', { waitUntil: 'networkidle2', timeout: 50000 });
    
    // Utiliser un sélecteur plus simple si possible
    await page.waitForSelector('input[placeholder="https://www.aliexpress.com/item/4000414708937.html"]');

    await page.type('input[placeholder="https://www.aliexpress.com/item/4000414708937.html"]', 'https://www.aliexpress.com/item/'+productId+'.html');

     // Soumettre le formulaire de recherche
    await page.keyboard.press('Enter');
    await page.screenshot({ path: 'page.png' });

     // Sélecteur de la div avec la classe spécifique
     const divImgs = '.group.relative.opacity-100';


     // Attendre que l'élément soit disponible et cliquer dessus
     await page.waitForSelector(divImgs);
     await page.screenshot({ path: 'page.png' });

      // Sélectionner les divs avec une classe spécifique et extraire les src des images
      const similarItems = await page.evaluate(() => {
       // Sélectionner toutes les divs avec la classe 'items'
      const divs = document.querySelectorAll('.group.relative.opacity-100');
        // Extraire les src des images à l'intérieur de ces divs
         return Array.from(divs).map(div => {
                    const img = div.querySelector('img')?.src || null;
                    const title = div.querySelector('.overflow-hidden.text-ellipsis.whitespace-nowrap.font-medium')?.innerHTML || null;
                    const price = div.querySelector('.font-semibold')?.innerText || null;
                    //get link of aliexpress
                    const fullUrl = div.querySelector('a')?.href || null;
                    const parsedUrl = new URL(fullUrl);
                    const link = parsedUrl.searchParams.get('productUrl');

                    return {img, title, price, link};

                  })

        });

     
     // Attendre que la nouvelle page soit chargée

  await page.screenshot({ path: 'page.png' });
  await browser.close();
  return similarItems;
    }else{
      return null;
    }


    
}

//////////////////////////////////////////////////////

/////////////////////Route pour traiter les requêtes POST
app.post('/process', async (req, res) => {
  const productUrl = req.body.url;
  console.log('Received URL:', productUrl);

  try {
    //await getSimilarItems(productUrl);
    const similarItems = await searchByImage(productUrl);
    console.log("similar items result : ",similarItems);
    if (similarItems == null){
      req.session.formData = "Veuillez entrer un lien AliExpress Valide exemple : https://a.aliexpress.com/ or https://www.aliexpress.com/item/4000414708937.html pour plus d'information sur le format le lien correcte veuillez voir ce video "; // Stocke les données dans la session

      res.redirect('/'); // Redirige vers la page de résultat

    }else{

      console.log(similarItems); 
    req.session.formData = similarItems; // Stocke les données dans la session
    res.redirect('/result'); // Redirige vers la page de résultat

    }
    
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500);//send('Erreur lors de la récupération des articles similaires');
    res.redirect('/');
  }
});



///////////////////Route pour afficher la page de résultat
app.get('/result', (req, res) => {
  if (req.session.formData) {
      res.sendFile(path.join(__dirname, 'public', 'resultstyle.html'));
      //res.redirect('/result');
  } else {
      res.redirect('/');
  }
});


////////////////////// Définir une route pour /pageContent pour Lire le fichier pageContent.txt
app.get('/pageContent', (req, res) => {
  const filePath = path.join(__dirname, 'pageContent.txt');

  // Lire le fichier pageContent.txt
  fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
          console.error('Erreur lors de la lecture du fichier', err);
          res.status(500).send('Erreur lors de la lecture du fichier');
      } else {
          // Envoyer le contenu du fichier en réponse
          res.send(data);
      }
  });
});




////////////////////// Définir une route pour Lire le fichier page.png
app.get('/page', (req, res) => {
  const filePath = path.join(__dirname, 'page.png');

  // Lire le fichier pageContent.txt
  fs.readFile(filePath, (err, data) => {
      if (err) {
          console.error('Erreur lors de la lecture du fichier', err);
          res.status(500).send('Erreur lors de la lecture du fichier');
      } else {
           // Définir le type de contenu
      res.setHeader('Content-Type', 'image/png');
      // Envoyer le contenu du fichier en réponse
      res.send(data);
      }
  });
});


/////////////////////////Route pour envoyer les données de la session au client
app.get('/get-data', (req, res) => {
  const data = req.session.formData;
  if (data) {
    console.log('Data existe in session');
      res.json(data);
  } else {
      res.json({});
      console.log('Data don t existe in session');
  }
});

// Fonction pour extraire le numéro du produit à partir de l'URL AliExpress
function extractProductId(url) {
  const regex = /item\/(\d+)\.html/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function extractInfo(text) {
  const urlRegex = /(https:\/\/a\.aliexpress\.com\/\S+)/;
  const priceRegex = /MAD\d+(\.\d{2})?/;
  const discountRegex = /\d+% de réduction/;

  const urlMatch = text.match(urlRegex);
  const priceMatch = text.match(priceRegex);
  const discountMatch = text.match(discountRegex);

  const url = urlMatch ? urlMatch[0] : null;
  const price = priceMatch ? priceMatch[0] : null;
  const discount = discountMatch ? discountMatch[0] : null;

  // Extraire la description
  const descriptionStart = text.indexOf(" | ") + 3;
  const descriptionEnd = text.indexOf(" https://a.aliexpress.com/");
  const description = text.substring(descriptionStart, descriptionEnd);

  return {
    url,
    price,
    discount,
    description
  };
}



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

