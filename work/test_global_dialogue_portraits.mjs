import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const characters = JSON.parse(fs.readFileSync(path.join(root, 'data/characters.json'), 'utf8')).characters;
const css = fs.readFileSync(path.join(root, 'css/dialogue.css'), 'utf8');

let assetCount = 0;
for (const [characterId, character] of Object.entries(characters)) {
  assert.ok(character.defaultPortrait in character.portraits, `${characterId}: default portrait missing`);
  for (const [expression, source] of Object.entries(character.portraits)) {
    assetCount += 1;
    const absolutePath = path.join(root, ...source.split('/'));
    assert.ok(fs.existsSync(absolutePath), `${characterId}/${expression}: asset missing`);
    assert.ok(fs.statSync(absolutePath).size > 0, `${characterId}/${expression}: empty asset`);
  }
}

assert.equal(Object.keys(characters).length, 10, 'unexpected character registry size');
assert.equal(assetCount, 63, 'unexpected portrait asset count');
assert.match(css, /max-width:\s*100%;\s*max-height:\s*100%;\s*object-fit:\s*contain/);
assert.match(css, /transform-origin:\s*50%\s+100%/);
assert.doesNotMatch(css, /\.portrait--left\s*\{[^}]*left:\s*-/);
assert.doesNotMatch(css, /\.portrait--right\s*\{[^}]*right:\s*-/);
assert.doesNotMatch(css, /\.portrait\[data-character-id="album"\]\s*\{[^}]*left:\s*-/);
const portraitImageRule = css.match(/\.portrait img\s*\{([^}]*)\}/)?.[1] ?? '';
assert.match(portraitImageRule, /width:\s*auto/);
assert.match(portraitImageRule, /height:\s*auto/);

console.log(`GLOBAL DIALOGUE PORTRAITS: PASS (${Object.keys(characters).length} characters / ${assetCount} assets)`);
