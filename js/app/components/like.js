import { dto } from '../../connection/dto.js';
import { storage } from '../../common/storage.js';
import { session } from '../../common/session.js';
import { tapTapAnimation } from '../../libs/confetti.js';
import { request, HTTP_PATCH, HTTP_POST, HTTP_STATUS_OK } from '../../connection/request.js';

export const like = (() => {

    /**
     * @type {ReturnType<typeof storage>|null}
     */
    let likes = null;

    /**
     * @type {Map<string, AbortController>|null}
     */
    let listeners = null;

    /**
     * @param {HTMLButtonElement} button
     * @returns {Promise<void>}
     */
    const love = async (button) => {

        const info = button.firstElementChild;
        const heart = button.lastElementChild;

        const uuid = button.getAttribute('data-uuid');
        const ownId = button.getAttribute('data-own');
        const count = parseInt(info.getAttribute('data-count-like'));

        if (!ownId) {
            console.error('Missing own_id for like interaction');
            return;
        }

        button.disabled = true;

        if (navigator.vibrate) {
            navigator.vibrate(100);
        }

        if (likes.has(uuid)) {
            // UNLIKE atomic interaction
            await request(HTTP_POST, `?method=UNLIKE&own_id=${ownId}`)
                .token(session.getToken())
                .send(dto.statusResponse)
                .then((res) => {
                    if (res.data.status) {
                        likes.unset(uuid);

                        heart.classList.remove('fa-solid', 'text-danger');
                        heart.classList.add('fa-regular');

                        const newCount = Math.max(0, count - 1);
                        info.setAttribute('data-count-like', String(newCount));
                        info.innerText = String(newCount);
                    }
                })
                .finally(() => {
                    button.disabled = false;
                });
        } else {
            // LIKE atomic interaction
            await request(HTTP_POST, `?method=LIKE&own_id=${ownId}`)
                .token(session.getToken())
                .send(dto.statusResponse)
                .then((res) => {
                    if (res.data.status) {
                        likes.set(uuid, true);

                        heart.classList.remove('fa-regular');
                        heart.classList.add('fa-solid', 'text-danger');

                        const newCount = count + 1;
                        info.setAttribute('data-count-like', String(newCount));
                        info.innerText = String(newCount);
                    }
                })
                .finally(() => {
                    button.disabled = false;
                });
        }
    };

    /**
     * @param {string} uuid
     * @returns {HTMLElement|null}
     */
    const getButtonLike = (uuid) => {
        return document.querySelector(`button[onclick="undangan.comment.like.love(this)"][data-uuid="${uuid}"]`);
    };

    /**
     * @param {HTMLElement} div
     * @returns {Promise<void>}
     */
    const tapTap = async (div) => {
        if (!navigator.onLine) {
            return;
        }

        const currentTime = Date.now();
        const tapLength = currentTime - parseInt(div.getAttribute('data-tapTime'));
        const uuid = div.id.replace('body-content-', '');

        const isTapTap = tapLength < 300 && tapLength > 0;
        const notLiked = !likes.has(uuid) && div.getAttribute('data-liked') !== 'true';

        if (isTapTap && notLiked) {
            tapTapAnimation(div);

            div.setAttribute('data-liked', 'true');
            await love(getButtonLike(uuid));
            div.setAttribute('data-liked', 'false');
        }

        div.setAttribute('data-tapTime', String(currentTime));
    };

    /**
     * @param {string} uuid
     * @returns {void}
     */
    const addListener = (uuid) => {
        const ac = new AbortController();

        const bodyLike = document.getElementById(`body-content-${uuid}`);
        bodyLike.addEventListener('touchend', () => tapTap(bodyLike), { signal: ac.signal });

        listeners.set(uuid, ac);
    };

    /**
     * @param {string} uuid
     * @returns {void}
     */
    const removeListener = (uuid) => {
        const ac = listeners.get(uuid);
        if (ac) {
            ac.abort();
            listeners.delete(uuid);
        }
    };

    /**
     * @returns {void}
     */
    const init = () => {
        listeners = new Map();
        likes = storage('likes');
    };

    return {
        init,
        love,
        getButtonLike,
        addListener,
        removeListener,
    };
})();