import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ui from '../../src/ui.js';


// Construct __dirname manually for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths for the ui.js and output HTML files
const mainHtmlPath = path.join(__dirname, 'main.html');
const detailHtmlPath = path.join(__dirname, 'detail.html');

// Function to unescape special characters
function unescapeHtml(content) {
    return content
        .replace(/\\`/g, '`')   // Unescape backticks
        .replace(/\\\$/g, '$'); // Unescape dollar signs
}



// Extract the main and detail HTML content
const mainHtmlMatch = ui().main;
const detailHtmlMatch = ui().detail;

if (!mainHtmlMatch || !detailHtmlMatch) {
    console.error("ERROR: Could not extract HTML content from ui.js.");
    process.exit(1);
}

// Unescape and store the HTML content
const mainHtmlContent = unescapeHtml(mainHtmlMatch);
const detailHtmlContent = unescapeHtml(detailHtmlMatch);

// Write the content back to the original HTML files
fs.writeFileSync(mainHtmlPath, mainHtmlContent, 'utf-8');
fs.writeFileSync(detailHtmlPath, detailHtmlContent, 'utf-8');

console.log('HTML import completed: main.html and detail.html have been restored.');
