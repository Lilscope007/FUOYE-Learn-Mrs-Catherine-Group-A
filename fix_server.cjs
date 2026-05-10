const fs = require('fs');

let file = fs.readFileSync('server.ts', 'utf-8');

file = file.replace(/await db\.prepare/g, 'db.prepare');
file = file.replace(/db\.prepare\((.*?)\)\.get\((.*?)\)/g, 'await db.prepare($1).get($2)');
file = file.replace(/db\.prepare\((.*?)\)\.all\((.*?)\)/g, 'await db.prepare($1).all($2)');
file = file.replace(/db\.prepare\((.*?)\)\.run\((.*?)\)/g, 'await db.prepare($1).run($2)');

file = file.replace(/db\.prepare\((.*?)\)\.get\(\)/g, 'await db.prepare($1).get()');
file = file.replace(/db\.prepare\((.*?)\)\.all\(\)/g, 'await db.prepare($1).all()');
file = file.replace(/db\.prepare\((.*?)\)\.run\(\)/g, 'await db.prepare($1).run()');

// Fix the forEach errors!
file = file.replace(/curriculum\.forEach\(sem => \{/g, 'for (const sem of curriculum) {');
file = file.replace(/sem\.courses\.forEach\(\(c, index\) => \{/g, 'for (let index = 0; index < sem.courses.length; index++) { const c = sem.courses[index];');

file = file.replace(/await await/g, 'await');

file = file.replace(/\}\);\n    \}\);\n  \}/g, '}\n    }\n  }');

fs.writeFileSync('server.ts', file);
