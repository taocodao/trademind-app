const rawExpires = "2026-03-05 14:30:00";
const cleanExp = rawExpires.split('.')[0];
const expStr = cleanExp.endsWith('Z') || cleanExp.includes('+') ? cleanExp : cleanExp + 'Z';

console.log(`Original: ${rawExpires}`);
console.log(`expStr: ${expStr}`);

const expTime = new Date(expStr).getTime();
const now = Date.now();

console.log(`Date parsed: ${new Date(expStr).toISOString()}`);
console.log(`isSignalExpired (SignalProvider logic): ${now > expTime}`);
console.log(`page.tsx logic: ${expTime > now}`); // page.tsx correctly requires expTime > now
