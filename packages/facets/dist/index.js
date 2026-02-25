export function tagId(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
export function inferForm(collection, meta) {
    var _a;
    if ((_a = meta.frontmatter) === null || _a === void 0 ? void 0 : _a.form)
        return meta.frontmatter.form;
    if (collection === 'the-mirror-room/')
        return 'story';
    if (collection === 'chats/')
        return 'chat';
    return 'essay';
}
function toSet(v) {
    if (!v)
        return new Set();
    if (v instanceof Set)
        return v;
    return new Set(v);
}
/** AND across facets, AND within subject/concern, OR within form */
export function filterPosts(posts, filters) {
    const subjects = toSet(filters.subject);
    const concerns = toSet(filters.concern);
    const forms = toSet(filters.form);
    return posts.filter((p) => {
        if (subjects.size > 0) {
            const slugged = new Set(p.subjects.map((s) => tagId(s)));
            for (const v of subjects) {
                if (!slugged.has(v))
                    return false;
            }
        }
        if (concerns.size > 0) {
            const slugged = new Set(p.concerns.map((c) => tagId(c)));
            for (const v of concerns) {
                if (!slugged.has(v))
                    return false;
            }
        }
        if (forms.size > 0) {
            if (!forms.has(tagId(p.form)))
                return false;
        }
        return true;
    });
}
export function countFacetValues(posts) {
    const counts = { subject: {}, concern: {}, form: {} };
    for (const p of posts) {
        for (const s of p.subjects) {
            const id = tagId(s);
            counts.subject[id] = (counts.subject[id] || 0) + 1;
        }
        for (const c of p.concerns) {
            const id = tagId(c);
            counts.concern[id] = (counts.concern[id] || 0) + 1;
        }
        const fid = tagId(p.form);
        counts.form[fid] = (counts.form[fid] || 0) + 1;
    }
    return counts;
}
