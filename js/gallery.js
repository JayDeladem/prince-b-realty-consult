// Gallery content comes only from the WCM API; no snapshot fallback.
const galleryGrid = document.querySelector('.gallery-grid');
if (galleryGrid) {
    function galleryElement(tag, className, text) {
        const node = document.createElement(tag); if(className) node.className=className; if(text != null) node.textContent=text; return node;
    }
    function showGalleryImage(item, opener) {
        const lightbox=document.querySelector('.lightbox');
        const image=lightbox.querySelector('img'), closeButton=lightbox.querySelector('button');
        image.src=item.image_url; image.alt=item.alt; lightbox.classList.add('open'); lightbox.setAttribute('aria-hidden','false'); lightbox.setAttribute('role','dialog'); lightbox.setAttribute('aria-modal','true'); lightbox.setAttribute('aria-label',item.title);
        closeButton.focus();
        function closeGallery() {
            lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden','true'); opener.focus();
            lightbox.removeEventListener('click',click); document.removeEventListener('keydown',keyboard);
        }
        function click(event) { if(event.target===lightbox || event.target===closeButton) closeGallery(); }
        function keyboard(event) {
            if(event.key==='Escape') closeGallery();
            if(event.key==='Tab') {event.preventDefault(); closeButton.focus();}
        }
        lightbox.addEventListener('click',click); document.addEventListener('keydown',keyboard);
    }
    WCM.get('/gallery').then(items=>{
        if(!Array.isArray(items)) throw new Error('Invalid gallery response');
        galleryGrid.replaceChildren();
        if(!items.length) galleryGrid.append(galleryElement('p','','No gallery items have been published yet.'));
        items.forEach((item,index)=>{
            const article=galleryElement('article','gallery-card');
            const button=galleryElement('button','gallery-open'); button.type='button'; button.setAttribute('aria-label','View '+item.title);
            const image=galleryElement('img'); image.src=item.image_url; image.alt=item.alt; image.loading='lazy'; button.append(image);
            button.addEventListener('click',()=>showGalleryImage(item,button));
            const caption=galleryElement('div','gallery-caption'), details=galleryElement('div');
            details.append(galleryElement('h3','',item.title),galleryElement('p','',item.caption));
            caption.append(galleryElement('span','gallery-number',String(index+1).padStart(2,'0')),details); article.append(button,caption); galleryGrid.append(article);
        });
    }).catch(()=>{ galleryGrid.replaceChildren(galleryElement('p','','The gallery is temporarily unavailable. Please try again shortly or contact us.')); });
}
