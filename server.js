const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const puppeteer = require('puppeteer');
const session = require('express-session');
const { stringify } = require('querystring');
const fs = require('fs');

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
            }, 50);
        });
    }, distance);
}
//////////////////////////Products similar Scraper/////////////
async function getSimilarItems(productUrl) {
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(productUrl, { waitUntil: 'networkidle2' });
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
  await page.waitForSelector('._1Hxqh');
// Nombre de fois à défiler
const scrollTimes = 1;
const scrollDistance = 50; // Distance à défiler en pixels à chaque fois
await scrollDown(page, scrollDistance);


  // Extraire les informations des articles similaires
  const similarItems = await page.evaluate(() => {
    
    
    // Sélecteurs pour les articles similaires
    const items = document.querySelectorAll('._1Hxqh');

    console.log(items);
  

    return Array.from(items).map(item => {
      // Ajustez les sélecteurs ci-dessous pour correspondre aux informations des articles similaires sur la page
      const title = item.querySelector('.G7dOC')?.innerText || 'No title';
      const reviews = item.querySelector('.EYoOU')?.src || 'No review';
      const sold = item.querySelector('.Ktbl2')?.innerText || 'No sold';
      const price = item.querySelector('.U-S0j')?.innerText || 'No price';
      const realprice = item.querySelector('._1zEQq')?.innerText || 'Real Price';
      const link = item.querySelector('._1UZxx')?.href || 'No link';

      const image = item.querySelector('._1IH3l')?.src || 'No image';
      const choise = item.querySelector('._1lYat')?.src || 'No image';
      
      const shipping = item.querySelector('._3vRdz')?.innerText || 'No information about shipping';

   
    //const n = n + 1;

      return { title, reviews, sold, price, realprice, link, image, shipping, choise};
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

  // Envoyer le fichier en tant que pièce jointe pour téléchargement
  res.download(filePath, 'pageContent.txt', (err) => {
      if (err) {
          console.error('Erreur lors de l\'envoi du fichier', err);
          res.status(500).send('Erreur lors de l\'envoi du fichier');
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

