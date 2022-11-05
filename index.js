import { writeFile } from 'fs';
import fetch from 'node-fetch';
import { XMLParser } from 'fast-xml-parser';
import dayjs from 'dayjs';

const openDataSoure1 = {
  name: '3碼郵遞區號與行政區中心點經緯度對照表',
  info: 'https://data.gov.tw/dataset/25489',
  url: 'https://www.post.gov.tw/post/download/1050812_行政區經緯度(toPost).xml',
};

const main = async () => {
  const response = await fetch(openDataSoure1.url);
  const xml = await response.text();

  const options = {
    ignoreAttributes: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    // NOTE:設定XML標籤轉換成物件的屬性
    transformTagName: (tagName) => {
      if (tagName === '_x0031_050429_行政區經緯度_x0028_toPost_x0029_') {
        return 'dataArray';
      }

      if (tagName === '行政區名') {
        return 'name';
      }

      if (tagName === '_x0033_碼郵遞區號') {
        return 'postalCode';
      }

      if (tagName === '中心點經度') {
        return 'longitude';
      }

      if (tagName === '中心點緯度') {
        return 'latitude';
      }

      if (tagName === 'TGOS_URL') {
        return 'tgosUrl';
      }

      return tagName;
    },
  };

  const xmlParser = new XMLParser(options);
  const xmlObject = xmlParser.parse(xml);
  const data = xmlObject.dataroot.dataArray;
  const newObject = {};

  data.forEach((element) => {
    const city = element.name.match(/^\W{0,2}?(?:市|縣|諸島)/g).toString();
    const district = element.name.replace(/^\W{0,2}?(?:市|縣|諸島)/g, '');

    // NOTE: 檢查新物件的城市屬性是否已經存在
    if (!Object.prototype.hasOwnProperty.call(newObject, city)) {
      newObject[city] = {};
    }

    // NOTE: 將行政區資料寫入城市物件內
    newObject[city][district] = {};
    newObject[city][district].latitude = element.latitude;
    newObject[city][district].longitude = element.longitude;

    // NOTE: googleMap 屬性只是方便點擊連結查看區域作用，程式碼內無實際作用，可自行增減
    newObject[city][district].googleMap = `https://www.google.com.tw/maps/@${element.latitude},${element.longitude},16z?hl=zh-TW`;
  });

  const newDistrict = {
    // NOTE: source 使用陣列，是預留可能有多種資料來源
    source: [openDataSoure1],
    buildTime: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
    data: newObject,
  };

  writeFile('taiwanAdministrativeRegion.json', JSON.stringify(newDistrict), (error) => {
    if (error) {
      console.log(error);
    } else {
      console.log('done.');
    }
  });
};

main();
