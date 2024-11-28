import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ui from '../../src/services/uiService.js';


// Construct __dirname manually for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths for the ui.js and output HTML files
const mainHtmlPath = path.join(__dirname, 'main.html');
const detailHtmlPath = path.join(__dirname, 'detail.html');

// Unescapes special characters
function unescapeHtml(content) {
    return content
        .replace(/\\`/g, '`')   // Unescape backticks
        .replace(/\\\$/g, '$'); // Unescape dollar signs
}

// Generalize the process for all properties in the ui object
const htmlFiles = Object.keys(ui());

htmlFiles.forEach(key => {
    const htmlContent = ui()[key];
    if (!htmlContent) {
        console.error(`ERROR: Could not extract HTML content for ${key}.`);
        process.exit(1);
    }

    const unescapedHtmlContent = unescapeHtml(htmlContent);
    const htmlFilePath = path.join(__dirname, `${key}.html`);
    fs.writeFileSync(htmlFilePath, unescapedHtmlContent, 'utf-8');
    console.log(`HTML import completed: ${key}.html has been restored.`);
});