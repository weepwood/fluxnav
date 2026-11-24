import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeLibrary,decodeLibrary} from '../src/crypto.ts';
import {parseLibrary} from '../src/domain.ts';
test('AES-GCM round trip, randomness and wrong password',async()=>{
 const lib=parseLibrary([{id:'a',title:'Example',url:'https://example.com',addedAt:1,updatedAt:1}]);
 const password='unique-long-password';
 const encrypted=await encodeLibrary(lib,password);
 assert.ok('ciphertext' in encrypted);
 assert.ok(!JSON.stringify(encrypted).includes('example.com'));
 assert.deepEqual(await decodeLibrary(encrypted,password),lib);
 assert.notDeepEqual(await encodeLibrary(lib,password),encrypted);
 await assert.rejects(decodeLibrary(encrypted,'wrong-password'));
 await assert.rejects(decodeLibrary(encrypted,''));
 assert.deepEqual(await decodeLibrary(lib,''),lib);
});
