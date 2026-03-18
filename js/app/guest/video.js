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
        vid.muted = true;
        vid.controls = true;
        vid.autoplay = false;
        vid.playsInline = true;
        vid.setAttribute('playsinline', '');
        vid.setAttribute('webkit-playsinline', '');
        vid.preload = 'metadata';

        // Add poster immediately if available
        if (wrap.hasAttribute('data-poster')) {
            vid.poster = wrap.getAttribute('data-poster');
        }

        wrap.appendChild(vid);

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const promise = vid.play();
                    if (promise !== undefined) {
                        promise.catch(() => {
                            vid.muted = true;
                            vid.play().catch(() => {});
                        });
                    }
                } else {
                    vid.pause();
                }
            });
        }, { threshold: 0.2 });

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

        document.addEventListener('undangan.open', () => {
            isPriming = true;
            vid.muted = false;
            
            vid.play().then(() => {
                vid.pause();
                isPriming = false;
            }).catch(() => {
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
            
            const finalSrc = isSafari ? new URL(src, window.location.href).href : URL.createObjectURL(b);
            vid.src = finalSrc;
        };

        /**
         * @returns {Promise<Response>}
         */
        const fetchBasic = () => {
            const bar = document.getElementById('progress-bar-video-love-stroy');
            const inf = document.getElementById('progress-info-video-love-stroy');

            // Progressive loading start
            vid.src = src; 
            vid.load();

            return request(HTTP_GET, src).withRetry().withProgressFunc((a, b) => {
                const result = Number((a / b) * 100).toFixed(0) + '%';
                if (bar) bar.style.width = result;
                if (inf) inf.innerText = result;
            }).default().then((res) => {
                return res.clone().blob().then((b) => {
                    const currentTime = vid.currentTime;
                    const wasPlaying = !vid.paused;
                    
                    prepareVideo(b);
                    vid.currentTime = currentTime;
                    if (wasPlaying) vid.play().catch(() => {});
                    
                    progress.complete('video');
                    return res;
                });
            }).catch((err) => {
                if (bar) bar.style.backgroundColor = 'red';
                if (inf) inf.innerText = `Error loading video`;
                console.error(err);
            });
        };

        return c.has(src).then((res) => {
            if (!res) {
                return fetchBasic().then((r) => r ? c.set(src, r) : Promise.resolve());
            }

            return res.blob().then((b) => {
                prepareVideo(b);
                progress.complete('video');
            });
        }).then(() => {
            observer.observe(vid);
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