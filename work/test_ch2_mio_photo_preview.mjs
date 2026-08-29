import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../css/echo.css',import.meta.url),'utf8');
const assets=fs.readFileSync(new URL('../js/echo/EchoAssets.js',import.meta.url),'utf8');

assert.match(assets,/CH2-MIO-PHOTO-01['"]:\s*['"].*ch2_mio_photo_01\.png/);
assert.match(css,/Capture preview keeps the complete portrait photo[\s\S]*grid-template-rows:minmax\(0,1fr\)/);
assert.match(css,/Capture preview keeps the complete portrait photo[\s\S]*width:auto;height:auto;max-width:min\(60vw,760px\);max-height:60dvh;object-fit:contain/);
assert.match(css,/max-width:min\(78vw,760px\);max-height:60dvh/);
assert.doesNotMatch(css,/Capture preview keeps the complete portrait photo[\s\S]*?(?:object-fit|background-size):cover/);

console.log('CH2 MIO PHOTO PREVIEW FULL-VIEW: PASS');
