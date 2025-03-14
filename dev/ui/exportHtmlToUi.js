// This script reads all HTML files in the current directory, escapes their content, 
// and generates a uiService.js file that exports a function returning an object 
// with the HTML content embedded.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const UI_FOLDER = '../../src';
// Construct __dirname manually for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.html'));

const htmlContents = htmlFiles.reduce((acc, file) => {
    const content = escapeHtml(fs.readFileSync(path.join(__dirname, file), 'utf-8'));
    const key = path.basename(file, '.html');
    acc[key] = `\`${content}\``;
    return acc;
}, {});

const getJsInString = (htmlContents) => {
    let str = '{\n';
    for (const key in htmlContents) {
        str += `${key}: ${htmlContents[key]},\n`;
    }
    str += '}';
    return str;
}


// Function to escape special characters like backticks (`) and dollar signs ($)
function escapeHtml(content) {
    return content
        .replace(/`/g, '\\`')  // Escape backticks
        .replace(/\$/g, '\\$') // Escape dollar signs
        .replace(/\\([a-z])/gi, '\\\\$1'); // Escape backslash followed by any letter
}


const outputJsContent = 
`

// WARNING: This file is autogenerated. DO NOT EDIT!
//This file is autogenerated by dev/ui/exportHtmlToUi.js
const ui = (baseURL) => {
    if(!baseURL) return htmlMap;
    return Object.keys(htmlMap).reduce((acc, key) => {
        acc[key] = htmlMap[key].replace(/\\/telemetry/g, baseURL);
        return acc;
    }, {});
}

export const htmlMap = 
    ${getJsInString(htmlContents)};

    
export default ui
`;

fs.writeFileSync( path.join(__dirname, UI_FOLDER, 'services/uiService.js'), outputJsContent, 'utf-8');

console.log('UI export completed: uiService.js has been generated.');