(function () {
  const { el, badge, media, notify, api } = WCMAdmin;
  const form = document.querySelector('#content-form');
  let kind = 'properties', current = null, onSaved = null;
  const shared = [ ['title','Title','text',true], ['sort_order','Display order','number',true] ];
  const propertyGroups = [
    ['Property details', [shared[0], ['slug','Permanent slug','text',true,'Lowercase words separated by hyphens. This stays fixed after creation.'], ['location','Search location','text',true], ['display_location','Displayed location','text',true], ['property_type','Property type','select',true,['house','apartment','land']], ['status','Availability','select',true,['unknown','active','sold','reserved','unavailable']], shared[1], ['featured','Show in featured properties','checkbox']]],
    ['Pricing and features', [['price','Displayed asking price','text',true,'Keep consistent with numeric price, for example GHS 850,000.'], ['price_ghs','Price in GH₵','number',false,'Leave blank if unknown.'], ['bedrooms','Bedrooms','number'], ['bathrooms','Bathrooms','number'], ['area_sqft','Area (sqft)','number'], ['plot_dimensions','Plot dimensions','text'], ['features','Features','lines',false,'One feature per line. Only include confirmed details.']]],
    ['Photos', [['images','Image URLs','lines',true,'One absolute HTTPS URL per line, hosted on the website or durable media storage.'], ['image_alts','Image alt text','lines',false,'One description per line, in the same order as the photos.']]],
    ['Description', [['description','Property description','textarea',true]]],
  ];
  const galleryGroups = [['Gallery details', [shared[0], ['image_url','Image URL','url',true,'Use an absolute HTTPS URL on durable media hosting.'], ['alt','Image alt text','text',true], ['caption','Caption','textarea'], ['category','Category (optional)','text'], shared[1]]]];
  const faqGroups=[['Question details',[
    ['category','Category','text',true],['question','Question','text',true],shared[1],['featured','Feature on the homepage','checkbox'],
  ]],['Approved answer',[
    ['answer','Answer','textarea',true,'Preserve the approved wording. Separate paragraphs with a blank line; begin bullet items with • or -.'],
  ]]];
  function groups() { return kind === 'properties' ? propertyGroups : kind==='faqs'?faqGroups:galleryGroups; }
  function fields() { return groups().flatMap(([,items])=>items); }
  function showFieldError(key, message) {
    const name = key.split('.')[0], input = form.elements.namedItem(name);
    const output = document.getElementById('error-'+name);
    if (input && output) { input.setAttribute('aria-invalid','true'); output.textContent=message; output.hidden=false; }
  }
  function clearErrors() {
    form.querySelectorAll('[aria-invalid]').forEach(input=>input.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(node=>{ node.textContent=''; node.hidden=true; });
    document.querySelector('#form-error').hidden=true;
  }
  function updatePreview() {
    if(kind==='faqs')return;
    const value = kind==='properties' ? form.elements.images.value.split('\n')[0].trim() : form.elements.image_url.value.trim();
    const src=media(value), image=document.querySelector('#image-preview'), note=document.querySelector('#preview-note');
    if(src) { image.hidden=false; image.src=src; note.textContent='Preview of your first image'; }
    else { image.hidden=true; image.removeAttribute('src'); note.textContent=value?'Use a valid HTTPS image URL.':'Enter an HTTPS image URL to preview it here.'; }
  }
  document.querySelector('#image-preview').addEventListener('error',()=>{document.querySelector('#image-preview').hidden=true;document.querySelector('#preview-note').textContent='This image could not be loaded. Check the URL and its access permissions.';});
  document.querySelector('#image-preview').addEventListener('load',()=>{document.querySelector('#image-preview').hidden=false;});
  function payload(status) {
    const data={ publication_status:status };
    for(const [key,,type] of fields()) {
      const input=form.elements.namedItem(key);
      data[key]=type==='checkbox'?input.checked:type==='number'?(input.value===''?null:Number(input.value)):type==='lines'?input.value.split('\n').map(v=>v.trim()).filter(Boolean):input.value.trim();
      if(kind==='faqs'&&typeof data[key]==='string')data[key]=input.value;
      if(key==='plot_dimensions' && !data[key]) data[key]=null;
    }
    return data;
  }
  function publicUrl(item) { return kind==='properties'?item.url:new URL(kind==='faqs'?'faq.html#'+encodeURIComponent(item.id):'gallery.html#our-gallery',WCMAdmin.siteUrl).href; }
  function setBusy(value) {
    WCMAdmin.busy=value; form.setAttribute('aria-busy',String(value));
    form.querySelectorAll('button').forEach(button=>button.disabled=value);
    document.querySelector('#cancel').disabled=value;
    form.querySelectorAll('input[type=file]').forEach(input=>input.disabled=value);
  }
  function uploadControl() {
    const box=el('div',null,'upload-box'),label=el('label',kind==='properties'?'Upload property images':'Upload gallery image');
    const input=el('input');input.type='file';input.id='upload-images';input.accept='image/jpeg,image/png,image/webp,image/avif';input.multiple=kind==='properties';label.htmlFor=input.id;
    const help=el('p','JPEG, PNG, WebP or AVIF · up to 5 MB each. You can also paste image URLs below.','field-hint');
    const feedback=el('p',null,'upload-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
    input.addEventListener('change',async()=>{
      if(WCMAdmin.busy)return;
      const files=Array.from(input.files||[]);if(!files.length)return;
      const target=form.elements.namedItem(kind==='properties'?'images':'image_url');
      const existing=kind==='properties'?target.value.split('\n').filter(v=>v.trim()):[];
      if(existing.length+files.length>30){feedback.textContent='A property can have up to 30 images.';input.value='';return;}
      if(files.some(file=>file.size>5*1024*1024)){feedback.textContent='Each image must be 5 MB or smaller.';input.value='';return;}
      setBusy(true);let uploaded=0;
      try{
        for(const file of files){
          feedback.textContent=`Uploading image ${uploaded+1} of ${files.length}…`;
          const body=new FormData();body.append('image',file);
          const result=await api.request('/admin/media',{method:'POST',body});
          if(kind==='properties')target.value=[...target.value.split('\n').filter(v=>v.trim()),result.url].join('\n');else target.value=result.url;
          uploaded++;updatePreview();
        }
        feedback.textContent=`${uploaded===1?'Image uploaded':'Images uploaded'}. Save or publish this item to attach ${uploaded===1?'it':'them'} to the website.`;
      }catch(error){feedback.textContent=`${uploaded?uploaded+' image(s) uploaded. ':''}${error.message}`;}
      finally{setBusy(false);input.value='';}
    });
    box.append(label,input,help,feedback);return box;
  }
  async function save(status, publicationOnly=false) {
    if(WCMAdmin.busy) return; clearErrors();
    if(!publicationOnly) {
      let invalid=false;
      fields().forEach(([key])=>{const input=form.elements.namedItem(key);if(!input.checkValidity()){invalid=true;showFieldError(key,input.validationMessage);}});
      if(invalid) { form.querySelector('[aria-invalid]')?.focus(); return; }
    }
    setBusy(true);
    const submit=document.querySelector('#save-actions .primary-save'); if(submit) submit.textContent='Saving…';
    try {
      const input=publicationOnly?{publication_status:status}:payload(status);
      const item=await api.request('/admin/'+kind+(current?'/'+encodeURIComponent(current.id):''),{method:current?'PATCH':'POST',body:JSON.stringify(input)});
      const message=status==='published'?'Published successfully. Your changes are now available on the website.':publicationOnly?'Unpublished. This item is now private.':'Draft saved. This item is private.';
      setBusy(false); await onSaved(); notify(message,false,status==='published'?publicUrl(item):null);
    } catch(error) {
      error.fields?.forEach(issue=>showFieldError(issue.field,issue.message));
      if(error.status===409) showFieldError('slug','This slug is already in use. Choose another.');
      const box=document.querySelector('#form-error');box.textContent=error.message;box.hidden=false;box.scrollIntoView({block:'nearest'});
      form.querySelector('[aria-invalid]')?.focus();
    } finally { setBusy(false); if(submit) submit.textContent=current?.publication_status==='published'?'Save changes':'Save draft'; }
  }
  form.addEventListener('submit',event=>{
    event.preventDefault(); const status=event.submitter?.value || current?.publication_status || 'draft'; save(status);
  });
  document.querySelector('#delete-item').addEventListener('click',async()=>{
    if(WCMAdmin.busy || !current) return;
    if(!confirm(kind==='faqs'?`Delete “${current.question}”? This permanently removes the FAQ. Rerunning the seed will not restore it.`:`Delete “${current.title}”? This permanently removes the item. Its media files are not deleted.`)) return;
    setBusy(true);
    try { await api.request(`/admin/${kind}/${encodeURIComponent(current.id)}`,{method:'DELETE'});setBusy(false);await onSaved();notify('Item deleted.'); }
    catch(error) {notify(error.message,true);} finally {setBusy(false);}
  });
  WCMAdmin.editor = {
    open(moduleName,item,callback) {
      kind=moduleName;current=item;onSaved=callback;clearErrors();
      document.querySelector('#editor').dataset.kind=kind;
      document.querySelector('#view').hidden=true;document.querySelector('#editor').hidden=false;
      document.querySelector('#editor-title').textContent=`${item?'Edit':'Add'} ${kind==='properties'?'property':kind==='faqs'?'FAQ':'gallery item'}`;
      document.querySelector('.preview-card').hidden=kind==='faqs';
      const data=item||{sort_order:0,property_type:'house',status:'unknown',price:'Price on request'};
      const container=document.querySelector('#field-groups');container.replaceChildren();
      if(kind==='faqs')container.append(el('p',item?'Permanent ID: '+item.id:'A permanent FAQ ID is assigned on first save.','faq-reference'));
      for(const [heading,definitions] of groups()) {
        const fieldset=el('fieldset',null,'field-group');fieldset.append(el('legend',heading));const grid=el('div',null,'fields');
        for(const [key,label,type,required,extra] of definitions) {
          const wrapper=el('div',null,'field'+(['textarea','lines'].includes(type)?' wide':''));
          const labelNode=el('label',label);labelNode.htmlFor='field-'+key;
          const input=el(type==='select'?'select':['textarea','lines'].includes(type)?'textarea':'input');input.name=key;input.id='field-'+key;input.required=!!required;
          if(type==='select') extra.forEach(choice=>{const option=el('option',choice[0].toUpperCase()+choice.slice(1));option.value=choice;input.append(option);});
          else if(!['textarea','lines'].includes(type)) input.type=type;
          if(type==='checkbox') input.checked=!!data[key];else input.value=Array.isArray(data[key])?data[key].join('\n'):data[key]??'';
          if(type==='number'){input.min='0';input.step=['sort_order','bedrooms'].includes(key)?'1':'any';if(key==='sort_order')input.max='1000000';}
          if(key==='slug'){input.readOnly=!!item;input.pattern='[a-z0-9]+(-[a-z0-9]+)*';input.maxLength=120;}
          if(key==='image_url') input.placeholder='https://… or choose an image above';
          if(['images','image_url'].includes(key)) input.addEventListener('input',updatePreview);
          if(!['select','checkbox','number'].includes(type))input.maxLength=key==='description'?10000:['images','image_alts','features'].includes(key)?65000:1000;
          if(key==='answer'){input.maxLength=30000;input.rows=12;}
          if(key==='category'&&kind==='faqs')input.maxLength=200;
          const error=el('small',null,'field-error');error.id='error-'+key;error.hidden=true;input.setAttribute('aria-describedby',error.id);
          wrapper.append(labelNode,input);
          if(typeof extra==='string'){const hint=el('small',extra,'field-hint');hint.id='hint-'+key;wrapper.append(hint);input.setAttribute('aria-describedby',hint.id+' '+error.id);}
          if(key==='status') wrapper.append(el('small','Only active properties appear in public listing cards.','field-hint'));
          wrapper.append(error);grid.append(wrapper);
        }
        if(heading==='Photos'||kind==='gallery')fieldset.append(uploadControl());
        fieldset.append(grid);container.append(fieldset);
      }
      document.querySelector('#editor-status').replaceChildren(badge(item?.publication_status||'draft'));
      const actions=document.querySelector('#save-actions');actions.replaceChildren();
      const published=item?.publication_status==='published';
      const primary=el('button',published?'Save changes':'Save draft','button primary-save'+(published?'':' secondary'));primary.type='submit';primary.value=published?'published':'draft';actions.append(primary);
      const publish=el('button',published?'Unpublish':'Publish','button');publish.type=published?'button':'submit';publish.value='published';publish.id=published?'unpublish-item':'publish-item';
      if(published)publish.addEventListener('click',()=>save('draft',true));actions.append(publish);
      const remove=document.querySelector('#delete-item');remove.hidden=!item;remove.textContent=kind==='properties'?'Delete property':kind==='faqs'?'Delete FAQ':'Delete gallery item';
      updatePreview();document.querySelector('#editor-title').scrollIntoView({block:'start'});form.querySelector('input').focus();
    },
  };
})();
