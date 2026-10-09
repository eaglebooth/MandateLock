import { createRequire } from "node:module";
import { createInterface } from "node:readline";
import { mkdirSync, writeFileSync } from "node:fs";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { waitForFinalized } from "../lib/transaction-result.mjs";
const puppeteer=createRequire(process.env.PUPPETEER_PACKAGE||"G:/Genlayer/.agents/skills/chrome-devtools/scripts/package.json")("puppeteer");
const input=createInterface({input:process.stdin,terminal:false});const keys=[];
await new Promise((resolve,reject)=>{input.on("line",line=>{if(line.trim())keys.push(line.trim());if(keys.length===2){input.close();resolve()}});input.on("close",()=>{if(keys.length<2)reject(new Error("Two wallet keys required on stdin"))})});
const wallets=keys.map(key=>createAccount(key.startsWith("0x")?key:`0x${key}`));
const client=createClient({chain:studionet});
const run=Date.now().toString();const dao=process.argv[3]||`ui-audit-${run}`;const address="0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a";
const report={kind:"live-browser-wallet-signing-and-studionet-readback",url:process.argv[2]||"http://localhost:3109",contract:address,dao,actors:wallets.map(w=>w.address),transactions:[],assertions:[]};
mkdirSync("docs/browser-live-evidence",{recursive:true});const output=`docs/browser-live-evidence/${run}.json`;const save=()=>writeFileSync(output,JSON.stringify(report,null,2));
const read=async(method,args)=>JSON.parse(await client.readContract({address,functionName:method,args,transactionHashVariant:"latest-final"}));
const browser=await puppeteer.launch({headless:true,executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",args:["--no-sandbox"]});
let page;
try{
page=await browser.newPage();let actor=0;
page.on('requestfailed',request=>console.log(`Network failure: ${request.failure()?.errorText} ${request.url()}`));
page.on('response',response=>{if(response.url().includes('studio.genlayer.com')&&response.status()>=400)console.log(`RPC HTTP ${response.status()}`)});
await page.exposeFunction("signLive",async request=>{
 const account=wallets[actor];
 if(request.chainId!=="0xf22f"||request.from.toLowerCase()!==account.address.toLowerCase())throw new Error("Unexpected signing chain or actor");
 const signed=await account.signTransaction({chainId:61999,type:"legacy",to:request.to,data:request.data,value:BigInt(request.value||0),gas:BigInt(request.gas),gasPrice:BigInt(request.gasPrice),nonce:Number(BigInt(request.nonce))});
 return client.sendRawTransaction({serializedTransaction:signed});
});
await page.evaluateOnNewDocument(wallet=>{const listeners={};window.__live={account:wallet,emit(e,v){for(const fn of listeners[e]||[])fn(v)}};window.ethereum={on(e,fn){(listeners[e]||=[]).push(fn)},removeListener(e,fn){listeners[e]=(listeners[e]||[]).filter(x=>x!==fn)},async request({method,params}){if(method==="eth_chainId")return"0xf22f";if(["eth_accounts","eth_requestAccounts"].includes(method))return[window.__live.account];if(method==="eth_sendTransaction")return window.signLive(params[0]);throw new Error("Unexpected wallet method "+method)}}},wallets[0].address);
await page.goto(report.url,{waitUntil:"networkidle0"});
const fill=async(selector,value)=>page.$eval(selector,(input,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}))},value);
await fill('.locator label:nth-child(2) input',dao);
const sync=async()=>{
 for(let attempt=0;attempt<4;attempt++){
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.click('.locator button');
 await page.waitForFunction(()=>document.querySelector('.tx')?.textContent.includes('SYNCED')||document.querySelector('.tx')?.textContent.includes('ACTION STOPPED'),{timeout:120000});
 const ui=await page.$eval('.tx',x=>x.textContent);if(ui.includes('SYNCED'))return;
 if(!/fetch|RPC|timeout/i.test(ui)||attempt===3)throw new Error(ui);
 report.assertions.push({label:'Transient RPC read failure kept UI stopped; retrying read only',pass:!ui.includes('VERIFIED'),ui});save();
 }
};
await sync();
const write=async(label,method,args,view,viewArgs)=>{
 const before=await read(view,viewArgs);
 await page.click('.action button');
 await page.waitForFunction(()=>document.querySelector('.tx a')?.href,{timeout:30000});
 const hash=await page.$eval('.tx a',a=>a.href.split('/').pop());console.log(`${label}: ${hash}`);
 await page.waitForFunction(()=>document.querySelector('.tx')?.textContent.includes('VERIFIED')||document.querySelector('.tx')?.textContent.includes('ACTION STOPPED'),{timeout:900000});
 const status=await page.$eval('.tx',x=>x.textContent);
 const tx=await waitForFinalized(()=>client.getTransaction({hash}));
 const after=await read(view,viewArgs);const pass=status.includes('VERIFIED')&&JSON.stringify(before)!==JSON.stringify(after);
 report.transactions.push({label,caller:wallets[actor].address,method,args,hash,status:tx.statusName,ui:status,before,after});report.assertions.push({label,pass});save();
 if(!pass)throw new Error(status);
 await page.screenshot({path:`docs/browser-live-evidence/${run}-${method}.png`,fullPage:true});
};
if(!(await read('get_dao',[dao])).exists)await write('Browser creates DAO','create_dao',[dao],'get_dao',[dao]);
await page.click('.shell nav button:nth-of-type(2)');
await fill('.form label:nth-child(2) input',wallets[0].address);await sync();
if(!(await read('get_role',[dao,wallets[0].address])).publisher)await write('Browser registers publisher','set_publisher',[dao,wallets[0].address,true],'get_role',[dao,wallets[0].address]);
await fill('.form label:nth-child(1) input','executor');await fill('.form label:nth-child(3) input',wallets[1].address);await sync();
await write('Browser registers independent executor','set_executor',[dao,wallets[1].address,true],'get_role',[dao,wallets[1].address]);
actor=1;await page.evaluate(wallet=>{window.__live.account=wallet;window.__live.emit('accountsChanged',[wallet])},wallets[1].address);await sync();
const role=await read('get_role',[dao,wallets[1].address]);
report.assertions.push({label:'Second wallet role readback and UI cannot assign roles',pass:role.executor===true&&await page.$eval('.action button',b=>b.disabled)});
report.final={dao:await read('get_dao',[dao]),executor:role};save();
await page.reload({waitUntil:'networkidle0'});await sync();
const recoveredHash=await page.$eval('.tx a',a=>a.href.split('/').pop());
report.assertions.push({label:'Production reload retains exact transaction link and reconciles without resubmission',pass:recoveredHash===report.transactions.at(-1).hash});save();
if(report.assertions.some(a=>!a.pass))throw new Error('Live assertion failed');
console.log(`Live evidence: ${output}`);
}catch(error){report.error=error.message;if(page){report.failureUi=await page.$eval('.tx',x=>x.textContent).catch(()=>"");await page.screenshot({path:`docs/browser-live-evidence/${run}-failure.png`,fullPage:true}).catch(()=>{})}save();throw error}finally{await browser.close()}
