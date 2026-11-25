/* Shared public FAQ loader. Editorial text is always rendered as text nodes. */
(function () {
    const mounts = Array.from(document.querySelectorAll('[data-faqs]'));
    if (!mounts.length) return;
    let cataloguePromise;
    const questions = new Map();

    function node(tag, className, text) {
        const result = document.createElement(tag);
        if (className) result.className = className;
        if (text != null) result.textContent = text;
        return result;
    }
    function loadFAQs() {
        if (!cataloguePromise) {
            cataloguePromise = WCM.get('/faqs').then(records => {
                if (!Array.isArray(records)) throw new Error('Invalid FAQ response');
                const ids = new Set();
                for (const record of records) {
                    if (!record || typeof record.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(record.id) || ids.has(record.id)
                        || ['category', 'question', 'answer'].some(key => typeof record[key] !== 'string' || !record[key].trim())
                        || (record.featured !== undefined && typeof record.featured !== 'boolean')) throw new Error('Invalid FAQ record');
                    ids.add(record.id);
                }
                return records;
            }).catch(error => { cataloguePromise = null; throw error; });
        }
        return cataloguePromise;
    }
    function answerContent(answer) {
        const content = node('div', 'faq-answer');
        let paragraph = [], list = null, lastItem = null;
        function flushParagraph() {
            if (paragraph.length) content.append(node('p', '', paragraph.join('\n')));
            paragraph = [];
        }
        // Interpret only plain-text list markers, never HTML or arbitrary Markdown.
        for (const line of answer.replace(/\r\n?/g, '\n').split('\n')) {
            if (!line.trim()) { flushParagraph(); list = null; lastItem = null; continue; }
            const bullet = /^\s*([•*-])\s+(.*)$/.exec(line);
            const numbered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
            if (bullet || numbered) {
                flushParagraph();
                const type = numbered ? 'OL' : 'UL';
                if (!list || list.tagName !== type) { list = node(type.toLowerCase()); content.append(list); }
                lastItem = node('li', '', numbered ? numbered[2] : bullet[2]);
                if (numbered) lastItem.value = Number(numbered[1]);
                list.append(lastItem);
            } else if (list && lastItem && /^\s+\S/.test(line)) {
                lastItem.append(document.createTextNode('\n' + line));
            } else {
                list = null; lastItem = null; paragraph.push(line);
            }
        }
        flushParagraph();
        return content;
    }
    function accordion(record) {
        const details = node('details', 'faq-item'); details.id = record.id;
        const summary = node('summary', 'faq-question');
        const title = node('h3', '', record.question);
        const marker = node('span', 'faq-marker', '+'); marker.setAttribute('aria-hidden', 'true');
        summary.append(title, marker);
        const answer = answerContent(record.answer);
        details.append(summary, answer);
        questions.set(record.id, { details, summary });
        return details;
    }
    function openHash() {
        let id;
        try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
        const match = questions.get(id);
        if (!match) return;
        match.details.open = true;
        requestAnimationFrame(() => {
            match.details.scrollIntoView({ block: 'start' });
            match.summary.focus({ preventScroll: true });
        });
    }
    window.addEventListener('hashchange', openHash);
    // Native summary handles Enter and Space; optional arrow/Home/End navigation
    // moves between questions without changing their expanded state.
    document.addEventListener('keydown', event => {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !event.target.matches('.faq-question')) return;
        const summaries = Array.from(document.querySelectorAll('.faq-question'));
        const current = summaries.indexOf(event.target);
        let next = event.key === 'Home' ? 0 : event.key === 'End' ? summaries.length - 1 : current + (event.key === 'ArrowDown' ? 1 : -1);
        next = Math.max(0, Math.min(summaries.length - 1, next));
        event.preventDefault(); summaries[next]?.focus();
    });
    async function render(mount) {
        mount.setAttribute('aria-busy', 'true');
        const loading = node('p', 'faq-state', 'Loading frequently asked questions…'); loading.setAttribute('role', 'status');
        mount.replaceChildren(loading);
        try {
            const records = await loadFAQs();
            const featured = mount.dataset.faqs === 'featured';
            const selected = featured ? records.filter(record => record.featured === true).slice(0, 5) : records;
            mount.replaceChildren();
            if (!selected.length) {
                const empty = node('p', 'faq-state', featured ? 'No featured questions have been published yet.' : 'No FAQs have been published yet. Please contact our team with your questions.');
                empty.setAttribute('role', 'status'); mount.append(empty);
            } else if (featured) {
                selected.forEach(record => mount.append(accordion(record)));
            } else {
                const categories = new Map();
                selected.forEach(record => {
                    if (!categories.has(record.category)) categories.set(record.category, []);
                    categories.get(record.category).push(record);
                });
                categories.forEach((items, category) => {
                    const section = node('section', 'faq-group');
                    section.append(node('h2', '', category));
                    items.forEach(record => section.append(accordion(record)));
                    mount.append(section);
                });
            }
            openHash();
        } catch (_) {
            const error = node('div', 'faq-state faq-unavailable');
            const message = node('p', '', 'Frequently asked questions are temporarily unavailable. Please try again or contact our team.');
            message.setAttribute('role', 'status');
            const retry = node('button', 'btn btn-outline', 'Try again'); retry.type = 'button';
            retry.addEventListener('click', () => render(mount));
            error.append(message, retry); mount.replaceChildren(error);
        } finally { mount.setAttribute('aria-busy', 'false'); }
    }
    mounts.forEach(render);
})();
