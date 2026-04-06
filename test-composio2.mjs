import { Composio } from '@composio/core';
import fs from 'fs';

const composio = new Composio({ apiKey: 'x' }); // dummy key
let out = "ConnectedAccounts methods:\n";
out += Object.getOwnPropertyNames(Object.getPrototypeOf(composio.connectedAccounts)).join("\n");
fs.writeFileSync('out-composio.txt', out);
console.log("Done");
