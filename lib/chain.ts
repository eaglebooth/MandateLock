"use client";
import { createClient } from "genlayer-js";
import { chain } from "./network";
export type Encodable = null|boolean|number|bigint|string|Uint8Array|Encodable[]|Map<string,Encodable>|{[key:string]:Encodable};
type Provider={request:(input:{method:string;params?:unknown[]})=>Promise<unknown>;on?:(e:string,l:(...a:unknown[])=>void)=>void;removeListener?:(e:string,l:(...a:unknown[])=>void)=>void};
declare global { interface Window { ethereum?: Provider } }
type Receipt={vote?:string;execution_result?:string;result?:string};
type Tx={statusName?:string;resultName?:string;txExecutionResultName?:string;consensus_data?:{leader_receipt?:Receipt[];validators?:Receipt[];votes?:Receipt[]}};
type Runtime={readContract:(i:{address:`0x${string}`;functionName:string;args:Encodable[]})=>Promise<Encodable>;writeContract:(i:{address:`0x${string}`;functionName:string;args:Encodable[];value:bigint})=>Promise<string|{txId:string}>;waitForTransactionReceipt:(i:{hash:`0x${string}`;status:"FINALIZED";interval:number;retries:number})=>Promise<Tx>;getTransaction:(i:{hash:`0x${string}`})=>Promise<Tx>};
export const validAddress=(v:string)=>/^0x[0-9a-fA-F]{40}$/.test(v);
const studioChainId=`0x${chain.id.toString(16)}`;
const studioRpc=chain.rpcUrls.default.http[0];
function errorCode(error:unknown){return typeof error==="object"&&error!==null&&"code" in error?Number((error as {code:unknown}).code):0}
export async function isStudioNetwork(){if(!window.ethereum)return false;const id=String(await window.ethereum.request({method:"eth_chainId"})).toLowerCase();return id===studioChainId.toLowerCase()}
export async function ensureStudioNetwork(){
 if(!window.ethereum)throw new Error("MetaMask is required");
 if(await isStudioNetwork())return;
 try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:studioChainId}]})}
 catch(error){
  if(errorCode(error)!==4902)throw new Error(`Switch MetaMask to GenLayer StudioNet (chain ${chain.id})`);
  await window.ethereum.request({method:"wallet_addEthereumChain",params:[{chainId:studioChainId,chainName:chain.name,nativeCurrency:chain.nativeCurrency,rpcUrls:[studioRpc],blockExplorerUrls:[chain.blockExplorers?.default.url||"https://explorer-studio.genlayer.com"]}]});
 }
 if(!await isStudioNetwork())throw new Error(`Wrong network: select GenLayer StudioNet (chain ${chain.id})`);
}
export async function connectWallet(){if(!window.ethereum)throw new Error("MetaMask is required");const accounts=await window.ethereum.request({method:"eth_requestAccounts"}) as string[];await ensureStudioNetwork();return accounts[0]||""}
export async function currentAccount(){if(!window.ethereum)return "";const a=await window.ethereum.request({method:"eth_accounts"}) as string[];return a[0]||""}
export async function readJson(address:string,method:string,args:Encodable[]=[]){if(!validAddress(address))throw new Error("Enter a valid deployed contract address");const c=createClient({chain}) as unknown as Runtime;return JSON.parse(String(await c.readContract({address:address as `0x${string}`,functionName:method,args}))) as Record<string,unknown>}
export async function writeContract(address:string,account:string,method:string,args:Encodable[],onStatus:(s:string,h?:string)=>void){if(!window.ethereum||!validAddress(address)||!validAddress(account))throw new Error("Connect a valid wallet and contract");await ensureStudioNetwork();const c=createClient({chain,provider:window.ethereum,account:account as `0x${string}`}) as unknown as Runtime;onStatus("SIGNATURE");const raw=await c.writeContract({address:address as `0x${string}`,functionName:method,args,value:BigInt(0)});const hash=typeof raw==="string"?raw:raw?.txId;if(!/^0x[0-9a-fA-F]{64}$/.test(hash))throw new Error("INVALID_TRANSACTION_ID");onStatus("CONSENSUS",hash);await c.waitForTransactionReceipt({hash:hash as `0x${string}`,status:"FINALIZED",interval:2500,retries:360});const tx=await c.getTransaction({hash:hash as `0x${string}`});const receipts=[...(tx.consensus_data?.leader_receipt||[]),...(tx.consensus_data?.validators||[]),...(tx.consensus_data?.votes||[])];const execution=String(tx.txExecutionResultName||"").toUpperCase();const error=execution.includes("ERROR")||receipts.some(x=>String(x.execution_result||"").toUpperCase().includes("ERROR"));if(String(tx.statusName||"").toUpperCase()!=="FINALIZED"||error)throw new Error("Finalized transaction did not execute successfully");onStatus("READBACK",hash);return hash}
export function watchWallet(listener:(a:string)=>void){if(!window.ethereum?.on)return()=>{};const l=(...x:unknown[])=>listener(((x[0]||[]) as string[])[0]||"");window.ethereum.on("accountsChanged",l);return()=>window.ethereum?.removeListener?.("accountsChanged",l)}
export function watchNetwork(listener:(valid:boolean)=>void){if(!window.ethereum?.on)return()=>{};const l=(...x:unknown[])=>listener(String(x[0]||"").toLowerCase()===studioChainId.toLowerCase());window.ethereum.on("chainChanged",l);return()=>window.ethereum?.removeListener?.("chainChanged",l)}

