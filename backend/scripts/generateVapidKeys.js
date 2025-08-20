const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeys = webpush.generateVAPIDKeys();

fs.writeFileSync(path.join(__dirname, '..', 'vapidKeys.json'), JSON.stringify(vapidKeys, null, 2));

console.log('VAPID keys generated and saved to vapidKeys.json');
