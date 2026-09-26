import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize} from '../scripts/studio.js';
test('structural failures count; infrastructure failures are not model scores',()=>{
assert.deepEqual(summarize([{validation:{pass:true}},{validation:{pass:false}},{validation:{pass:true}}]),{score:67,passed:2,total:3});
assert.equal(summarize([{executionError:'browser missing',validation:null}]).score,null);
assert.equal(summarize([]).score,null);
});
