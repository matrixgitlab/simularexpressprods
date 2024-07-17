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

async function googleSearchProds(productUrl) {
  

  
    // URL du produit AliExpress
    const aliexpressUrl = productUrl;
    const productId = extractProductId(aliexpressUrl);
  
    if (!productId) {
      console.error('Numéro de produit non trouvé dans l\'URL.');
      return;
    }
    // URL de l'image à télécharger
  const imageUrl = 'https://ae01.alicdn.com/kf/S5f3456ed2ca24286bf4f31be998265093.jpg_80x80.jpg_.webp';
  const imagePath = path.resolve(__dirname, 'downloaded_image.png');
  // Télécharger l'image
  await downloadImage(imageUrl, imagePath);
  
    // Lance le navigateur
    const browser = await puppeteer.launch({ headless: true});//,args: ['--proxy-server=35.185.196.38:3128'] 
    const page = await browser.newPage();
  
    // Aller sur Google
    await page.goto('https://www.google.com');
  
    // Saisir l'URL du produit dans la barre de recherche
    await page.type('textarea[name="q"]', aliexpressUrl);
  
    // Soumettre le formulaire de recherche
    await page.keyboard.press('Enter');
  
    // Attendre que la page des résultats de recherche se charge
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 150000 });
  
    // Extraire tous les liens des résultats de recherche
    const searchResults = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('a h3');
      items.forEach(item => {
        const parentLink = item.parentElement.href;
        results.push(parentLink);
      });
      return results;
    });
  
    // Trouver et cliquer sur le lien qui correspond le mieux à l'URL du produit AliExpress
    for (let link of searchResults) {
      if (link.includes('aliexpress.com/item') && link.includes(productId)) {
        await page.goto(link);
        break;
      }
    }//search--picSearch--3aeyGeH|esm-upload-content--Jn-r24P


       // Sélecteur de l'élément à survoler (remplacez-le par le sélecteur correct)
                const hoverSelector = '.search--picSearch--3aeyGeH'; // Exemple : '.btn-hover'

                // Survoler l'élément
                await page.waitForSelector(hoverSelector);
                await page.hover(hoverSelector);

                // Attendre que le sélecteur s'affiche (remplacez-le par le sélecteur correct de l'élément affiché)
                const dropdownSelector = '.esm--upload-content--Jn-r24P'; // Exemple : '.dropdown-menu'
                await page.waitForSelector(dropdownSelector);

                // Sélecteur de la zone de recherche par image (remplacez-le par le sélecteur correct)
                const dropZoneSelector = '.esm--upload-content--Jn-r24P'; // Exemple : '.drop-zone'

                // Fonction pour simuler le glisser-déposer
                      async function simulateDragAndDrop(page, filePath, dropZoneSelector) {
                        const input = await page.evaluateHandle(dropZoneSelector => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.style.display = 'none';
                          document.body.appendChild(input);
                          return input;
                        }, dropZoneSelector);

                        await input.uploadFile(filePath);

                        await page.evaluate((dropZoneSelector, input) => {
                          const dataTransfer = new DataTransfer();
                          dataTransfer.items.add(input.files[0]);

                          const event = new DragEvent('drop', {
                            bubbles: true,
                            cancelable: true,
                            dataTransfer: dataTransfer,
                          });

                          const dropZone = document.querySelector(dropZoneSelector);
                          dropZone.dispatchEvent(event);
                        }, dropZoneSelector, input);
                      }

                    // Simuler le glisser-déposer de l'image
                    await simulateDragAndDrop(page, imagePath, dropZoneSelector);

                // Attendre quelques secondes pour voir le résultat
                  await new Promise(resolve => setTimeout(resolve, 5000));

          // Sélecteur de l'élément à survoler (remplacez-le par le sélecteur correct)
        //const hoverSelector = '.some-hover-element'; // Exemple : '.btn-hover'

        // Survoler l'élément
        //await page.waitForSelector(hoverSelector);
        //await page.hover(hoverSelector);

        // Attendre que le sélecteur s'affiche (remplacez-le par le sélecteur correct de l'élément affiché)
        //const dropdownSelector = '.hover-dropdown'; // Exemple : '.dropdown-menu'
        //await page.waitForSelector(dropdownSelector);

        // Interagir avec le sélecteur affiché (exemple : cliquer sur un élément)
        //const itemToClickSelector = '.dropdown-item'; // Exemple : '.dropdown-item'
       // await page.click(itemToClickSelector);

     
        // Prendre une capture d'écran de la page du produit
        await page.screenshot({ path: 'page.png' });
  
    // Fermer le navigateur
    //await browser.close();
 
}


//////////////////////////Products similar Scraper/////////////
async function getSimilarItems(productUrl) {

  await googleSearchProds(productUrl);
 
}
/////////////////////////////////////////////////////////////
 // Fonction pour télécharger l'image
  async function downloadImage(url, filePath) {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }




/////////////////Products simalar scraper by image////////////
async function getSimilarItemsByimg(productUrl){
                  
                  const browser = await puppeteer.launch({ 
                    headless: true });/*,args: ['--proxy-server=35.185.196.38:3128']*/
                const page = await browser.newPage();
                //const photoUrl = 'https://fr.aliexpress.com/w/wholesale-.html?isNewImageSearch=y&filename='+productUrl+'&isNewImageSearch=y&g=y&sortType=total_tranpro_desc&gatewayAdapt=glo2fra';
                const photoUrl = productUrl;
                //await page.goto(photoUrl);

                await page.goto(photoUrl, { waitUntil: 'networkidle2', timeout: 150000 });
                // Extraire le contenu HTML complet de la page
                const pageContent = await page.content();
                // Enregistrer le contenu de la page dans un fichier texte
                fs.writeFile('pageContent.txt', pageContent, (err) => {
                if (err) {
                console.error('Erreur lors de l\'écriture du fichier', err);
                } else {
                console.log('Le contenu de la page a été enregistré avec succès dans pageContent.txt');
                }
                });

                // Attendre que les articles similaires soient chargés - ajustez le sélecteur selon la page
                await page.waitForSelector('.multi--modalContext--1Hxqhwi');
                // Nombre de fois à défiler
                const scrollTimes = 1;
                const scrollDistance = 50; // Distance à défiler en pixels à chaque fois
                await scrollDown(page, scrollDistance);


                // Extraire les informations des articles similaires
                const similarItems = await page.evaluate(() => {


                // Sélecteurs pour les articles similaires
                const items = document.querySelectorAll('.multi--modalContext--1Hxqhwi');

                console.log(items);


                return Array.from(items).map(item => {
                // Ajustez les sélecteurs ci-dessous pour correspondre aux informations des articles similaires sur la page
                const title = item.querySelector('.multi--title--G7dOCj3')?.title || 'No title';
                const reviews = item.querySelector('.multi--evalutionModal--Ktfxu90')?.innerHTML || 'No review';
                const sold = item.querySelector('.multi--trade--Ktbl2jB')?.innerText || 'No sold';
                const price = item.querySelector('.multi--price--1okBCly')?.innerHTML || 'No Price';
                const link = item.querySelector('.multi--container--1UZxxHY')?.href || 'No link';

                const image = item.querySelector('.multi--img--1IH3lZb')?.src || 'No image';
                const choise = item.querySelector('.tag--imgStyle--1lYatsQ')?.src || '';

                const shipping = item.querySelector('.multi--serviceContainer--3vRdzWN')?.innerText || 'No information about shipping';


                //const n = n + 1;

                return { title, reviews, sold, price, link, image, shipping, choise};
                });
                });

                await browser.close();

                return similarItems;

}
/////////////////////////////////////////////////////////////



/////////////////////Route pour traiter les requêtes POST
app.post('/process', async (req, res) => {
  const productUrl = req.body.url;
  console.log('Received URL:', productUrl);

  try {
    await googleSearchProds(productUrl);
    //const similarItems = await getSimilarItems(productUrl);
    //req.redirect('/page');// Redirige vers screenshot
    //req.session.formData = similarItems; // Stocke les données dans la session
    res.redirect('/result'); // Redirige vers la page de résultat
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500);//send('Erreur lors de la récupération des articles similaires');
    res.redirect('/');
  }
});



///////////////////Route pour afficher la page de résultat
app.get('/result', (req, res) => {
  if (req.session.formData) {
      res.sendFile(path.join(__dirname, 'public', 'result.html'));
      req.redirect('/page');
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



app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

//https://recom-acs.aliexpress.com/h5/mtop.relationrecommend.aliexpressrecommend.recommend/1.0/?jsv=2.5.1&appKey=24815441&t=1721146563724&sign=cfa080072e57d427abeaac1966de3b25&api=mtop.relationrecommend.AliexpressRecommend.recommend&v=1.0&timeout=50000&type=originaljson&dataType=jsonp



// Fonction pour extraire le numéro du produit à partir de l'URL AliExpress
function extractProductId(url) {
  const regex = /item\/(\d+)\.html/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
