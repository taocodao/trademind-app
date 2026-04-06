import { Composio } from '@composio/core';
import fs from 'fs';

const c = new Composio({ apiKey: 'x' });
fs.writeFileSync('out-composio-keys.txt', "Properties: " + Object.keys(c).join(", ") + "\nPrototype: " + Object.getOwnPropertyNames(Object.getPrototypeOf(c)).join(", "));
