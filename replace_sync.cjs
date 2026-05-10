const fs = require('fs');

let file = fs.readFileSync('server.ts', 'utf-8');

file = file.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)/g, 'await db.prepare($1).get($2)');
file = file.replace(/db\.prepare\((.*?)\)\.all\((.*?)\)/g, 'await db.prepare($1).all($2)');
file = file.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)/g, 'await db.prepare($1).run($2)');

// Handle the cases without args: db.prepare('...').all()
file = file.replace(/db\.prepare\((.*?)\)\.get\(\)/g, 'await db.prepare($1).get()');
file = file.replace(/db\.prepare\((.*?)\)\.all\(\)/g, 'await db.prepare($1).all()');
file = file.replace(/db\.prepare\((.*?)\)\.run\(\)/g, 'await db.prepare($1).run()');

// There are a few route handlers that are not async. We need to make them async
file = file.replace(/app\.get\((.*?),\s*\((.*?)\)\s*=>\s*\{/g, 'app.get($1, async ($2) => {');
file = file.replace(/app\.post\((.*?),\s*\((.*?)\)\s*=>\s*\{/g, 'app.post($1, async ($2) => {');
file = file.replace(/app\.get\((.*?),\s*authenticateToken,\s*\((.*?)\)\s*=>\s*\{/g, 'app.get($1, authenticateToken, async ($2) => {');
file = file.replace(/app\.post\((.*?),\s*authenticateToken,\s*\((.*?)\)\s*=>\s*\{/g, 'app.post($1, authenticateToken, async ($2) => {');

fs.writeFileSync('server.ts', file);
console.log("Done");
