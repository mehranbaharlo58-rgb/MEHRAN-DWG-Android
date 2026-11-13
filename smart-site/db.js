import { Capacitor } from "@capacitor/core";
const DB_NAME="smart-site-local", DB_VERSION=1;
const STORES=["meta","projects","issues","daily_reports"];
let webDbPromise, nativeDbPromise;
function openWebDatabase(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta",{keyPath:"key"});for(const n of ["projects","issues","daily_reports"]){if(!d.objectStoreNames.contains(n)){const s=d.createObjectStore(n,{keyPath:"id"});s.createIndex("created_at","created_at");}}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
const webDb=()=>webDbPromise||=openWebDatabase();
async function nativeDb(){
 if(!nativeDbPromise)nativeDbPromise=(async()=>{
  const {CapacitorSQLite,SQLiteConnection}=await import("@capacitor-community/sqlite");
  const connection=new SQLiteConnection(CapacitorSQLite);
  const name="smart_site";
  const check=await connection.checkConnectionsConsistency();
  const exists=await connection.isConnection(name,false);
  const database=exists.result?await connection.retrieveConnection(name,false):await connection.createConnection(name,false,"no-encryption",1,false);
  await database.open();
  await database.execute("CREATE TABLE IF NOT EXISTS records (store TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(store,id)); CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
  return database;
 })();
 return nativeDbPromise;
}
function req(r){return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function getAll(name){
 if(Capacitor.isNativePlatform()){const d=await nativeDb(),r=await d.query("SELECT payload FROM records WHERE store = ?",[name]);return (r.values||[]).map(x=>JSON.parse(x.payload));}
 const d=await webDb(),tx=d.transaction(name,"readonly");return req(tx.objectStore(name).getAll());
}
export async function put(name,record){
 if(Capacitor.isNativePlatform()){const d=await nativeDb();await d.run("INSERT OR REPLACE INTO records(store,id,payload) VALUES(?,?,?)",[name,record.id,JSON.stringify(record)]);return record.id;}
 const d=await webDb();return new Promise((resolve,reject)=>{const tx=d.transaction(name,"readwrite");tx.objectStore(name).put(record);tx.oncomplete=()=>resolve(record.id);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export async function getMeta(key){
 if(Capacitor.isNativePlatform()){const d=await nativeDb(),r=await d.query("SELECT value FROM metadata WHERE key = ?",[key]);return r.values?.length?{key,value:JSON.parse(r.values[0].value)}:undefined;}
 const d=await webDb(),tx=d.transaction("meta","readonly");return req(tx.objectStore("meta").get(key));
}
export async function setMeta(key,value){
 if(Capacitor.isNativePlatform()){const d=await nativeDb();await d.run("INSERT OR REPLACE INTO metadata(key,value) VALUES(?,?)",[key,JSON.stringify(value)]);return;}
 return put("meta",{key,value});
}
export async function exportAll(){
 const out={format:"SMART_SITE_LOCAL_BACKUP",version:1,exported_at:new Date().toISOString()};
 for(const n of STORES)out[n]=await getAll(n);
 return out;
}
export async function initializeLocalDatabase(){
 if(Capacitor.isNativePlatform()){await nativeDb();return;}
 await webDb();if(navigator.storage?.persist){try{await navigator.storage.persist();}catch(_){}}
}
