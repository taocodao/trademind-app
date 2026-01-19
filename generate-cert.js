const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

console.log('Generating self-signed certificates...');

try {
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });

    fs.writeFileSync(path.join(__dirname, 'cert.crt'), pems.cert);
    fs.writeFileSync(path.join(__dirname, 'cert.key'), pems.private);

    console.log('Certificates generated successfully: cert.crt, cert.key');
} catch (error) {
    console.error('Error generating certificates:', error);
    process.exit(1);
}
