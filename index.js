const dotenvConfig = require('dotenv').config();
const term = require('terminal-kit').terminal;
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const moment = require('moment');

term.green('======================================================\n');
term.green('================APP LAUNCHED CHECK TOOL===============\n');
term.green('======================================================\n');
term.cyan('앱 출시 확인\n\n');
term.cyan('확인하려는 디바이스는?\n');

const deviceItems = [
	'both',
	'ios',
	'android'
];
const intervalTimeItems = [
  '1분',
  '3분',
  '5분',
  '10분',
  '60분',
];

const getMinToMs = (min) => (min * 60000);
const getNowTime = (format) => moment().format(format);
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const terminate = () => setTimeout(function() {process.exit()}, 100);

term.singleColumnMenu(deviceItems, function( _, dr ) {
  term.cyan('확인하고 싶은 시간 주기는?\n');
  term.singleColumnMenu(intervalTimeItems, function( _, ir ) {
    term('\n').eraseLineAfter.green(
      "선택한 디바이스: %s\n",
      dr.selectedText,
    );
    term('\n').eraseLineAfter.green(
      "선택한 시간주기: %s\n",
      ir.selectedText,
    );
    const device = dr.selectedText;
    const setInterValTime = Number(ir.selectedText.replace(/[^0-9.]/g, ""));
    checkFn(device, getMinToMs(setInterValTime));
  });
});

const checkFn = (device, setInterValTime) => {
  term.green('======================================================\n');
  term.green('================= 앱 출시 버전 체크 시작 ==================\n');
  term.green(`체크 시작 시간: ${getNowTime('MMMM Do YYYY, h:mm:ss a')}\n`);
  term.green('Hit CTRL-C to quit.\n\n');
  term.on('key' , function(name , matches , data) {
    if (name === 'CTRL_C') terminate();
  });
  const isCheckIOS = (device === 'both' || device === 'ios');
  const isCheckAndroid = (device === 'both' || device === 'android');
  try {
    if (dotenvConfig.error) {
      throw dotenvConfig.error;
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

    let iosVersion, androidDeployedDate;
    let newIosVersion, newAndroidDeployedDate;
    const currentCheckDeployedFlag = {
      ios: false,
      android: false,
    };
    const iosCheck = (newData) => {
      if (
        !!iosVersion
        && iosVersion !== newData
      ) {
        term.green('======================================================\n');
        term.green('업데이트 IOS 버전 출시 완료.\n');
        term.green(`출시 확인 시간: ${getNowTime('MMMM Do YYYY, h:mm:ss a')}\n`);
        term.green(`출시 버전: ${newData}\n`);
        term.green('======================================================\n');
        return true;
      }
      return false;
    };
    const androidCheck = (newData) => {
      if (
        !!androidDeployedDate
        && androidDeployedDate !== newData
      ) {
        term.green('======================================================\n');
        term.green('업데이트 Android 버전 출시 완료.\n');
        term.green(`출시 확인 시간: ${getNowTime('MMMM Do YYYY, h:mm:ss a')}\n`);
        term.green(`출시 날짜: ${newData}\n`);
        term.green('======================================================\n');
        return true;
      }
      return false;
    };
    let count = 0;
    (async () => {
      let $;
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      const exitTerm = async () => {
        await browser.close();
        term.processExit();
      };
      const intervalChecking = async () => {
        count ++;
        if (isCheckIOS && !currentCheckDeployedFlag.ios) {
          await page.goto(IOS_URL);
          $ = await readHtml(page);
          newIosVersion = $(IOS_EL_PATH).text();
        }
        if (isCheckAndroid && !currentCheckDeployedFlag.android) {
          await page.goto(ANDROID_URL);
          $ = await readHtml(page);
          newAndroidDeployedDate = $(ANDROID_EL_PATH).text();
        }
        term.green('-----------------------------------------------------------\n');
        term.green(`${count}번째 체크 시간: ${getNowTime('h:mm:ss a')}\n`);
        if (isCheckIOS) {
          term.red(`현재 IOS 버전: ${(
            newIosVersion.split('Version ')[1]
            || iosVersion.split('Version ')[1]
          )}\n`);
        }
        if (isCheckAndroid) {
          term.red(`현재 Android 출시 날짜: ${(
            newAndroidDeployedDate
            || androidDeployedDate
          )}\n`);
        }
        term.green('-----------------------------------------------------------\n');
        if (isCheckIOS && !currentCheckDeployedFlag.ios) {
          currentCheckDeployedFlag.ios = iosCheck(newIosVersion);
        }
        if (isCheckAndroid && !currentCheckDeployedFlag.android) {
          currentCheckDeployedFlag.android = androidCheck(newAndroidDeployedDate);
        }
        if (
          device === 'both'
          && currentCheckDeployedFlag.ios
          && currentCheckDeployedFlag.android
        ) {
          await exitTerm();
          return;
        }
        if (currentCheckDeployedFlag[device]) {
          await exitTerm();
          return;
        }
        await delay(setInterValTime);
        await intervalChecking();
      };
      iosVersion = newIosVersion;
      androidDeployedDate = newAndroidDeployedDate;
      await intervalChecking();
      await browser.close();
      term.processExit();
    })();
  } catch(err) {
    console.error('There was an uncaught error', err);
    term.processExit();
  }
};
