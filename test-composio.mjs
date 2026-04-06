import { Composio } from '@composio/core';

const composio = new Composio({ apiKey: 'x' }); // dummy key
console.log("Composio loaded");
console.log("Keys in composio:", Object.keys(composio));
