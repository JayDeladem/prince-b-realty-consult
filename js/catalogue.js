/* Shared catalogue rendering. All catalogue and chat content uses textContent. */
function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
}
function listingLink(record) {
    if (typeof record.url !== 'string' || !record.url.trim()) return null;
    const url = new URL(record.url, location.href);
    if (url.protocol !== 'https:' || url.origin !== 'https://jaydeladem.github.io') return null;
    return url.href;
}
catalogueReady.then(records => {
    document.querySelectorAll('.property-grid').forEach(grid => {
        grid.replaceChildren();
        const visible = records.filter(p => p.status === 'active' && (grid.dataset.featured !== 'true' || p.featured));
        if (!visible.length) grid.append(element('p', '', 'No properties are currently published in this selection.'));
        visible.forEach(p => {
            const card = element('article', 'property-card property-item');
            card.dataset.category = p.property_type;
            card.dataset.propertyId = p.id;
            const imageBox = element('div', 'property-image');
            const link = element('a');
            link.href = 'property-details.html?id=' + encodeURIComponent(p.slug);
            const image = element('img'); image.src = p.images[0]; image.alt = p.image_alts?.[0] || p.title;
            link.append(image); imageBox.append(link, element('span', 'sale-tag', 'FOR SALE'));
            const info = element('div', 'property-info');
            info.append(element('h3', '', p.title), element('p', 'property-location', p.display_location), element('div', 'property-price', p.price));
            const meta = element('div', 'property-meta');
            [p.bedrooms == null ? null : `${p.bedrooms} Beds`, p.area_sqft ? `${p.area_sqft} sqft` : p.plot_dimensions].filter(Boolean).forEach(text => meta.append(element('span', '', text)));
            const details = element('a', 'btn btn-outline', 'View Details'); details.href = link.href;
            info.append(meta, details); card.append(imageBox, info); grid.append(card);
        });
    });
    propertyCards = document.querySelectorAll('.property-item');
    filterProperties();
}).catch(() => {
    document.querySelectorAll('.property-grid').forEach(grid => grid.replaceChildren(element('p', '', 'Properties are temporarily unavailable. Please try again or contact us.')));
});

// PrinBot keeps conversation state in memory and uses the existing FastAPI contract.
function botAvatar() {
    const avatar = element('img', 'chat-avatar');
    avatar.src = 'images/prinbot.svg'; avatar.alt = ''; avatar.setAttribute('aria-hidden', 'true');
    return avatar;
}
function iconButton(className, label, symbol) {
    const button = element('button', className); button.type = 'button';
    button.setAttribute('aria-label', label);
    const icon = element('span', '', symbol); icon.setAttribute('aria-hidden', 'true'); button.append(icon);
    return button;
}
const launcher = element('button', 'chat-launcher'); launcher.type = 'button';
launcher.append(botAvatar());
launcher.setAttribute('aria-label', 'Chat with PrinBot');
launcher.setAttribute('aria-expanded', 'false'); launcher.setAttribute('aria-controls', 'property-chat');
const panel = element('section', 'property-chat'); panel.id = 'property-chat'; panel.hidden = true;
panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'prinbot-title');
const header = element('div', 'chat-header');
const portrait = element('img', 'chat-portrait'); portrait.src = 'images/prinbot-customer.png'; portrait.alt = ''; portrait.setAttribute('aria-hidden','true');
const heading = element('div', 'chat-heading');
heading.append(element('p', 'chat-eyebrow', 'PRINCE B REALTY CONSULT'));
const title = element('h2', '', 'Chat with PrinBot'); title.id = 'prinbot-title';
heading.append(title, element('p', 'chat-subtitle', "Prince 'B' assistant"));
const close = iconButton('chat-close', 'Close PrinBot chat', '×');
header.append(portrait, heading, close);
const messages = element('div', 'chat-messages'); messages.setAttribute('role', 'log'); messages.setAttribute('aria-label', 'Conversation with PrinBot'); messages.setAttribute('aria-live', 'polite'); messages.setAttribute('aria-relevant', 'additions text');
const form = element('form', 'chat-form');
const composer = element('div', 'chat-composer');
const input = element('input'); input.placeholder = 'Ask about a property…'; input.maxLength = 1200; input.required = true; input.setAttribute('aria-label','Your property question'); input.autocomplete = 'off';
const send = iconButton('chat-send', 'Send message', '➤'); send.type = 'submit';
composer.append(input, send); form.append(composer, element('p', 'chat-note', 'Here to help you find your place.'));
panel.append(header, messages, form); document.body.append(launcher, panel);
function keepLatestVisible() { messages.scrollTop = messages.scrollHeight; }
function syncViewport() {
    const viewport = window.visualViewport;
    panel.style.setProperty('--chat-viewport-height', `${viewport ? viewport.height : window.innerHeight}px`);
    panel.style.setProperty('--chat-viewport-top', `${viewport ? viewport.offsetTop : 0}px`);
    if (!panel.hidden) keepLatestVisible();
}
window.visualViewport?.addEventListener('resize', syncViewport);
window.visualViewport?.addEventListener('scroll', syncViewport);
window.addEventListener('resize', syncViewport);
function toggleChat(open) {
    panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open));
    syncViewport(); (open ? input : launcher).focus({preventScroll:true});
}
launcher.addEventListener('click', () => toggleChat(panel.hidden)); close.addEventListener('click', () => toggleChat(false));
panel.addEventListener('keydown', e => {
    if(e.key === 'Escape') { e.preventDefault(); toggleChat(false); }
    if(e.key === 'Tab') {
        const controls = Array.from(panel.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')).filter(el => !el.closest('[hidden]'));
        const first = controls[0], last = controls[controls.length-1];
        if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
});
function addBotMessage(text) {
    const row = element('div', 'chat-bot-row');
    const bubble = element('div', 'chat-reply', text);
    row.append(botAvatar(), bubble); messages.append(row);
    return bubble;
}
addBotMessage('Hi, I’m PrinBot, your Prince B Realty property assistant. Tell me what you’re looking for, and I’ll help you explore your options.');
const starters = element('div', 'chat-starters'); starters.setAttribute('aria-label', 'Suggested questions');
['Show me houses for sale', 'Do you have land for sale?', 'Show me properties under GHS 900,000', 'How do I arrange a viewing?'].forEach(question => {
    const button = element('button', 'chat-starter', question); button.type = 'button';
    button.addEventListener('click', () => sendMessage(question)); starters.append(button);
});
messages.append(starters);
let previousQuery = null, previousIds = [], busy = false;
async function sendMessage(message, retryBubble = null) {
    message = message.trim(); if(!message || busy) return;
    busy = true; send.disabled = true; form.setAttribute('aria-busy','true'); starters.hidden = true;
    // Keep the input available so closing and reopening while loading can always focus it.
    if(!retryBubble) { messages.append(element('p', 'chat-question', message)); input.value = ''; }
    const pending = retryBubble || addBotMessage(''); pending.replaceChildren(); pending.classList.add('chat-loading');
    pending.append(element('span', '', 'PrinBot is looking into that…'));
    keepLatestVisible();
    try {
        const response = await fetch('https://property-chatbot-89ed.onrender.com/chat', {
            method:'POST', headers:{'Content-Type':'application/json'}, signal:AbortSignal.timeout(60000),
            body:JSON.stringify({message, previous_query:previousQuery, previous_listing_ids:previousIds})
        });
        if(!response.ok) throw new Error('Service unavailable');
        const data = await response.json();
        if(typeof data.reply !== 'string' || !Array.isArray(data.listings)) throw new Error('Invalid response');
        pending.textContent = data.reply;
        if(data.demo === true && data.listings.length > 0) pending.append(element('p','chat-demo','Demo catalogue — please confirm details with our team.'));
        data.listings.forEach(p => {
            let href; try { href = listingLink(p); } catch (_) { return; }
            if(!href) return;
            const card = element('a','chat-listing'); card.href = href;
            card.append(element('span','chat-listing-label','EXPLORE PROPERTY'), element('strong','',p.title), element('span','',`${p.location} · ${p.price_ghs == null ? 'Price unknown' : 'GHS '+Number(p.price_ghs).toLocaleString()} · ${p.status === 'active' ? 'For sale' : 'Availability unknown'}`));
            pending.append(card);
        });
        if(data.moderation !== 'threat') {
            if(typeof data.search_query === 'string') previousQuery = data.search_query;
            else if(data.intent === 'search_property') previousQuery = /^(and|what about|how about|only)\b/i.test(message) && previousQuery ? previousQuery+'; '+message : message;
            if(data.listings.length) previousIds = data.listings.map(p=>p.id).slice(0,3);
        }
    } catch (_) {
        pending.textContent = 'PrinBot couldn’t connect just now. Please try again, or contact our team.';
        const retry = element('button','chat-retry','Try again'); retry.type = 'button';
        retry.addEventListener('click', () => sendMessage(message, pending)); pending.append(retry);
    } finally {
        pending.classList.remove('chat-loading'); busy = false; send.disabled = false; form.setAttribute('aria-busy','false');
        if(!panel.hidden && (document.activeElement === send || document.activeElement === document.body)) input.focus({preventScroll:true});
        keepLatestVisible();
    }
}
form.addEventListener('submit', event => { event.preventDefault(); sendMessage(input.value); });
syncViewport();
