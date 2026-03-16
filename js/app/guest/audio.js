import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { cache } from '../../connection/cache.js';

export const audio = (() => {

    const statePlay = '<i class="fa-solid fa-circle-pause spin-button"></i>';
    const statePause = '<i class="fa-solid fa-circle-play"></i>';

    /**
     * @param {boolean} [playOnOpen=true]
     * @returns {Promise<void>}
     */
    const load = async (playOnOpen = true) => {

        const url = document.body.getAttribute('data-audio');
        if (!url) {
            progress.complete('audio', true);
            return;
        }

        /**
         * @type {HTMLAudioElement|null}
         */
        let audioEl = null;

        try {
            const audioSrc = await cache('audio').withForceCache().get(url, progress.getAbort());
            
            // Comprehensive detection for Safari and all iOS browsers (Chrome/Firefox on iOS use WebKit)
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isSafari = isIOS || (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
            
            audioEl = document.createElement('audio');
            audioEl.loop = true;
            audioEl.muted = false;
            audioEl.autoplay = false;
            audioEl.controls = false;
            
            // Use absolute URL for Safari/iOS to avoid NotSupportedError
            const finalSrc = isSafari ? new URL(url, window.location.href).href : audioSrc;
            audioEl.src = finalSrc;
            audioEl.load();

            progress.complete('audio');
        } catch {
            progress.invalid('audio');
            return;
        }

        let isPlay = false;
        const music = document.getElementById('button-music');

        /**
         * @returns {Promise<void>}
         */
        const play = async () => {
            if (!navigator.onLine || !music) {
                return;
            }

            music.disabled = true;
            try {
                await audioEl.play();
                isPlay = true;
                music.disabled = false;
                music.innerHTML = statePlay;
                document.dispatchEvent(new Event('undangan.audio.play'));
            } catch (err) {
                isPlay = false;
                music.disabled = false;
                util.notify(err).error();
            }
        };

        /**
         * @returns {void}
         */
        const pause = () => {
            isPlay = false;
            audioEl.pause();
            music.innerHTML = statePause;
            document.dispatchEvent(new Event('undangan.audio.pause'));
        };

        document.addEventListener('undangan.open', () => {
            music.classList.remove('d-none');

            if (playOnOpen) {
                play();
            }
        });

        let wasPlaying = false;

        document.addEventListener('undangan.video.play', () => {
            if (isPlay) {
                wasPlaying = true;
                pause();
            }
        });

        document.addEventListener('undangan.video.pause', () => {
            if (wasPlaying) {
                play();
                wasPlaying = false;
            }
        });

        music.addEventListener('offline', pause);
        music.addEventListener('click', () => isPlay ? pause() : play());
    };

    /**
     * @returns {object}
     */
    const init = () => {
        progress.add();

        return {
            load,
        };
    };

    return {
        init,
    };
})();