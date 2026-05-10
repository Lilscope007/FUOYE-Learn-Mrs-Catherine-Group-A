const fs = require('fs');

let file = fs.readFileSync('server.ts', 'utf-8');

file = file.replace(/await await/g, 'await');
file = file.replace(/const transactionalSeed = db.transaction\(\(\) => \{/g, 'const transactionalSeed = db.transaction(async () => {');
file = file.replace(/function seedDatabaseIfNeeded\(\) \{/g, 'async function seedDatabaseIfNeeded() {');
file = file.replace(/db\.transaction\(\(\) => \{/g, 'db.transaction(async () => {');

// Fix calls to transactionalSeed
file = file.replace(/transactionalSeed\(\);/g, 'await transactionalSeed();');
// Fix calls where db.prepare(...).run() inside wasn't replaced properly. I'll just use a regex over .forEach
file = file.replace(/curriculum\.forEach\(sem => \{/g, 'for (const sem of curriculum) {');
file = file.replace(/sem\.courses\.forEach\(\(c, index\) => \{/g, 'for (let index = 0; index < sem.courses.length; index++) { const c = sem.courses[index];');

fs.writeFileSync('server.ts', file);
console.log("Done fixing");
