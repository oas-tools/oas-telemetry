import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const UI_FOLDER = '../../src';
// Construct __dirname manually for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Paths for the HTML files
const mainHtmlPath = path.join(__dirname, 'main.html');
const detailHtmlPath = path.join(__dirname, 'detail.html');
const outputPath = path.join(__dirname, UI_FOLDER, 'ui.js');

// Function to escape special characters like backticks (`) and dollar signs ($)
function escapeHtml(content) {
    return content
        .replace(/`/g, '\\`')  // Escape backticks
        .replace(/\$/g, '\\$') // Escape dollar signs
        .replace(/\\([a-z])/gi, '\\\\$1'); // Escape backslash followed by any letter
}

// Read and escape the main HTML content
const mainHtml = escapeHtml(fs.readFileSync(mainHtmlPath, 'utf-8'));

// Read and escape the detail HTML content
const detailHtml = escapeHtml(fs.readFileSync(detailHtmlPath, 'utf-8'));

// Write the ui.js file with the HTML content embedded
const outputJsContent = 
`export default function ui() {
    return {
        main: \`${mainHtml}\`,
        detail: \`${detailHtml}\`
    };
}
`;

// Write the generated JavaScript content to ui.js
fs.writeFileSync(outputPath, outputJsContent, 'utf-8');

console.log('UI export completed: ui.js has been generated.');
