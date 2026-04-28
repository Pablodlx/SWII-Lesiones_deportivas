const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/swii_lesiones',
  openMeteoBaseUrl: process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast',
  meteoalarmFeedUrl: process.env.METEOALARM_FEED_URL || 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom.xml'
};
