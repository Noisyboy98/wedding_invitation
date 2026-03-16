export const dto = (() => {

    /**
     * @param {{ uuid: string, own_id: string, name: string, presence: boolean|number, content: string|null, created_at: string, is_admin: boolean, is_parent: boolean, gif_url: string|null, ip: string|null, user_agent: string|null, comments: ReturnType<getCommentResponse>[], likes: number }} data
     * @returns {{ uuid: string, own: string, name: string, presence: boolean, comment: string|null, created_at: string, is_admin: boolean, is_parent: boolean, gif_url: string|null, ip: string|null, user_agent: string|null, comments: ReturnType<getCommentResponse>[], like_count: number }}
     */
    const getCommentResponse = ({ uuid, own_id, name, presence, content, created_at, is_admin, is_parent, gif_url, ip, user_agent, comments, like, likes }) => {
        return {
            uuid,
            own: String(own_id ?? ''),
            name: String(name ?? ''),
            presence: !!presence,
            comment: String(content ?? ''),
            created_at: String(created_at ?? ''),
            is_admin: is_admin ?? false,
            is_parent: is_parent ?? true,
            gif_url,
            ip,
            user_agent,
            comments: comments?.map(getCommentResponse) ?? [],
            like_count: like ?? (likes ?? 0),
        };
    };

    /**
     * @param {any[]} data
     * @returns {ReturnType<getCommentResponse>[]}
     */
    const getCommentsResponse = (data) => {
        return data
            .map(getCommentResponse)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort newest to oldest
    };

    /**
     * @param {any} resp
     * @returns {{ count: number, lists: any[] }}
     */
    const getCommentsResponseV2 = (resp) => {
        const data = resp.data || resp;
        
        // Handle data.list vs direct array
        const lists = Array.isArray(data.list) ? data.list : (Array.isArray(data) ? data : []);
        
        // Handle pagination logic from AGENT_CONNECTOR_v5 spec
        let totalCount = lists.length;
        
        if (data.pagination) {
             if (data.pagination.total !== undefined) {
                 totalCount = data.pagination.total;
             } else if (data.pagination.next_offset !== undefined) {
                 totalCount = data.pagination.next_offset ? 999999 : lists.length;
             }
        } else {
             totalCount = resp.count ?? (resp.total ?? lists.length);
        }
        
        return {
            count: totalCount,
            lists: getCommentsResponse(lists),
            next_offset: data.pagination ? data.pagination.next_offset : null
        };
    };

    /**
     * @param {any} data
     * @returns {{status: boolean}}
     */
    const statusResponse = (data) => {
        // If data is null or undefined, it's a failure
        if (!data) return { status: false };

        // If it's a direct boolean
        if (typeof data.status === 'boolean') return { status: data.status };

        // If it has a status string
        if (data.status) {
            const s = String(data.status).toLowerCase();
            if (['created', 'updated', 'deleted', 'ok', 'success'].includes(s)) return { status: true };
        }

        // If it's an object with count/updated fields but no explicit failure, treat as success
        if (data.current_likes !== undefined || data.uuid !== undefined) return { status: true };

        return {
            status: data.code === 200 || data.status === true,
        };
    };

    /**
     * @param {{token: string}} token
     * @returns {{token: string}}
     */
    const tokenResponse = ({ token }) => {
        return {
            token,
        };
    };

    /**
     * @param {{uuid: string}} uuid
     * @returns {{uuid: string}}
     */
    const uuidResponse = ({ uuid }) => {
        return {
            uuid,
        };
    };

    /**
     * @param {string} uuid
     * @param {boolean} show
     * @returns {{uuid: string, show: boolean}}
     */
    const commentShowMore = (uuid, show = false) => {
        return {
            uuid,
            show,
        };
    };

    /**
     * @param {string} id
     * @param {string} name
     * @param {boolean} presence
     * @param {string|null} comment
     * @param {string|null} gif_id
     * @returns {{name: string, own: string, presence: number, comment: string}}
     */
    const postCommentRequest = (id, name, presence, comment, gif_id) => {
        return {
            name,
            own: id ? id : `own_${Date.now()}`, // Spec requires 'own' string_unique_id
            presence: presence ? 1 : 0,
            comment: comment ? comment : '',
        };
    };

    /**
     * @param {string} email
     * @param {string} password
     * @returns {{email: string, password: string}}
     */
    const postSessionRequest = (email, password) => {
        return {
            email: email,
            password: password,
        };
    };

    /**
     * @param {boolean|null} presence
     * @param {string|null} comment
     * @param {string|null} gif_id
     * @returns {{own_id: string, comment: string}}
     */
    const updateCommentRequest = (presence, comment, gif_id) => {
        // This is tricky because we need own_id but it's not passed here.
        // We'll need to handle it in comment.js or add a param.
        return {
            own_id: '', // Will be filled in comment.js
            comment: comment ? comment : '',
        };
    };

    return {
        uuidResponse,
        tokenResponse,
        statusResponse,
        getCommentResponse,
        getCommentsResponse,
        getCommentsResponseV2,
        commentShowMore,
        postCommentRequest,
        postSessionRequest,
        updateCommentRequest,
    };
})();