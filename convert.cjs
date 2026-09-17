const fs = require('fs');
const path = require('path');

const screens = [
  { dir: 'test_results_healops', name: 'TestResults' },
  { dir: 'incident_management_healops', name: 'Incidents' },
  { dir: 'ai_incident_analysis_healops', name: 'AIAnalysis' },
  { dir: 'system_health_healops', name: 'SystemHealth' },
  { dir: 'login_sign_up_healops', name: 'Login' },
  { dir: 'main_dashboard_healops', name: 'Settings' } // Using dashboard as placeholder for settings
];

screens.forEach(screen => {
  const codePath = path.join(__dirname, screen.dir, 'code.html');
  if (fs.existsSync(codePath)) {
    const content = fs.readFileSync(codePath, 'utf8');
    let mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    let innerHtml = mainMatch ? mainMatch[1] : content;
    
    // For login, we want the whole body (minus scripts) since it doesn't have <main> in the sidebar layout
    if (screen.name === 'Login') {
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      innerHtml = bodyMatch ? bodyMatch[1] : content;
    }

    // Safely stringify the HTML to avoid escaping issues
    const safeHtml = JSON.stringify(innerHtml);
    
    const componentCode = `import React from 'react';\n\nexport default function ${screen.name}() {\n  return (\n    <div dangerouslySetInnerHTML={{ __html: ${safeHtml} }} />\n  );\n}\n`;
    
    fs.writeFileSync(path.join(__dirname, 'src', 'pages', `${screen.name}.jsx`), componentCode);
  }
});

console.log('React components generated from HTML files using dangerouslySetInnerHTML.');
