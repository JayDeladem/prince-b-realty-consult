const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const prefix='https://jaydeladem.github.io/prince-b-realty-consult/';
const api='https://prince-b-wcm-backend.onrender.com/api/v1';
const clone=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const properties=JSON.parse(fs.readFileSync(path.join(root,'listings.json'),'utf8')).map((item,index)=>({...item,slug:item.id,featured:true,publication_status:'published',sort_order:index,image_alts:[item.title],updated_at:'2026-11-25T12:00:00Z'}));
 const gallery=['a11.jpeg','a10.jpeg','property8.avif','office.avif','a12.jpeg','a1.jpeg'].map((image,index)=>({id:'gallery-'+index,title:'Gallery '+index,caption:'A project',alt:'Project photo',image_url:prefix+'images/'+image,sort_order:index,publication_status:'published',updated_at:'2026-11-25T12:00:00Z'}));
 const faqs=JSON.parse(fs.readFileSync(path.join(root,'faqs.json'),'utf8')).map((item,index)=>({...item,featured:index<6,publication_status:'published',sort_order:index,updated_at:'2026-11-25T12:00:00Z'}));
 return {properties,gallery,faqs,user:null,token:'anonymous-csrf',blocked:false,calls:[],sequence:0};
}
async function wait(check){for(let i=0;i<200;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,5));}throw new Error('UI state did not settle');}
async function page(file,state,query=''){
 const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:prefix+file+query,runScripts:'outside-only'}),w=dom.window,redirects=[];
 if(state.welcomed)w.localStorage.setItem('princeb-prinbot-welcomed','1');
 w.AbortSignal=AbortSignal;w.HTMLElement.prototype.scrollIntoView=function(){};w.requestAnimationFrame=fn=>{fn();return 1;};w.confirm=()=>true;
 w.fetch=async(url,options={})=>{
  state.calls.push({url:String(url),options});
  const answer=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>clone(body)});
  if(String(url)==='https://property-chatbot-89ed.onrender.com/chat')return answer(200,{reply:'PrinBot still connected',listings:[],demo:false,moderation:'clean'});
  assert(String(url).startsWith(api+'/'),'Unexpected API URL: '+url);assert(!String(url).includes('/api/v1/api/v1'));
  const endpoint=String(url).slice(api.length),route=endpoint.split('?')[0],method=options.method||'GET';
  if(route.startsWith('/auth/')||route.startsWith('/admin/'))assert.equal(options.credentials,'include');
  if(route==='/auth/session'){
   if(state.blocked)state.token='blocked-'+(++state.sequence);
   return answer(200,{user:state.blocked?null:state.user,csrfToken:state.token});
  }
  const body=typeof options.body==='string'?JSON.parse(options.body):null;
  if(method!=='GET'&&options.headers?.['X-CSRF-Token']!==state.token)return answer(403,{error:'CSRF token missing'});
  if(route==='/auth/sign-in'){
   if(body.email!=='staff@example.test'||body.password!=='test-only-password')return answer(401,{error:'Email or password is incorrect.'});
   state.user={id:'staff-1',email:body.email,role:'super_admin'};state.token='signed-in-csrf';return answer(200,{user:state.user,csrfToken:state.token});
  }
  if(route==='/auth/sign-out'){state.user=null;return answer(204,null);}
  if(route.startsWith('/admin/')&&!state.user)return answer(401,{error:'Sign in to manage content.'});
  const match=/^\/(?:admin\/)?(properties|gallery|faqs)(?:\/([^/]+))?$/.exec(route);
  if(match){
   const kind=match[1],id=decodeURIComponent(match[2]||''),admin=route.startsWith('/admin/'),records=state[kind];
   if(method==='GET'){
    if(id){const record=records.find(item=>(admin?item.id:item.slug)===id&&(admin||item.publication_status==='published'));return answer(record?200:404,record||{error:'Content not found'});}
    return answer(200,records.filter(item=>admin||item.publication_status==='published').sort((a,b)=>a.sort_order-b.sort_order));
   }
   if(method==='POST'){
    const record={...body,id:'created-'+(++state.sequence),updated_at:'2026-11-25T13:00:00Z'};
    if(kind==='properties')record.url=prefix+'property-details.html?id='+record.slug;
    records.push(record);return answer(201,record);
   }
   const index=records.findIndex(item=>item.id===id);if(index<0)return answer(404,{error:'Content not found'});
   if(method==='PATCH'){Object.assign(records[index],body);return answer(200,records[index]);}
   if(method==='DELETE'){records.splice(index,1);return answer(204,null);}
  }
  if(route==='/admin/users')return answer(200,[state.user]);
  if(route==='/admin/logs')return answer(200,{items:[],total:0,page:1,pageSize:50});
  return answer(404,{error:'Not found'});
 };
 for(const script of Array.from(w.document.querySelectorAll('script[src]'))){
  const url=new URL(script.getAttribute('src'),w.location.href);assert(url.href.startsWith(prefix));
  const relative=url.pathname.slice('/prince-b-realty-consult/'.length);
  if(relative==='admin/admin.js'||relative==='admin/login.js')w.WCMAdmin.redirect=(route,replace)=>redirects.push({url:w.WCMAdmin.href(route),replace});
  await vm.runInContext(fs.readFileSync(path.join(root,relative),'utf8'),dom.getInternalVMContext());
 }
 await wait(()=>Array.from(w.document.querySelectorAll('[data-faqs]')).every(mount=>mount.getAttribute('aria-busy')==='false'));
 return {dom,w,doc:w.document,redirects};
}
function submit(p,form,button=form.querySelector('button[type=submit]')){form.dispatchEvent(new p.w.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:button}));}

test('launcher welcomes first-time visitors, supports dismissal and stays quiet on return visits',async()=>{
 const p=await page('index.html',fixture());
 assert.equal(p.doc.querySelector('.chat-launcher-welcome').hidden,false);
 assert.equal(p.w.localStorage.getItem('princeb-prinbot-welcomed'),'1');
 p.doc.querySelector('.chat-welcome-open').click();
 assert.equal(p.doc.querySelector('.property-chat').hidden,false);
 assert.equal(p.doc.querySelectorAll('.chat-portraits img').length,3);
 for(const image of p.doc.querySelectorAll('.chat-portraits img')){
  assert.equal(image.alt,'');
  assert(fs.existsSync(path.join(root,new URL(image.src).pathname.slice('/prince-b-realty-consult/'.length))));
 }
 const pause=p.doc.querySelector('.chat-slideshow-toggle');pause.click();
 assert.equal(pause.getAttribute('aria-pressed'),'true');
 assert(p.doc.querySelector('.chat-header').classList.contains('chat-slideshow-paused'));
 pause.click();assert.equal(pause.getAttribute('aria-pressed'),'false');
 assert.equal(p.doc.querySelector('.chat-launcher-welcome').hidden,true);
 p.doc.querySelector('.chat-close').click();
 assert.equal(p.doc.querySelector('.property-chat').hidden,true);
 assert.equal(p.doc.activeElement,p.doc.querySelector('.chat-launcher'));
 p.dom.window.close();
 const returning=await page('properties.html',{...fixture(),welcomed:true});
 await wait(()=>returning.doc.querySelectorAll('.property-item').length===3);
 assert.equal(returning.doc.querySelector('.chat-launcher-welcome').hidden,true);
 assert.equal(returning.doc.querySelector('.chat-starter'),null);
 returning.dom.window.close();
 const dismiss=await page('index.html',fixture());
 dismiss.doc.querySelector('.chat-welcome-close').click();
 assert.equal(dismiss.doc.querySelector('.chat-launcher-welcome').hidden,true);
 assert.equal(dismiss.doc.querySelector('.property-chat').hidden,true);
 dismiss.dom.window.close();
});
test('admin HTML and every local asset resolve under the GitHub Pages project path',()=>{
 for(const file of ['admin/index.html','admin/login.html']){
  const dom=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'),{url:prefix+file});
  for(const node of dom.window.document.querySelectorAll('script[src],link[href],img[src]')){
   const value=node.getAttribute('src')||node.getAttribute('href'),url=new URL(value,prefix+file);
   if(url.origin!==new URL(prefix).origin)continue;
   assert(url.href.startsWith(prefix),value);assert(fs.existsSync(path.join(root,url.pathname.slice('/prince-b-realty-consult/'.length))),value);
  }dom.window.close();
 }
 assert(!/^\s*-\s*admin\s*$/m.test(fs.readFileSync(path.join(root,'_config.yml'),'utf8')));
});
test('public properties, filters, details, gallery, FAQ preview and PrinBot keep their contracts',async()=>{
 const state=fixture(),p=await page('properties.html',state);await wait(()=>p.doc.querySelectorAll('.property-item').length===3);
 const search=p.doc.querySelector('#property-search');search.value='East Legon';search.dispatchEvent(new p.w.Event('input'));assert.equal(Array.from(p.doc.querySelectorAll('.property-item')).filter(card=>card.style.display!=='none').length,1);
 assert(p.doc.querySelector('.property-info a').href.startsWith(prefix+'property-details.html?id='));
 p.doc.querySelector('.chat-launcher').click();assert.equal(p.doc.querySelector('.chat-starter'),null);p.doc.querySelector('.chat-composer input').value='Show me houses for sale';submit(p,p.doc.querySelector('.chat-form'));await wait(()=>p.doc.querySelector('.chat-messages').textContent.includes('PrinBot still connected'));p.dom.window.close();
 const detail=await page('property-details.html',state,'?id=house-1');await wait(()=>!detail.doc.querySelector('#property-details-content').hidden);assert.equal(detail.doc.querySelector('#detail-price').textContent,'GHS 850,000');detail.dom.window.close();
 const gallery=await page('gallery.html',state);await wait(()=>gallery.doc.querySelectorAll('.gallery-card').length===6);assert(gallery.doc.querySelector('.gallery-card img').src.startsWith(prefix+'images/'));gallery.dom.window.close();
 const home=await page('index.html',state);assert.equal(home.doc.querySelectorAll('[data-faqs=featured] .faq-item').length,5);home.dom.window.close();
 const faq=await page('faq.html',state,'#faq-24');assert(faq.doc.getElementById('faq-24').open);faq.dom.window.close();
 assert(state.calls.filter(c=>!c.url.includes('/chat')).every(c=>c.options.credentials==='omit'));
});
test('static query routes, editor links and safe redirects survive refresh under the project subpath',async()=>{
 const state=fixture();state.user={id:'staff-1',email:'staff@example.test',role:'super_admin'};
 const p=await page('admin/index.html',state);
 for(const module of ['properties','gallery','faqs','users','logs']){
  const url=p.w.WCMAdmin.href('/admin/'+module+'?edit=a');assert.equal(url,prefix+'admin/index.html?view='+module+'&edit=a');
  assert.equal(p.w.WCMAdmin.logicalRoute(url),'/admin/'+module+'?edit=a');
 }
 assert.equal(p.w.WCMAdmin.href('https://untrusted.example/'),prefix+'admin/index.html');
 assert.equal(p.w.WCMAdmin.href('/admin/login?expired=1'),prefix+'admin/login.html?expired=1');
 p.doc.querySelector('nav a[href="./index.html?view=properties"]').click();await wait(()=>p.doc.querySelectorAll('.property-table tbody tr').length===3);assert.equal(p.w.location.search,'?view=properties');
 const refreshed=await page('admin/index.html',state,'?view=properties');assert.equal(refreshed.doc.querySelectorAll('.property-table tbody tr').length,3);refreshed.dom.window.close();p.dom.window.close();
});
test('sign-in verifies cookie continuity; authenticated refresh and sign-out use credentialed API requests',async()=>{
 const state=fixture(),login=await page('admin/login.html',state);const form=login.doc.querySelector('#sign-in-form');
 form.elements.email.value='staff@example.test';form.elements.password.value='incorrect';submit(login,form);await wait(()=>login.doc.querySelector('#feedback').textContent.includes('incorrect'));
 form.elements.password.value='test-only-password';submit(login,form);await wait(()=>login.redirects.length>0);assert.equal(login.redirects[0].url,prefix+'admin/index.html');login.dom.window.close();
 const p=await page('admin/index.html',state);assert.equal(p.doc.querySelectorAll('.stat-card').length,3);
 p.doc.querySelector('#sign-out').click();await wait(()=>p.redirects.length>0);assert.equal(p.redirects[0].url,prefix+'admin/login.html');assert.equal(state.user,null);p.dom.window.close();
 assert(state.calls.some(c=>c.url===api+'/auth/sign-in'&&c.options.headers['X-CSRF-Token']==='anonymous-csrf'));
});
test('blocked third-party cookies and expired sessions give clear failures instead of false sign-ins',async()=>{
 const state=fixture();state.blocked=true;const login=await page('admin/login.html',state);assert(login.doc.querySelector('#feedback').textContent.includes('blocking the sign-in session cookie'));assert.equal(login.redirects.length,0);login.dom.window.close();
 const anonymous=await page('admin/index.html',fixture(),'?view=gallery');assert(anonymous.redirects[0].url.startsWith(prefix+'admin/login.html?next='));anonymous.dom.window.close();
});
test('property/gallery edits and publication flow work through static routes and refresh public content',async()=>{
 for(const kind of ['properties','gallery']){
  const state=fixture();state.user={id:'staff-1',email:'staff@example.test',role:'super_admin'};
  const p=await page('admin/index.html',state,'?view='+kind);p.doc.querySelector('.page-heading a').click();await wait(()=>!p.doc.querySelector('#editor').hidden);
  const form=p.doc.querySelector('#content-form'),values=kind==='properties'?{title:'Integration property',slug:'integration-property',location:'Tema',display_location:'Tema, Ghana',status:'active',description:'A confirmed description',images:prefix+'images/hse2.avif'}:{title:'Integration gallery',image_url:prefix+'images/a11.jpeg',alt:'Accessible description'};
  for(const [key,value]of Object.entries(values))form.elements.namedItem(key).value=value;
  submit(p,form);await wait(()=>p.doc.querySelector('#editor').hidden&&p.doc.querySelector('#view').getAttribute('aria-busy')==='false');
  const created=state[kind].find(item=>item.title===values.title);assert.equal(created.publication_status,'draft');
  p.doc.querySelector('[data-item-id="'+created.id+'"] a').click();await wait(()=>!p.doc.querySelector('#editor').hidden);submit(p,form,p.doc.querySelector('#publish-item'));
  await wait(()=>p.doc.querySelector('#editor').hidden&&p.doc.querySelector('#view').getAttribute('aria-busy')==='false');assert.equal(created.publication_status,'published');
  const publicPage=await page(kind==='properties'?'properties.html':'gallery.html',state);await wait(()=>publicPage.doc.body.textContent.includes(values.title));publicPage.dom.window.close();
  p.doc.querySelector('[data-item-id="'+created.id+'"] a').click();await wait(()=>!p.doc.querySelector('#editor').hidden);form.elements.title.value='Edited '+values.title;submit(p,form);
  await wait(()=>p.doc.querySelector('#editor').hidden&&p.doc.querySelector('#view').getAttribute('aria-busy')==='false');assert(created.title.startsWith('Edited '));
  p.doc.querySelector('[data-item-id="'+created.id+'"] a').click();await wait(()=>!p.doc.querySelector('#editor').hidden);p.doc.querySelector('#unpublish-item').click();await wait(()=>p.doc.querySelector('#editor').hidden&&p.doc.querySelector('#view').getAttribute('aria-busy')==='false');assert.equal(created.publication_status,'draft');p.dom.window.close();
 }
});
