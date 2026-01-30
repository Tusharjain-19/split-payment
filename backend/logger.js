import fs from 'fs';
try {
  await import('./server.js');
} catch (e) {
  fs.writeFileSync('crash.txt', e.stack);
}
