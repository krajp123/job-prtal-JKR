const twilio = require('twilio');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  if (!TWILIO_ACCOUNT_SID.startsWith('AC')) {
    console.warn('Twilio ACCOUNT SID is not valid. Twilio SMS is disabled for local development.');
  } else {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
} else {
  console.warn('Twilio credentials are not configured. Twilio SMS is disabled for local development.');
}

module.exports = { twilioClient, TWILIO_PHONE_NUMBER };
