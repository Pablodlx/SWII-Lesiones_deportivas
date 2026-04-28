const { parseStringPromise, Builder } = require('xml2js');

async function parseXmlBody(xmlText) {
  const parsed = await parseStringPromise(xmlText, { explicitArray: false, trim: true });
  const rootKey = Object.keys(parsed)[0];
  return parsed[rootKey] || {};
}

function asXml(rootName, payload) {
  const builder = new Builder({ rootName, xmldec: { version: '1.0', encoding: 'UTF-8' }, headless: false });
  return builder.buildObject(payload);
}

module.exports = { parseXmlBody, asXml };
