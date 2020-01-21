const dotenvConfig = require('dotenv').config();
const term = require('terminal-kit').terminal;
const fs = require('fs');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { map, toNumber } = require('lodash');

const checkDevice = ((device) => {
  if (device === 'both' || !device) return 'both';
  if (device === 'ios' || device === 'android') return device;
  return false;
})(process.argv[2]);

try {
  if (dotenvConfig.error) {
    throw dotenvConfig.error;
  }
  if (!checkDevice) {
    throw 'device (both|ios|android)';
  }
  const readHtml = async (p) => {
    const html = await p.$eval('body', e => e.outerHTML);
    const load = cheerio.load(html, {decodeEntities: false});
    return load;
  };
  const dotenv = dotenvConfig.parsed;
  const {
    IOS_URL, ANDROID_URL,
    IOS_EL_PATH, ANDROID_EL_PATH,
  } = dotenv;
  (async () => {
    let $;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(IOS_URL);
    $ = await readHtml(page);
    const iosVersion = $(IOS_EL_PATH).text();
    await page.goto(ANDROID_URL);
    $ = await readHtml(page);
    const androidDeployedDate = $(ANDROID_EL_PATH).text();
    console.log({
      iosVersion,
      androidDeployedDate,
    });
    await browser.close();
  })();
} catch(err) {
  console.error('There was an uncaught error', err);
  process.exit();
}