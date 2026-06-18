const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\Luanm\\.gemini\\antigravity-ide\\brain\\4d78850b-aa19-42a1-a1b8-ef9dca038632\\media__1781824615399.png';
const dest = 'c:\\Users\\Luanm\\.gemini\\Enfortec\\client\\public\\logo.png';

try {
  fs.copyFileSync(src, dest);
  console.log('Logo copied successfully!');
} catch (err) {
  console.error('Failed to copy logo:', err);
}
