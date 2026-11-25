(async function () {
  const { api, el, badge, date, media, notify }=WCMAdmin;
  const view=document.querySelector('#view');
  let renderVersion=0, moduleName=null, items=[], search='', status='all';
  WCMAdmin.siteUrl ||= 'https://jaydeladem.github.io/prince-b-realty-consult/';
  document.querySelectorAll('.website-link').forEach(link=>link.href=WCMAdmin.siteUrl);
  function expired() {
    view.replaceChildren(el('p','Your session has expired. Returning to sign in…','state'));
    document.querySelector('#editor').hidden=true;
    WCMAdmin.redirect('/admin/login?expired=1&next='+encodeURIComponent(location.pathname+location.search),true);
  }
  api.expired=expired;
  function syncNavigation() {
    const mobile=window.innerWidth<=900,open=document.body.classList.contains('nav-open');
    const sidebar=document.querySelector('#sidebar');sidebar.inert=mobile&&!open;
    if(mobile&&!open)sidebar.setAttribute('aria-hidden','true');else sidebar.removeAttribute('aria-hidden');
    document.querySelector('.dashboard-shell').inert=mobile&&open;
  }
  function menu(open,restore=false) {
    document.body.classList.toggle('nav-open',open);document.querySelector('.sidebar-backdrop').hidden=!open;
    document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(open));
    syncNavigation();
    if(open)document.querySelector('#close-menu').focus();else if(restore)document.querySelector('#menu-toggle').focus();
  }
  document.querySelector('#menu-toggle').addEventListener('click',()=>menu(!document.body.classList.contains('nav-open')));
  document.querySelector('#close-menu').addEventListener('click',()=>menu(false,true));
  document.querySelector('.sidebar-backdrop').addEventListener('click',()=>menu(false,true));
  window.addEventListener('resize',()=>{if(window.innerWidth>900)menu(false);else syncNavigation();});
  syncNavigation();
  document.addEventListener('keydown',event=>{
    if(!document.body.classList.contains('nav-open'))return;
    if(event.key==='Escape')menu(false,true);
    if(event.key==='Tab'){
      const links=[...document.querySelectorAll('.sidebar button,.sidebar a[href]')],first=links[0],last=links.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  function navLink(label,path,className='button') { const link=el('a',label,className);link.href=path;link.dataset.nav='';return link; }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[data-nav]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;
    event.preventDefault();if(!WCMAdmin.busy)go(link.pathname+link.search);
  });
  window.addEventListener('popstate',()=>{if(!WCMAdmin.busy)render();});
  async function go(path,replace=false){
    if(WCMAdmin.busy)return;
    history[replace?'replaceState':'pushState']({},'',path);notify('');menu(false);await render();
    if(document.querySelector('#editor').hidden)document.querySelector('#main').focus({preventScroll:true});
  }
  WCMAdmin.go=go;
  document.querySelector('#cancel').addEventListener('click',()=>go('/admin/'+moduleName));
  document.querySelector('#sign-out').addEventListener('click',event=>WCMAdmin.action(event.currentTarget,async()=>{
    if(WCMAdmin.busy)return;
    try { await api.request('/auth/sign-out',{method:'POST'}); }
    catch(error) { if(error.status!==401&&error.status!==403)throw error; }
    WCMAdmin.redirect('/admin/login');
  }));
  function heading(title,subtitle,kind) {
    const header=el('div',null,'page-heading'),text=el('div');text.append(el('p','WEBSITE CONTENT','eyebrow'),el('h1',title),el('p',subtitle,'muted'));header.append(text);
    if(kind)header.append(navLink(kind==='properties'?'Add property':kind==='faqs'?'Add FAQ':'Add gallery item',`/admin/${kind}?new=1`));return header;
  }
  function image(src,alt,className) {const img=el('img',null,className);const url=media(src);if(url)img.src=url;img.alt=alt;img.loading='lazy';return img;}
  async function overview(version) {
    const [properties,gallery,faqs]=await Promise.all([api.request('/admin/properties'),api.request('/admin/gallery'),api.request('/admin/faqs')]);
    if(version!==renderVersion)return;
    view.replaceChildren(heading('Overview','A clear view of your website, all in one place.'));
    const actions=el('div',null,'overview-actions');actions.append(navLink('Add property','/admin/properties?new=1'),navLink('Add gallery item','/admin/gallery?new=1','button secondary'),navLink('Add FAQ','/admin/faqs?new=1','button secondary'));view.append(actions);
    const stats=el('div',null,'stats-grid');
    for(const [label,count] of [['Published properties',properties.filter(p=>p.publication_status==='published').length],['Property drafts',properties.filter(p=>p.publication_status==='draft').length],['Published gallery photos',gallery.filter(p=>p.publication_status==='published').length]]) {
      const card=el('article',null,'stat-card');card.append(el('p',label,'muted'),el('strong',String(count)));stats.append(card);
    }
    view.append(stats);
    const recent=el('section',null,'content-card');recent.append(el('h2','Recently updated'));
    const all=[...properties.map(item=>({...item,kind:'properties'})),...gallery.map(item=>({...item,kind:'gallery'})),...faqs.map(item=>({...item,kind:'faqs'}))].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)||a.id.localeCompare(b.id)).slice(0,8);
    if(!all.length)recent.append(el('p','No content yet. Add a property or gallery item to get started.','state'));
    else{
      const table=el('table');table.className='recent-table';const head=el('thead'),row=el('tr');['Name','Content type','Status','Last updated','Action'].forEach(label=>{const th=el('th',label);th.scope='col';row.append(th);});head.append(row);const body=el('tbody');
      all.forEach(item=>{const tr=el('tr');const name=el('td',item.title||item.question),kind=el('td',item.kind==='properties'?'Property':item.kind==='faqs'?'FAQ':'Gallery'),statusCell=el('td'),updated=el('td'),action=el('td');statusCell.append(badge(item.publication_status));const time=el('time',date(item.updated_at));time.dateTime=item.updated_at;updated.append(time);action.append(navLink('Edit',`/admin/${item.kind}?edit=${encodeURIComponent(item.id)}`,'text-link'));tr.append(name,kind,statusCell,updated,action);body.append(tr);});
      table.append(head,body);const wrap=el('div',null,'table-scroll');wrap.append(table);recent.append(wrap);
    }view.append(recent);
  }
  function filteredItems(){const q=search.toLowerCase().trim();return items.filter(item=>(status==='all'||item.publication_status===status)&&`${item.title||item.question} ${item.category||''} ${item.location||''} ${item.display_location||''}`.toLowerCase().includes(q));}
  function renderList() {
    const list=document.querySelector('#items');list.replaceChildren();const visible=filteredItems();
    if(!visible.length){document.querySelector('#result-count').textContent='0 items';list.append(el('p',items.length?'No items match your search or status filter.':'No content yet. Add your first item.','state'));return;}
    if(moduleName==='faqs'){
      const wrap=el('div',null,'table-scroll'),table=el('table',null,'faq-admin-table'),head=el('thead'),headRow=el('tr'),body=el('tbody');
      ['Question','Category','Order','Homepage','Status','Action'].forEach(label=>{const th=el('th',label);th.scope='col';headRow.append(th);});head.append(headRow);
      visible.forEach(item=>{
        const row=el('tr');row.dataset.itemId=item.id;const question=el('td'),statusCell=el('td'),action=el('td');
        question.append(el('strong',item.question),el('small',item.id,'faq-row-id'));statusCell.append(badge(item.publication_status));
        action.append(navLink('Edit',`/admin/faqs?edit=${encodeURIComponent(item.id)}`,'text-link'));
        row.append(question,el('td',item.category),el('td',String(item.sort_order)),el('td',item.featured?'Featured':'—'),statusCell,action);body.append(row);
      });table.append(head,body);wrap.append(table);list.append(wrap);
    }else if(moduleName==='properties'){
      const wrap=el('div',null,'table-scroll'),table=el('table',null,'property-table'),head=el('thead'),headRow=el('tr');
      ['Property','Location','Asking price','Status','Action'].forEach(label=>{const th=el('th',label);th.scope='col';headRow.append(th);});head.append(headRow);const body=el('tbody');
      visible.forEach(item=>{
        const row=el('tr');row.dataset.itemId=item.id;const name=el('td'),identity=el('div',null,'property-identity'),text=el('div');text.append(el('strong',item.title),el('small',item.property_type));identity.append(image(item.images[0],item.image_alts?.[0]||item.title,'table-thumbnail'),text);name.append(identity);
        const locationCell=el('td',item.display_location),price=el('td',item.price_ghs==null?item.price||'Price unknown':'GH₵ '+Number(item.price_ghs).toLocaleString(undefined,{maximumFractionDigits:2})),statusCell=el('td'),action=el('td');
        statusCell.append(badge(item.publication_status));action.append(navLink('Edit',`/admin/properties?edit=${encodeURIComponent(item.id)}`,'text-link'));row.append(name,locationCell,price,statusCell,action);body.append(row);
      });table.append(head,body);wrap.append(table);list.append(wrap);
    } else {
      const grid=el('div',null,'admin-gallery-grid');
      visible.forEach(item=>{const card=el('article',null,'gallery-admin-card');card.dataset.itemId=item.id;const details=el('div',null,'gallery-admin-info'),top=el('div',null,'card-meta');top.append(badge(item.publication_status),el('span','Order '+item.sort_order));details.append(top,el('h2',item.title),el('p',item.caption||'No caption','muted'),navLink('Edit',`/admin/gallery?edit=${encodeURIComponent(item.id)}`,'text-link'));card.append(image(item.image_url,item.alt,'gallery-thumbnail'),details);grid.append(card);});list.append(grid);
    }
    document.querySelector('#result-count').textContent=`${visible.length} ${visible.length===1?'item':'items'}`;
  }
  async function contentPage(kind,version) {
    const loaded=await api.request('/admin/'+kind);if(version!==renderVersion)return;items=loaded;search='';status='all';
    view.replaceChildren(heading(kind==='properties'?'Properties':kind==='faqs'?'FAQs':'Gallery',kind==='properties'?'Manage the places your clients will call home.':kind==='faqs'?'Manage approved answers, display order and homepage questions.':'Share your projects, spaces and stories.',kind));
    const toolbar=el('div',null,'list-toolbar');const searchLabel=el('label',kind==='properties'?'Search properties':kind==='faqs'?'Search FAQs':'Search gallery','search-label'),input=el('input');input.type='search';input.id='content-search';input.placeholder=kind==='properties'?'Search by title or location…':kind==='faqs'?'Search by question or category…':'Search by title…';searchLabel.append(input);
    input.addEventListener('input',()=>{search=input.value;renderList();});const filters=el('div',null,'status-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Publication filter');
    for(const [value,label] of [['all','All'],['published','Published'],['draft','Drafts']]){const button=el('button',label);button.type='button';button.dataset.filter=value;button.setAttribute('aria-pressed',String(value===status));button.addEventListener('click',()=>{status=value;filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderList();});filters.append(button);}
    const count=el('span','', 'result-count');count.id='result-count';toolbar.append(searchLabel,filters,count);const list=el('div');list.id='items';view.append(toolbar,list);renderList();
    const params=new URLSearchParams(location.search),edit=params.get('edit');
    if(params.has('new'))WCMAdmin.editor.open(kind,null,()=>go('/admin/'+kind,true));
    else if(edit){const item=await api.request(`/admin/${kind}/${encodeURIComponent(edit)}`);if(version===renderVersion)WCMAdmin.editor.open(kind,item,()=>go('/admin/'+kind,true));}
  }
  async function render() {
    const version=++renderVersion;document.querySelector('#editor').hidden=true;view.hidden=false;view.setAttribute('aria-busy','true');view.replaceChildren(el('p','Loading content…','state'));
    const path=location.pathname.replace(/\/$/,'');moduleName=path==='/admin/properties'?'properties':path==='/admin/gallery'?'gallery':path==='/admin/faqs'?'faqs':null;
    const managementPage=path==='/admin/users'?'users':path==='/admin/logs'?'logs':null;
    document.querySelectorAll('.sidebar nav a').forEach(link=>{if(link.pathname===path)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    document.title=(managementPage?managementPage==='users'?'Users':'System logs':moduleName?moduleName==='properties'?'Properties':moduleName==='faqs'?'FAQs':'Gallery':'Overview')+' | Prince B Content Manager';
    try {
      if(managementPage){
        if(WCMAdmin.user.role!=='super_admin')throw new Error('Only a super admin can access this page.');
        await WCMAdmin.management[managementPage](view,()=>version===renderVersion);
      }else if(moduleName)await contentPage(moduleName,version);else await overview(version);
    }
    catch(error){if(version!==renderVersion)return;view.replaceChildren(el('p',error.message,'state error'));const retry=el('button','Try again','button secondary');retry.type='button';retry.addEventListener('click',render);view.append(retry);}
    finally{if(version===renderVersion)view.setAttribute('aria-busy','false');}
  }
  try {
    const user=await api.session();if(!user){WCMAdmin.redirect('/admin/login?next='+encodeURIComponent(location.pathname+location.search),true);return;}
    WCMAdmin.user=user;
    document.querySelector('#staff-email').textContent=user.email+' · '+(user.role==='super_admin'?'Super admin':'Admin');
    document.querySelector('#super-admin-nav').hidden=user.role!=='super_admin';await render();
  } catch(error){notify(error.message,true);view.replaceChildren(el('p','The workspace could not be loaded.','state'));const retry=el('button','Try again','button');retry.addEventListener('click',()=>location.reload());view.append(retry);}
})();
