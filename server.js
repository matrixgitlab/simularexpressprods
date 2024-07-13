const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const puppeteer = require('puppeteer');
const session = require('express-session');
const { stringify } = require('querystring');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

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
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 190);
        });
    }, distance);
}
//////////////////////////Products similar Scraper/////////////
async function getSimilarItems(productUrl) {
  
  const browser = await puppeteer.launch({ 
                                            headless: false });/*,
                                            args: ['--proxy-server=35.185.196.38:3128']*/
  const page = await browser.newPage();
  const photoUrl = 'https://fr.aliexpress.com/w/wholesale-.html?isNewImageSearch=y&filename='+productUrl+'&isNewImageSearch=y&g=y&sortType=total_tranpro_desc';

  //await page.goto(photoUrl);
  
  await page.goto(photoUrl, { waitUntil: 'networkidle2' });
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

// Route pour traiter les requêtes POST
app.post('/process', async (req, res) => {
  const productUrl = req.body.url;
  console.log('Received URL:', productUrl);

  try {
    const similarItems = await getSimilarItems(productUrl);
    req.session.formData = similarItems; // Stocke les données dans la session
    res.redirect('/result'); // Redirige vers la page de résultat
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500);//send('Erreur lors de la récupération des articles similaires');
    res.redirect('/');
  }
});
// Route pour afficher la page de résultat
app.get('/result', (req, res) => {
  if (req.session.formData) {
      res.sendFile(path.join(__dirname, 'public', 'result.html'));
  } else {
      res.redirect('/');
  }
});


// Définir une route pour /pageContent pour // Lire le fichier pageContent.txt
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


// Route pour envoyer les données de la session au client
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

/*const fetchGames = async () => {
            try {
                 
                  const response = await axios.get('url');
                  const html = response.data
                  const $ = cheerio.load(html)
                  const games = []
                  $('div.sg-col-4-of-12.s-result-item.s-asin.sg-col-4-of-16.sg-col.sg-col-4-of-20').each((index, el) => {
                        const game = $(el)
                        const title = game.find('span.a-size-base-plus.a-color-base.a-text-normal').text()
                        games.push(title)
               })
                        return games
            } catch (err) {
                  console.error(err)
            }
            
            }
                //fetchGames().then(games => console.log(games))*/

