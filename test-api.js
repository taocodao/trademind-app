const http = require('http');

http.get('http://34.235.119.67:8002/api/turbobounce/signals', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('TurboBounce Length:', parsed.length || parsed.signals?.length || 0);
            console.log('Sample:', JSON.stringify(parsed[0] || parsed.signals?.[0]).substring(0, 150));
        } catch (e) {
            console.log('Error parsing:', e.message);
        }
    });
}).on('error', err => console.log('Req error:', err.message));

http.get('http://34.235.119.67:8002/api/signals', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log('Theta Length:', parsed.length || parsed.signals?.length || 0);
        } catch (e) { }
    });
});
