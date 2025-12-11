const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  '559237546949-rm0mf51u5gmv8mlu9mh42e1m40i5tr63.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/oauth2callback'  // MUST MATCH your Google Console redirect
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  prompt: 'consent'
});

console.log('\nVisit this URL to authorize:\n');
console.log(authUrl + '\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Paste the code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\nYour GOOGLE_REFRESH_TOKEN:\n');
    console.log(tokens.refresh_token);
  } catch (err) {
    console.error('Error retrieving token:', err);
  }
});
