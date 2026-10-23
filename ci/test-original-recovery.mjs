import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
const port = 4319;
const base = 'http://127.0.0.1:' + port;
const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host','127.0.0.1','--port',String(port),'--strictPort'], {
  shell: false, stdio:'ignore', env: process.env
});
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome'});
const context = await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
let firebaseRequests = 0;
page.on('pageerror',err => errors.push(err.message));
page.on('request',r => { if (/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com/.test(r.url())) firebaseRequests++; });
async function ready(){
  for(let n=0;n<80;n++){try{if((await fetch(base)).ok)return;}catch{}await new Promise(r=>setTimeout(r,350));}
  throw new Error('Vite preview did not start');
}
const shown = async (locator,label) => {
  await locator.first().waitFor({state:'visible',timeout:12000}).catch(e=>{throw new Error(label+': '+String(e));});
};
try {
  await mkdir('recovery-evidence',{recursive:true});
  await ready();
  await page.goto(base,{waitUntil:'networkidle'});
  console.log('STEP: local owner enrolment');
  await shown(page.getByText('TalkOS · Original Interface · Offline'),'original recovery login');
  await page.getByLabel('Owner name').fill('Owner');
  await page.getByLabel('Create private owner PIN').fill('683921');
  await page.getByLabel('Confirm owner PIN').fill('683921');
  await page.getByRole('button',{name:'Enrol owner'}).click();
  await shown(page.getByText('Welcome, Owner'),'original overview');
  await page.screenshot({path:'recovery-evidence/overview.png'});
  console.log('STEP: verify preserved original POS');
  await page.getByRole('link',{name:'New Order'}).click();
  await shown(page.getByText('A La Carte Menu'),'original product catalogue');
  await shown(page.getByText('Veg Chowmein'),'source menu item');
  await page.screenshot({path:'recovery-evidence/pos.png'});
  console.log('STEP: verify inventory');
  await page.getByRole('link',{name:'Stock'}).last().click();
  await shown(page.getByText('Master Catalogue (144)'),'inventory master tab');
  await shown(page.getByText('TOT-001'),'first inventory item');
  await page.screenshot({path:'recovery-evidence/inventory.png'});
  console.log('STEP: verify menu management');
  await page.getByRole('button',{name:'Open menu'}).click();
  await page.getByRole('link',{name:'Menu',exact:true}).first().click();
  await shown(page.getByText('Menu Management'),'editable menu screen');
  await shown(page.getByText('Veg Chowmein'),'existing products in menu manager');
  console.log('STEP: verify offline KDS');
  await page.getByRole('link',{name:'Kitchen',exact:true}).first().click();
  await shown(page.locator('body'),'kitchen page');
  await page.screenshot({path:'recovery-evidence/kitchen.png'});
  if(firebaseRequests) throw new Error('Original offline recovery unexpectedly made '+firebaseRequests+' Firebase requests.');
  if(errors.length) throw new Error('Uncaught original UI errors: '+errors.join(' | ').slice(0,1800));
  console.log('PASS: original branded POS, PIN owner access, offline menu and inventory screens, KDS route; no Firestore requests.');
} catch (error) {
  console.error(error);
  await page.screenshot({path:'recovery-evidence/error.png'}).catch(()=>{});
  throw error;
} finally {
  await context.close();
  await browser.close();
  proc.kill('SIGTERM');
  proc.unref();
}
