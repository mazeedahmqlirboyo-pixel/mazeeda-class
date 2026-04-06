const fs = require('fs');
const path = require('path');

const files = [
  'src/App.jsx',
  'src/components/RekapanModal.jsx',
  'src/components/SearchableSelect.jsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/emerald/g, 'blue');
    content = content.replace(/teal/g, 'blue');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced theme in ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
