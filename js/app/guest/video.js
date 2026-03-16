import { progress } from './progress.js';
import { util } from '../../common/util.js';
import { cache } from '../../connection/cache.js';
import { HTTP_GET, request, HTTP_STATUS_OK, HTTP_STATUS_PARTIAL_CONTENT } from '../../connection/request.js';

export const video = (() => {

    /**
     * @type {ReturnType<typeof cache>|null}
     */
    let c = null;

    /**
     * @returns {Promise<void>}
     */
    const load = () => {
        const wrap = document.getElementById('video-love-stroy');
        if (!wrap || !wrap.hasAttribute('data-src')) {
            wrap?.remove();
            progress.complete('video', true);
            return Promise.resolve();
        }

        const src = wrap.getAttribute('data-src');
        if (!src) {
            progress.complete('video', true);
            return Promise.resolve();
        }

        const vid = document.createElement('video');
        vid.className = wrap.getAttribute('data-vid-class');
        vid.loop = true;
        vid.muted = true; // Start muted to satisfy mobile autoplay eligibility
        vid.controls = false;
        vid.autoplay = false;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        vid.preload = 'metadata';

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // When visible, try to play. The priming in 'undangan.open' 
                    // should have unlocked unmuted playback.
                    const promise = vid.play();
                    if (promise !== undefined) {
                        promise.catch(() => {
                            // Falling back to muted play if unmuted is still blocked
                            vid.muted = true;
                            vid.play().catch(() => {});
                        });
                    }
                } else {
                    vid.pause();
                }
            });
        }, { threshold: 0.2 }); // Trigger when 20% visible for stability

        let isPriming = false;

        vid.addEventListener('play', () => {
            if (!isPriming) {
                document.dispatchEvent(new Event('undangan.video.play'));
            }
        });

        vid.addEventListener('pause', () => {
            if (!isPriming) {
                document.dispatchEvent(new Event('undangan.video.pause'));
            }
        });

        document.addEventListener('undangan.audio.play', () => {
            vid.pause();
        });

        // Prime the video on any user gesture to unlock sound for later autoplay
        document.addEventListener('undangan.open', () => {
            // Now that we have a user gesture, we can unmute and prime
            isPriming = true;
            vid.muted = false;
            
            // Playing and immediately pausing unblocks sound for subsequent play() calls
            vid.play().then(() => {
                vid.pause();
                isPriming = false;
            }).catch(() => {
                // If unmuted prime fails, we keep it muted for safety but still unlocked
                vid.muted = true;
                vid.play().then(() => {
                    vid.pause();
                    isPriming = false;
                }).catch(() => {
                    isPriming = false;
                });
            });
        });

        /**
         * @param {Blob} b
         * @returns {void}
         */
        const prepareVideo = (b) => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isSafari = isIOS || (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
            
            vid.preload = 'auto';
            vid.controls = true;
            vid.disableRemotePlayback = true;
            vid.disablePictureInPicture = true;
            vid.controlsList = 'noremoteplayback nodownload noplaybackrate';
            
            // Use absolute URL for Safari/iOS to avoid NotSupportedError
            const finalSrc = isSafari ? new URL(src, window.location.href).href : URL.createObjectURL(b);
            vid.src = finalSrc;
            vid.load();
        };

        /**
         * @returns {Promise<Response>}
         */
        const fetchBasic = () => {
            const bar = document.getElementById('progress-bar-video-love-stroy');
            const inf = document.getElementById('progress-info-video-love-stroy');

            return request(HTTP_GET, src).withNoBody().default({ 'Range': 'bytes=0-1' }).then((res) => {

                if (res.status === HTTP_STATUS_OK) {
                    vid.preload = 'none';
                    vid.src = util.escapeHtml(src);
                    wrap.appendChild(vid);

                    return Promise.resolve();
                }

                if (res.status !== HTTP_STATUS_PARTIAL_CONTENT) {
                    throw new Error('failed to fetch video');
                }

                vid.addEventListener('error', () => progress.invalid('video'));
                const loaded = new Promise((r) => vid.addEventListener('loadedmetadata', r, { once: true }));

                vid.src = util.escapeHtml(src);
                wrap.appendChild(vid);

                return loaded;
            }).then(() => {
                vid.pause();
                vid.currentTime = 0;
                progress.complete('video');

                const height = vid.getBoundingClientRect().width * (vid.videoHeight / vid.videoWidth);
                vid.style.height = `${height}px`;
                wrap.style.height = `${height}px`;

                return request(HTTP_GET, src).withRetry().withProgressFunc((a, b) => {
                    const result = Number((a / b) * 100).toFixed(0) + '%';

                    bar.style.width = result;
                    inf.innerText = result;
                }).default();
            }).then((res) => res.clone().blob().then((b) => {
                const loaded = new Promise((r) => vid.addEventListener('loadedmetadata', r, { once: true }));
                prepareVideo(b);
                vid.load();
                return loaded.then(() => res);
            })).catch((err) => {
                bar.style.backgroundColor = 'red';
                inf.innerText = `Error loading video`;
                console.error(err);
            });
        };

        return c.has(src).then((res) => {
            if (!res) {
                return c.del(src).then(fetchBasic).then((r) => c.set(src, r));
            }

            return res.blob().then((b) => {
                const loaded = new Promise((r) => vid.addEventListener('loadedmetadata', r, { once: true }));
                prepareVideo(b);
                wrap.appendChild(vid);
                return loaded.then(() => progress.complete('video'));
            });
        }).then(() => {
            observer.observe(vid);
            vid.style.removeProperty('height');
            wrap.style.removeProperty('height');
            document.getElementById('video-love-stroy-loading')?.remove();
        });
    };

    /**
     * @returns {object}
     */
    const init = () => {
        progress.add();
        c = cache('video').withForceCache();

        return {
            load,
        };
    };

    return {
        init,
    };
})();