const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const apiKey = (env.match(/CANADA_POST_API_KEY=(.+)/) || [])[1]?.trim() || '';
const apiSecret = (env.match(/CANADA_POST_API_SECRET=(.+)/) || [])[1]?.trim() || '';

const tokenUrl = 'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/cpc-api-native-oauth-provider/oauth2/token';
const params = new URLSearchParams();
params.append('grant_type', 'client_credentials');
params.append('scope', 'merchant');

async function run() {
  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'X-IBM-Client-Id': apiKey,
      'X-IBM-Client-Secret': apiSecret,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  const url = 'https://api.canadapost-postescanada.ca/prod/devportal-portaildesdeveloppeurs/rating/v1/prices';

  const serviceCodes = ['DOM.RP', 'DOM.EP', 'DOM.XP', 'DOM.PC'];

  const results = await Promise.all(serviceCodes.map(async (code) => {
    const payload = {
      services: [code],
      parcelCharacteristics: {
        weight: 2.5,
        dimensions: { length: 25, width: 20, height: 15 }
      },
      originPostalCode: 'K2E5V2',
      destination: { domestic: { postalCode: 'V5K0A1' } }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Language': 'en-CA',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;
    const quotes = await response.json();
    return Array.isArray(quotes) ? quotes[0] : null;
  }));

  const validQuotes = results.filter(Boolean);
  console.log('PARALLEL QUOTES COUNT:', validQuotes.length);
  validQuotes.forEach(q => console.log(q.serviceName + ' (' + q.serviceCode + ') => $' + q.priceDetails?.due + ' | Days: ' + q.serviceStandard?.expectedTransitTime));
}

run();
