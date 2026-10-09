import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { abi, decodeInputData } from "genlayer-js";
const require = createRequire(process.env.PUPPETEER_PACKAGE || "G:/Genlayer/.agents/skills/chrome-devtools/scripts/package.json");
const puppeteer = require("puppeteer");
const url = process.argv[2] || "http://localhost:3109";
const wallet = "0xeb57bc7125fa60d7482CE12058397369AB3581f8";
const other = "0x2da5393d7BBb9A037dc3abB56DbbC5C150fc843f";
const hash = "0x" + "a".repeat(64);
const scenarios = ["happy", "vote-map", "reject-signature", "execution-error", "unchanged-state", "full-sync-error", "wallet-change", "network-change", "pending-double-submit", "refresh-recovery", "refresh-pending", "stale-selection", "rpc-timeout", "canceled", "undetermined", "roles-happy", "mandate-happy", "seal-happy", "assess-happy", "consume-happy", "revoked-publisher", "revoked-executor", "wrong-dao-link", "wrong-mandate-link"];
const report = { kind: "browser-regression-with-mocked-wallet-and-rpc", liveTransactions: false, url, scenarios: [] };
mkdirSync("docs/browser-evidence", { recursive: true });
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"], executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  for (const name of scenarios) {
    const page = await browser.newPage();
    let sent = 0, polls = 0, finalized = false, release = !["wallet-change", "network-change", "pending-double-submit", "refresh-recovery", "refresh-pending"].includes(name);
    let errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.exposeFunction("testSend", () => { sent++; return hash; });
    await page.evaluateOnNewDocument((wallet, hash, name) => {
      const listeners = {};
      window.__audit = { chain: "0xf22f", account: wallet, emit(event, value) { for (const fn of listeners[event] || []) fn(value); } };
      window.ethereum = {
        on(event, fn) { (listeners[event] ||= []).push(fn); },
        removeListener(event, fn) { listeners[event] = (listeners[event] || []).filter(x => x !== fn); },
        async request({ method }) {
          if (["eth_accounts", "eth_requestAccounts"].includes(method)) return [window.__audit.account];
          if (method === "eth_chainId") return window.__audit.chain;
          if (method === "eth_sendTransaction") {
            if (name === "reject-signature") throw Object.assign(new Error("User rejected signature"), { code: 4001 });
            return window.testSend();
          }
          if (method === "wallet_switchEthereumChain") { window.__audit.chain = "0xf22f"; window.__audit.emit("chainChanged", "0xf22f"); return null; }
          throw new Error("Unexpected provider method " + method);
        }
      };
    }, wallet, hash, name);
    await page.setRequestInterception(true);
    await page.on("request", async req => {
      if (!req.url().startsWith("https://studio.genlayer.com/api")) return req.continue();
      if (req.method() === "OPTIONS") return req.respond({ status: 200, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
      const body = JSON.parse(req.postData());
      let result, error;
      if (body.method === "gen_call") {
        const input = decodeInputData(body.params[0].data).callData;
        const method = input.get("method");
        const args = input.get("args") || [];
        if (body.params[0].transaction_hash_variant !== "latest-final") errors.push("Read used non-final state");
        let state = { exists: false };
        if (method === "get_contract_version") state = { name: "MandateLock", schema: "semantic-treasury-execution-firewall-v1" };
        if (method === "get_stats") state = { daos: finalized ? 1 : 0 };
        if (method === "get_role") state = { publisher: name.endsWith("-happy") && (args[1]?.toLowerCase() === wallet.toLowerCase() || finalized), executor: name === "consume-happy" };
        if (method === "get_dao" && finalized && name !== "unchanged-state") state = { exists: true, dao_id: args[0], authority: wallet };
        if (method === "get_dao" && name.endsWith("-happy")) state = { exists: true, dao_id: args[0], authority: wallet };
        if (method === "get_mandate" && (name === "mandate-happy" ? finalized : name.endsWith("-happy")) || method === "get_mandate" && ["revoked-publisher","revoked-executor","wrong-dao-link","wrong-mandate-link"].includes(name)) state = { exists: true, dao_id: name === "wrong-dao-link" ? "another-dao" : "atlas-dao", publisher: wallet, active: true, revision: 1 };
        if (method === "get_action" && ["seal-happy", "assess-happy", "consume-happy","revoked-executor","wrong-mandate-link"].includes(name)) state = { exists: name !== "seal-happy" || finalized, mandate_id: name === "wrong-mandate-link" ? "another-mandate" : "atlas-dao.proposal-42", executor: wallet, status: name === "seal-happy" ? (finalized ? "PENDING_ASSESSMENT" : "") : name === "assess-happy" ? (finalized ? "AUTHORIZED" : "PENDING_ASSESSMENT") : (finalized ? "CONSUMED" : "AUTHORIZED") };
        if (name === "full-sync-error" && finalized && method === "get_stats") error = { code: -32000, message: "Injected full-ledger readback failure" };
        result = Buffer.from(abi.calldata.encode(JSON.stringify(state))).toString("hex");
        if (name === "stale-selection" && method === "get_dao") await new Promise(resolve => setTimeout(resolve, 400));
      } else if (body.method === "eth_getTransactionByHash") {
        polls++;
        finalized = release;
        result = { hash, status: release ? "FINALIZED" : "PENDING", from: wallet, to: "0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a", type: "0x0", nonce: "0x0", gas: "0x30d40", gasPrice: "0x1", value: "0x0", input: "0x", blockHash: null, blockNumber: null, transactionIndex: null,
          consensus_data: { votes: { [wallet]: "agree" }, leader_receipt: [{ execution_result: name === "execution-error" ? "ERROR" : "SUCCESS" }], validators: [{ execution_result: name === "execution-error" ? "ERROR" : "SUCCESS" }] } };
        if(name === "rpc-timeout") error = {code:-32000,message:"Injected RPC timeout"};
        if(name === "canceled") result.status="CANCELED";
        if(name === "undetermined") result.status="UNDETERMINED";
      } else if (body.method === "eth_getTransactionCount") result = "0x0";
      else if (body.method === "eth_estimateGas") result = "0x30d40";
      else if (body.method === "eth_gasPrice") result = "0x1";
      else { error = { code: -32000, message: "Unexpected RPC " + body.method }; errors.push(error.message); }
      await req.respond({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ jsonrpc: "2.0", id: body.id, ...(error ? { error } : { result }) }) });
    });
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => document.querySelector(".wallet")?.textContent.includes("0xeb57"));
    if (name.endsWith("-happy")) {
      const tab={"roles-happy":1,"mandate-happy":2,"seal-happy":3,"assess-happy":4,"consume-happy":5}[name];
      await page.click(`.shell nav button:nth-of-type(${tab+1})`);
      if(name === "roles-happy") await page.$eval('.form label:nth-child(2) input',(input,other)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,other);input.dispatchEvent(new Event("input",{bubbles:true}));},other);
    }
    if(name === "revoked-publisher") await page.click('.shell nav button:nth-of-type(4)');
    if(name === "revoked-executor") await page.click('.shell nav button:nth-of-type(6)');
    await page.click(".locator button");
    if(["revoked-publisher","revoked-executor","wrong-dao-link","wrong-mandate-link"].includes(name)){
      await page.waitForFunction(()=>document.querySelector('.tx')?.textContent.includes('SYNCED')||document.querySelector('.tx')?.textContent.includes('ACTION STOPPED'));
      if(!await page.$eval('.action button',b=>b.disabled))throw new Error('wrong scope/role enabled write');
    } else
    if (name === "stale-selection") {
      await page.$eval(".locator label:nth-child(2) input", input => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, "changed-dao");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await page.waitForFunction(() => document.querySelector(".tx")?.textContent.includes("NEEDS_SYNC"));
      if (!await page.$eval(".action button", x => x.disabled)) throw new Error("stale sync enabled write");
    } else {
      await page.waitForFunction(() => !document.querySelector(".action button").disabled);
      await page.click(".action button");
      if (!release) {
        await page.waitForFunction(() => document.querySelector(".tx")?.textContent.includes("CONSENSUS"));
        if (await page.$eval(".tx", x => x.textContent.includes("VERIFIED"))) throw new Error("pending marked verified");
        if (!await page.$eval(".locator input", x => x.matches(":disabled"))) throw new Error("pending ID editable");
        await page.click(".action button");
        if (sent !== 1) throw new Error("duplicate write submitted");
        if (name === "wallet-change") await page.evaluate(other => { window.__audit.account = other; window.__audit.emit("accountsChanged", [other]); }, other);
        if (name === "network-change") await page.evaluate(() => { window.__audit.chain = "0x1"; window.__audit.emit("chainChanged", "0x1"); });
        if(name === "refresh-pending"){
          await page.reload({waitUntil:'networkidle0'});
          await page.$eval('.locator label:nth-child(2) input:nth-child(3)',input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'unused-changed-action');input.dispatchEvent(new Event('input',{bubbles:true}))});
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          await page.click('.locator button');
          await page.waitForFunction(()=>document.querySelector('.tx')?.textContent.includes('Previous transaction is still unresolved'));
          if(!await page.$eval('.action button',b=>b.disabled))throw new Error('pending refresh re-enabled write');
          release=true;finalized=true;await page.click('.locator button');
          await page.waitForFunction(()=>document.querySelector('.tx')?.textContent.includes('SYNCED'));
        }
        release = true;
        if (name === "refresh-recovery") {
          finalized=true;
          await page.reload({ waitUntil: "networkidle0" });
          if (!await page.$(".tx a")) throw new Error("hash lost on reload");
          await page.click(".locator button");
          await page.waitForFunction(() => document.querySelector(".tx")?.textContent.includes("SYNCED"));
          if(!await page.$eval('.ledger',x=>x.textContent.includes('0xeb57'))) throw new Error("reload did not read finalized DAO owner");
        }
      }
      if (!["refresh-recovery","refresh-pending"].includes(name)) {
        const success = ["happy", "vote-map", "pending-double-submit"].includes(name) || name.endsWith("-happy");
        await page.waitForFunction(success => document.querySelector(".tx")?.textContent.includes(success ? "VERIFIED" : "ACTION STOPPED"), { timeout: 20000 }, success);
        if (!success && await page.$eval(".tx", x => x.textContent.includes("VERIFIED"))) throw new Error("failure marked verified");
      }
    }
    const status = await page.$eval(".tx", x => x.textContent);
    if (errors.length) throw new Error(errors.join("; "));
    const screenshot = `docs/browser-evidence/${name}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    report.scenarios.push({ name, pass: true, walletSubmissions: sent, receiptPolls: polls, status, screenshot });
    writeFileSync("docs/browser-evidence/report.json", JSON.stringify(report, null, 2));
    console.log(`PASS ${name}: ${status}`);
    await page.close();
  }
} catch(error) {
  report.error = error.message;
  writeFileSync("docs/browser-evidence/report.json", JSON.stringify(report, null, 2));
  throw error;
} finally { await browser.close(); }
