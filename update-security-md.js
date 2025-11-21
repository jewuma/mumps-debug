
// eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))
let securityMd = fs.readFileSync('./security.md', 'utf8')
const version = packageJson.version;

// Regex, um die Version in der Tabelle zu finden und zu ersetzen
const versionRegex = /\|\s*([\d.]+)\s*\|\s*:white_check_mark:/;

// Ersetzen der Version in der Tabelle oder Hinzufügen, falls nicht vorhanden
if (versionRegex.test(securityMd)) {
	securityMd = securityMd.replace(versionRegex, `|  ${version}  | :white_check_mark:`);
}

// Aktualisierte security.md speichern
fs.writeFileSync('./security.md', securityMd);

console.log(`Updated security.md with version ${version}`);
