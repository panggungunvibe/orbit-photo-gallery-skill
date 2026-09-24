import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const url='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const expected='fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
const directory=new URL('../public/models/',import.meta.url),target=new URL('hand_landmarker.task',directory);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try {if(hash(await readFile(target))===expected){console.log('Hand model already verified.');process.exit(0);}} catch(error){if(error.code!=='ENOENT')throw error;}
console.log('Downloading the version 1 Google MediaPipe hand model (see THIRD_PARTY_NOTICES.md).');
const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
if(!response.ok)throw Error(`Model download failed: HTTP ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());
if(hash(bytes)!==expected)throw Error('Model checksum mismatch; no file was installed.');
await mkdir(directory,{recursive:true});await writeFile(target,bytes);console.log('Hand model installed and checksum verified.');
