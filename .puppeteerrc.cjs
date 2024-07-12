const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Modifie l'emplacement du cache pour Puppeteer
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};