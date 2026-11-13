const DB_NAME="smart-site-local", DB_VERSION=1;
const STORES=["meta","projects","issues","daily_reports"];
let dbPromise;
function openDatabase(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"key"});for(const n of ["projects","issues","daily_reports"]){if(!d.objectStoreNames.contains(n)){const s=d.createObjectStore(n,{keyPath:"id"});s.createIndex("created_at","created_at");}}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
const db=()=>dbPromise||=openDatabase();
function result(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function getAll(name){const d=await db(),tx=d.transaction(name,"readonly");return result(tx.objectStore(name).getAll());}
export async function put(name,record){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(name,"readwrite");tx.objectStore(name).put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function getMeta(key){const d=await db(),tx=d.transaction("meta","readonly");return result(tx.objectStore("meta").get(key));}
export async function setMeta(key,value){return put("meta",{key,value});}
export async function exportAll(){const out={format:"SMART_SITE_LOCAL_BACKUP",version:1,exported_at:new Date().toISOString()};for(const n of STORES)out[n]=await getAll(n);return out;}
export async function initializeLocalDatabase(){await db();if(navigator.storage?.persist){try{await navigator.storage.persist();}catch(_){}}}
