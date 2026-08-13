const fs = require('fs');

let css = fs.readFileSync('src/style.css', 'utf8');

const replacements = [
  // Backgrounds light colors
  { regex: /#(f0f0f0|eeeeee|eee|f5f5f5|e0e0e0|e0e0e0|f9f9f9|f4faf5|fff8e1|fafafa|f1f8e9|e8f5e9|e3f2fd|fff3e0|fff|ffffff)(?=[; \n}])/gi, replacement: 'var(--surface)' },
  
  // Dark text colors
  { regex: /color:\s*#(333333|333|444444|444|555555|555|111111|111|222222|222)(?=[; \n}])/gi, replacement: 'color: var(--text)' },
  
  // Muted text colors
  { regex: /color:\s*#(666666|666|777777|777|888888|888|999999|999)(?=[; \n}])/gi, replacement: 'color: var(--text-muted)' },
  
  // Borders
  { regex: /border.*?#(ddd|dddddd|ccc|cccccc|eee|eeeeee)(?=[; \n}])/gi, replacement: (match) => match.replace(/#[a-f0-9]{3,6}/i, 'var(--surface-border)') }
];

replacements.forEach(r => {
  css = css.replace(r.regex, r.replacement);
});

fs.writeFileSync('src/style.css', css);
console.log('CSS fixed!');
