import { util } from '../../common/util.js';

export const pagination = (() => {

    let perPage = 10;
    let pageNow = 0;
    let totalData = 0;

    /**
     * @type {HTMLElement|null}
     */
    let page = null;

    /**
     * @type {HTMLElement|null}
     */
    let liPrev = null;

    /**
     * @type {HTMLElement|null}
     */
    let liNext = null;

    /**
     * @type {HTMLElement|null}
     */
    let paginate = null;

    /**
     * @type {HTMLElement|null}
     */
    let comment = null;

    /**
     * @param {number} num 
     * @returns {void}
     */
    const setPer = (num) => {
        perPage = Number(num);
    };

    /**
     * @returns {number}
     */
    const getPer = () => perPage;

    /**
     * @returns {number}
     */
    const getNext = () => pageNow;

    /**
     * @returns {number}
     */
    const geTotal = () => totalData;

    /**
     * @returns {void}
     */
    const disablePrevious = () => !liPrev.classList.contains('disabled') ? liPrev.classList.add('disabled') : null;

    /**
     * @returns {void}
     */
    const enablePrevious = () => liPrev.classList.contains('disabled') ? liPrev.classList.remove('disabled') : null;

    /**
     * @returns {void}
     */
    const disableNext = () => !liNext.classList.contains('disabled') ? liNext.classList.add('disabled') : null;

    /**
     * @returns {void}
     */
    const enableNext = () => liNext.classList.contains('disabled') ? liNext.classList.remove('disabled') : null;

    /**
     * @param {HTMLButtonElement} button 
     * @returns {object}
     */
    const buttonAction = (button) => {
        disableNext();
        disablePrevious();

        const btn = util.disableButton(button, util.loader.replace('ms-0 me-1', 'mx-1'), true);

        const process = () => {
            comment.addEventListener('undangan.comment.done', () => btn.restore(), { once: true });
            comment.addEventListener('undangan.comment.result', () => comment.scrollIntoView(), { once: true });

            comment.dispatchEvent(new Event('undangan.comment.show'));
        };

        const next = () => {
            pageNow += perPage;
            button.innerHTML = 'Next' + button.innerHTML;
            process();
        };

        const prev = () => {
            pageNow -= perPage;
            button.innerHTML = button.innerHTML + 'Prev';
            process();
        };

        return {
            next,
            prev,
        };
    };

    /**
     * @returns {boolean}
     */
    const reset = () => {
        if (pageNow === 0) {
            return false;
        }

        pageNow = 0;
        disableNext();
        disablePrevious();

        return true;
    };

    /**
     * @param {number} len 
     * @returns {void}
     */
    const setTotal = (len) => {
        totalData = Number(len);

        // Calculate current page number
        const current = (pageNow / perPage) + 1;
        const total = Math.ceil(totalData / perPage);
        const isUnknownTotal = totalData >= 999999;

        // Visibility: Hide only if we are on page 1 AND there's no more data
        if (pageNow === 0 && !isUnknownTotal && totalData <= perPage) {
            paginate.classList.add('d-none');
            return;
        }

        // Display: If total is unknown or we have a weird total (like on last page), just show "Page X"
        // unless total is clearly valid and >= current
        if (isUnknownTotal || (total < current && current > 1)) {
            page.innerText = `Page ${current}`;
        } else {
            page.innerText = `${current} / ${total}`;
        }

        // Previous Button
        if (pageNow > 0) {
            enablePrevious();
        } else {
            disablePrevious();
        }

        // Next Button: Enable if we have a "fake" total or if current < total
        if (isUnknownTotal || current < total) {
            enableNext();
        } else {
            disableNext();
        }

        // Final visibility check
        paginate.classList.remove('d-none');
    };

    /**
     * @returns {void}
     */
    const init = () => {
        paginate = document.getElementById('pagination');
        paginate.innerHTML = `
        <ul class="pagination mb-2 shadow-sm rounded-4">
            <li class="page-item disabled" id="previous">
                <button class="page-link rounded-start-4" onclick="undangan.comment.pagination.previous(this)" data-offline-disabled="false">
                    <i class="fa-solid fa-circle-left me-1"></i>Prev
                </button>
            </li>
            <li class="page-item disabled">
                <span class="page-link text-theme-auto" id="page"></span>
            </li>
            <li class="page-item" id="next">
                <button class="page-link rounded-end-4" onclick="undangan.comment.pagination.next(this)" data-offline-disabled="false">
                    Next<i class="fa-solid fa-circle-right ms-1"></i>
                </button>
            </li>
        </ul>`;

        comment = document.getElementById('comments');
        page = document.getElementById('page');
        liPrev = document.getElementById('previous');
        liNext = document.getElementById('next');
    };

    return {
        init,
        setPer,
        getPer,
        getNext,
        reset,
        setTotal,
        geTotal,
        previous: (btn) => buttonAction(btn).prev(),
        next: (btn) => buttonAction(btn).next(),
    };
})();
