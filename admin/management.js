// Super-admin user management and read-only audit log views.
(function(){
  const {api,el,date,notify}=WCMAdmin;
  function link(text,path,className='text-link'){const a=el('a',text,className);a.href=WCMAdmin.href(path);a.dataset.nav='';return a;}
  function heading(title,description){const h=el('div',null,'page-heading'),text=el('div');text.append(el('p','ADMINISTRATION','eyebrow'),el('h1',title),el('p',description,'muted'));h.append(text);return h;}
  function roleLabel(role){return role==='super_admin'?'Super admin':'Admin';}
  function table(headers){const wrap=el('div',null,'table-scroll'),node=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');headers.forEach(title=>{const th=el('th',title);th.scope='col';tr.append(th);});head.append(tr);node.append(head,body);wrap.append(node);return {wrap,body};}
  async function userEditor(view,user){
    const editing=!!user,head=heading(editing?'Edit user':'Add user','Only super admins can manage staff access.');head.append(link('Back to users','/admin/users','button secondary'));
    const form=el('form',null,'user-form content-card');form.id='user-form';form.noValidate=true;
    const feedback=el('p',null,'feedback error');feedback.hidden=true;feedback.setAttribute('role','alert');
    const grid=el('div',null,'fields');
    const definitions=[['name','Full name','text'],['email','Email address','email'],['role','Role','select'],['password',editing?'New password (leave blank to keep current)':'Password','password'],['is_active','Account active','checkbox']];
    for(const [key,title,type] of definitions){
      const field=el('div',null,'field'),label=el('label',title),input=el(type==='select'?'select':'input'),error=el('small',null,'field-error');label.htmlFor='user-'+key;input.id='user-'+key;input.name=key;error.id='user-error-'+key;error.hidden=true;input.setAttribute('aria-describedby',error.id);
      if(type==='select')for(const role of ['admin','super_admin']){const option=el('option',roleLabel(role));option.value=role;input.append(option);}
      else input.type=type;
      if(type==='checkbox')input.checked=user?.is_active??true;else input.value=key==='password'?'':user?.[key]||(key==='role'?'admin':'');
      input.required=key!=='is_active'&&(key!=='password'||!editing);
      if(key==='password'){input.minLength=12;input.maxLength=256;input.autocomplete='new-password';}
      if(key==='email'){input.maxLength=254;input.autocomplete='off';}
      if(key==='name')input.maxLength=120;
      if(user?.id===WCMAdmin.user.id&&['role','is_active'].includes(key))input.disabled=true;
      field.append(label,input,error);grid.append(field);
    }
    const help=el('p','Admins manage Properties, Gallery and uploads. Super admins can also manage users and view system logs. Passwords must contain at least 12 characters.','muted');
    const actions=el('div',null,'editor-footer'),save=el('button',editing?'Save user':'Create user','button');save.type='submit';actions.append(save);
    if(editing&&user.id!==WCMAdmin.user.id){
      const remove=el('button','Delete user','button danger');remove.id='delete-user';remove.type='button';
      remove.addEventListener('click',async()=>{
        if(WCMAdmin.busy||!confirm(`Delete ${user.email}? This removes their access immediately. Their content and system logs will remain.`))return;
        WCMAdmin.busy=true;remove.disabled=true;save.disabled=true;
        try{await api.request('/admin/users/'+encodeURIComponent(user.id),{method:'DELETE'});WCMAdmin.busy=false;await WCMAdmin.go('/admin/users',true);notify('User deleted. Their access has been revoked.');}
        catch(error){feedback.textContent=error.message;feedback.hidden=false;}
        finally{WCMAdmin.busy=false;remove.disabled=false;save.disabled=false;}
      });actions.append(remove);
    }
    form.append(feedback,grid,help,actions);view.replaceChildren(head,form);
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(WCMAdmin.busy)return;
      feedback.hidden=true;form.querySelectorAll('.field-error').forEach(error=>{error.hidden=true;error.textContent='';});form.querySelectorAll('[aria-invalid]').forEach(node=>node.removeAttribute('aria-invalid'));
      let valid=true;for(const input of form.elements){if(input.checkValidity&&!input.checkValidity()){const output=document.querySelector('#user-error-'+input.name);if(output){output.hidden=false;output.textContent=input.validationMessage;input.setAttribute('aria-invalid','true');valid=false;}}}
      if(!valid){form.querySelector('[aria-invalid]')?.focus();return;}
      const values=Object.fromEntries(definitions.map(([key])=>[key,key==='is_active'?form.elements.namedItem(key).checked:form.elements.namedItem(key).value.trim()]));
      if(editing&&!values.password)delete values.password;
      // Preserve intentional leading/trailing spaces in passwords.
      if(values.password)values.password=form.elements.password.value;
      WCMAdmin.busy=true;form.querySelectorAll('button').forEach(button=>button.disabled=true);save.textContent='Saving…';
      try{
        const result=await api.request('/admin/users'+(editing?'/'+encodeURIComponent(user.id):''),{method:editing?'PATCH':'POST',body:JSON.stringify(values)});
        WCMAdmin.busy=false;
        if(result.id===WCMAdmin.user.id&&(values.password||result.email!==WCMAdmin.user.email)){WCMAdmin.redirect('/admin/login?expired=1');return;}
        await WCMAdmin.go('/admin/users',true);notify(editing?'User updated. Changed passwords, roles or access take effect immediately.':'User created. Share their credentials with them securely.');
      }catch(error){
        feedback.textContent=error.message;feedback.hidden=false;
        for(const issue of error.fields||[]){const input=form.elements.namedItem(issue.field),output=document.querySelector('#user-error-'+issue.field);if(input&&output){input.setAttribute('aria-invalid','true');output.textContent=issue.message;output.hidden=false;}}
        if(error.status===409){const input=form.elements.email;input.setAttribute('aria-invalid','true');const output=document.querySelector('#user-error-email');output.textContent=error.message;output.hidden=false;}
        form.querySelector('[aria-invalid]')?.focus();
      }finally{WCMAdmin.busy=false;form.querySelectorAll('button').forEach(button=>button.disabled=false);save.textContent=editing?'Save user':'Create user';}
    });form.elements.name.focus();
  }
  WCMAdmin.management={
    async users(view,isCurrent){
      const params=new URLSearchParams(location.search),id=params.get('edit');
      if(params.has('new')){if(isCurrent())await userEditor(view,null);return;}
      if(id){const user=await api.request('/admin/users/'+encodeURIComponent(id));if(isCurrent())await userEditor(view,user);return;}
      const users=await api.request('/admin/users');if(!isCurrent())return;
      const header=heading('Users','Manage the people who maintain your website.');header.append(link('Add user','/admin/users?new=1','button'));
      const {wrap,body}=table(['Name','Email','Role','Account','Action']);
      for(const user of users){const row=el('tr');row.dataset.userId=user.id;const role=el('td'),state=el('td'),action=el('td');role.append(el('span',roleLabel(user.role),'badge '+(user.role==='super_admin'?'published':'draft')));state.append(el('span',user.is_active?'Active':'Inactive','badge '+(user.is_active?'published':'draft')));action.append(link('Edit','/admin/users?edit='+encodeURIComponent(user.id)));row.append(el('td',user.name||'—'),el('td',user.email),role,state,action);body.append(row);}
      view.replaceChildren(header,wrap);
    },
    async logs(view,isCurrent){
      const params=new URLSearchParams(location.search),q=params.get('q')||'',level=params.get('level')||'all',page=params.get('page')||'1';
      const result=await api.request('/admin/logs?'+new URLSearchParams({q,level,page}));if(!isCurrent())return;
      const header=heading('System logs','A read-only history of sign-ins, content changes, uploads and user management.');
      const filters=el('form',null,'list-toolbar');filters.id='logs-filter';
      const searchLabel=el('label','Search events','search-label'),search=el('input');search.type='search';search.name='q';search.value=q;search.maxLength=120;search.placeholder='Action, user or content ID…';searchLabel.append(search);
      const levelLabel=el('label','Event level','search-label'),select=el('select');select.name='level';for(const value of ['all','info','warning','error']){const option=el('option',value[0].toUpperCase()+value.slice(1));option.value=value;select.append(option);}select.value=level;levelLabel.append(select);
      const submit=el('button','Filter logs','button secondary');submit.type='submit';filters.append(searchLabel,levelLabel,submit);
      filters.addEventListener('submit',event=>{event.preventDefault();WCMAdmin.go('/admin/logs?'+new URLSearchParams({q:search.value,level:select.value}));});
      const {wrap,body}=table(['Time','User','Event','Level','Target','Details']);
      for(const log of result.items){const row=el('tr');const details=el('td'),summary=el('details');summary.append(el('summary','View details'),el('pre',JSON.stringify(log.details,null,2)));details.append(summary);row.append(el('td',date(log.created_at)),el('td',log.actor_email||'System / anonymous'),el('td',log.action),el('td',log.level),el('td',[log.target_type,log.target_id].filter(Boolean).join(' · ')||'—'),details);body.append(row);}
      const pagination=el('div',null,'log-pagination');pagination.append(el('p',`${result.total} events · Page ${result.page} of ${Math.max(1,Math.ceil(result.total/result.pageSize))}`,'muted'));
      const controls=el('div',null,'actions');for(const [label,next] of [['Previous',result.page-1],['Next',result.page+1]]){const button=el('button',label,'button secondary');button.type='button';button.disabled=next<1||(label==='Next'&&result.page*result.pageSize>=result.total);button.addEventListener('click',()=>WCMAdmin.go('/admin/logs?'+new URLSearchParams({q,level,page:next})));controls.append(button);}pagination.append(controls);
      view.replaceChildren(header,filters,result.items.length?wrap:el('p','No events match these filters.','state'),pagination);
    },
  };
})();
