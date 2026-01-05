/**
 * AdPixelsInjector Component
 * 
 * Inyecta dinámicamente los scripts de píxeles de tracking de las principales
 * plataformas publicitarias. Compatible con:
 * - Meta (Facebook/Instagram)
 * - Google Ads & Tag Manager
 * - Google Analytics 4
 * - TikTok
 * - Twitter/X
 * - LinkedIn
 * - Pinterest
 * - Snapchat
 * - Microsoft/Bing Ads
 * - Reddit
 * - Scripts personalizados
 */

import React, { useEffect } from 'react';
import { AdPixelConfig } from '../types';

interface AdPixelsInjectorProps {
    config: AdPixelConfig;
}

const AdPixelsInjector: React.FC<AdPixelsInjectorProps> = ({ config }) => {
    useEffect(() => {
        if (!config) return;

        const scripts: HTMLScriptElement[] = [];
        const noScripts: HTMLElement[] = [];

        // Helper para crear scripts inline
        const addScript = (content: string, id?: string) => {
            const script = document.createElement('script');
            script.innerHTML = content;
            script.async = true;
            if (id) script.id = id;
            document.head.appendChild(script);
            scripts.push(script);
        };

        // Helper para crear scripts externos
        const addExternalScript = (src: string, id?: string) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            if (id) script.id = id;
            document.head.appendChild(script);
            scripts.push(script);
        };

        // ========================================================================
        // FACEBOOK/META PIXEL
        // Documentación: https://developers.facebook.com/docs/meta-pixel
        // ========================================================================
        if (config.facebookPixelEnabled && config.facebookPixelId) {
            addScript(`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${config.facebookPixelId}');
                fbq('track', 'PageView');
            `, 'fb-pixel');
            
            // Noscript fallback para usuarios sin JS
            const noscript = document.createElement('noscript');
            noscript.id = 'fb-pixel-noscript';
            const img = document.createElement('img');
            img.height = 1;
            img.width = 1;
            img.style.display = 'none';
            img.src = `https://www.facebook.com/tr?id=${config.facebookPixelId}&ev=PageView&noscript=1`;
            img.alt = '';
            noscript.appendChild(img);
            document.body.appendChild(noscript);
            noScripts.push(noscript);
        }

        // ========================================================================
        // GOOGLE TAG MANAGER
        // Documentación: https://developers.google.com/tag-manager
        // ========================================================================
        if (config.googleTagManagerEnabled && config.googleTagManagerId) {
            addScript(`
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${config.googleTagManagerId}');
            `, 'gtm-script');
            
            // Noscript iframe para GTM
            const noscript = document.createElement('noscript');
            noscript.id = 'gtm-noscript';
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.googletagmanager.com/ns.html?id=${config.googleTagManagerId}`;
            iframe.height = '0';
            iframe.width = '0';
            iframe.style.display = 'none';
            iframe.style.visibility = 'hidden';
            noscript.appendChild(iframe);
            document.body.insertBefore(noscript, document.body.firstChild);
            noScripts.push(noscript);
        }

        // ========================================================================
        // GOOGLE ADS (gtag.js)
        // Documentación: https://developers.google.com/google-ads/api/docs/conversions
        // ========================================================================
        if (config.googleAdsEnabled && config.googleAdsId) {
            addExternalScript(
                `https://www.googletagmanager.com/gtag/js?id=${config.googleAdsId}`,
                'gads-script'
            );
            addScript(`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${config.googleAdsId}');
            `, 'gads-config');
        }

        // ========================================================================
        // GOOGLE ANALYTICS 4
        // Documentación: https://developers.google.com/analytics/devguides/collection/ga4
        // ========================================================================
        if (config.googleAnalyticsEnabled && config.googleAnalyticsId) {
            // Solo agregar gtag si no fue agregado por Google Ads
            if (!config.googleAdsEnabled || !config.googleAdsId) {
                addExternalScript(
                    `https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}`,
                    'ga4-script'
                );
                addScript(`
                    window.dataLayer = window.dataLayer || [];
                    function gtag(){dataLayer.push(arguments);}
                    gtag('js', new Date());
                `, 'ga4-init');
            }
            addScript(`
                gtag('config', '${config.googleAnalyticsId}');
            `, 'ga4-config');
        }

        // ========================================================================
        // TIKTOK PIXEL
        // Documentación: https://ads.tiktok.com/help/article/tiktok-pixel
        // ========================================================================
        if (config.tiktokPixelEnabled && config.tiktokPixelId) {
            addScript(`
                !function (w, d, t) {
                    w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                    ttq.load('${config.tiktokPixelId}');
                    ttq.page();
                }(window, document, 'ttq');
            `, 'tiktok-pixel');
        }

        // ========================================================================
        // TWITTER/X PIXEL
        // Documentación: https://business.twitter.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites.html
        // ========================================================================
        if (config.twitterPixelEnabled && config.twitterPixelId) {
            addScript(`
                !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
                },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
                a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
                twq('config','${config.twitterPixelId}');
            `, 'twitter-pixel');
        }

        // ========================================================================
        // LINKEDIN INSIGHT TAG
        // Documentación: https://www.linkedin.com/help/lms/answer/a418880
        // ========================================================================
        if (config.linkedinEnabled && config.linkedinPartnerId) {
            addScript(`
                _linkedin_partner_id = "${config.linkedinPartnerId}";
                window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
                window._linkedin_data_partner_ids.push(_linkedin_partner_id);
            `, 'linkedin-init');
            
            addScript(`
                (function(l) {
                if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                window.lintrk.q=[]}
                var s = document.getElementsByTagName("script")[0];
                var b = document.createElement("script");
                b.type = "text/javascript";b.async = true;
                b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                s.parentNode.insertBefore(b, s);})(window.lintrk);
            `, 'linkedin-script');
            
            // Noscript fallback
            const noscript = document.createElement('noscript');
            noscript.id = 'linkedin-noscript';
            const img = document.createElement('img');
            img.height = 1;
            img.width = 1;
            img.style.display = 'none';
            img.alt = '';
            img.src = `https://px.ads.linkedin.com/collect/?pid=${config.linkedinPartnerId}&fmt=gif`;
            noscript.appendChild(img);
            document.body.appendChild(noscript);
            noScripts.push(noscript);
        }

        // ========================================================================
        // PINTEREST TAG
        // Documentación: https://help.pinterest.com/en/business/article/install-the-pinterest-tag
        // ========================================================================
        if (config.pinterestEnabled && config.pinterestTagId) {
            addScript(`
                !function(e){if(!window.pintrk){window.pintrk = function () {
                window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
                n=window.pintrk;n.queue=[],n.version="3.0";var
                t=document.createElement("script");t.async=!0,t.src=e;var
                r=document.getElementsByTagName("script")[0];
                r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
                pintrk('load', '${config.pinterestTagId}');
                pintrk('page');
            `, 'pinterest-pixel');
            
            // Noscript fallback
            const noscript = document.createElement('noscript');
            noscript.id = 'pinterest-noscript';
            const img = document.createElement('img');
            img.height = 1;
            img.width = 1;
            img.style.display = 'none';
            img.alt = '';
            img.src = `https://ct.pinterest.com/v3/?event=init&tid=${config.pinterestTagId}&noscript=1`;
            noscript.appendChild(img);
            document.body.appendChild(noscript);
            noScripts.push(noscript);
        }

        // ========================================================================
        // SNAPCHAT PIXEL
        // Documentación: https://businesshelp.snapchat.com/s/article/snap-pixel-about
        // ========================================================================
        if (config.snapchatEnabled && config.snapchatPixelId) {
            addScript(`
                (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
                {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
                a.queue=[];var s='script';r=t.createElement(s);r.async=!0;
                r.src=n;var u=t.getElementsByTagName(s)[0];
                u.parentNode.insertBefore(r,u);})(window,document,
                'https://sc-static.net/scevent.min.js');
                snaptr('init', '${config.snapchatPixelId}', {});
                snaptr('track', 'PAGE_VIEW');
            `, 'snapchat-pixel');
        }

        // ========================================================================
        // MICROSOFT/BING UET TAG
        // Documentación: https://help.ads.microsoft.com/apex/index/3/en/56682
        // ========================================================================
        if (config.microsoftUetEnabled && config.microsoftUetId) {
            addScript(`
                (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${config.microsoftUetId}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");
            `, 'microsoft-uet');
        }

        // ========================================================================
        // REDDIT PIXEL
        // Documentación: https://ads.reddit.com/help
        // ========================================================================
        if (config.redditPixelEnabled && config.redditPixelId) {
            addScript(`
                !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
                rdt('init','${config.redditPixelId}');
                rdt('track', 'PageVisit');
            `, 'reddit-pixel');
        }

        // ========================================================================
        // CUSTOM SCRIPTS
        // Scripts personalizados para otras plataformas
        // ========================================================================
        if (config.customHeadScripts) {
            try {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = config.customHeadScripts;
                
                // Procesar scripts
                wrapper.querySelectorAll('script').forEach((s, index) => {
                    const script = document.createElement('script');
                    script.id = `custom-head-script-${index}`;
                    if (s.src) {
                        script.src = s.src;
                    } else {
                        script.innerHTML = s.innerHTML;
                    }
                    script.async = true;
                    document.head.appendChild(script);
                    scripts.push(script);
                });

                // Procesar otros elementos (como noscript, meta, etc.)
                wrapper.querySelectorAll('noscript').forEach((ns, index) => {
                    const noscript = document.createElement('noscript');
                    noscript.id = `custom-head-noscript-${index}`;
                    noscript.innerHTML = ns.innerHTML;
                    document.head.appendChild(noscript);
                    noScripts.push(noscript);
                });
            } catch (error) {
                console.error('[AdPixelsInjector] Error parsing custom head scripts:', error);
            }
        }

        if (config.customBodyScripts) {
            try {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = config.customBodyScripts;
                
                wrapper.querySelectorAll('script').forEach((s, index) => {
                    const script = document.createElement('script');
                    script.id = `custom-body-script-${index}`;
                    if (s.src) {
                        script.src = s.src;
                    } else {
                        script.innerHTML = s.innerHTML;
                    }
                    script.async = true;
                    document.body.appendChild(script);
                    scripts.push(script);
                });

                wrapper.querySelectorAll('noscript').forEach((ns, index) => {
                    const noscript = document.createElement('noscript');
                    noscript.id = `custom-body-noscript-${index}`;
                    noscript.innerHTML = ns.innerHTML;
                    document.body.appendChild(noscript);
                    noScripts.push(noscript);
                });
            } catch (error) {
                console.error('[AdPixelsInjector] Error parsing custom body scripts:', error);
            }
        }

        // Log de píxeles activos para debugging
        const activePixels = [];
        if (config.facebookPixelEnabled && config.facebookPixelId) activePixels.push('Meta Pixel');
        if (config.googleTagManagerEnabled && config.googleTagManagerId) activePixels.push('GTM');
        if (config.googleAdsEnabled && config.googleAdsId) activePixels.push('Google Ads');
        if (config.googleAnalyticsEnabled && config.googleAnalyticsId) activePixels.push('GA4');
        if (config.tiktokPixelEnabled && config.tiktokPixelId) activePixels.push('TikTok');
        if (config.twitterPixelEnabled && config.twitterPixelId) activePixels.push('Twitter/X');
        if (config.linkedinEnabled && config.linkedinPartnerId) activePixels.push('LinkedIn');
        if (config.pinterestEnabled && config.pinterestTagId) activePixels.push('Pinterest');
        if (config.snapchatEnabled && config.snapchatPixelId) activePixels.push('Snapchat');
        if (config.microsoftUetEnabled && config.microsoftUetId) activePixels.push('Microsoft Ads');
        if (config.redditPixelEnabled && config.redditPixelId) activePixels.push('Reddit');
        if (config.customHeadScripts || config.customBodyScripts) activePixels.push('Custom Scripts');

        if (activePixels.length > 0) {
            console.log('[AdPixelsInjector] Active tracking pixels:', activePixels.join(', '));
        }

        // Cleanup al desmontar el componente
        return () => {
            scripts.forEach(script => {
                try {
                    script.remove();
                } catch (e) {
                    // Script may have already been removed
                }
            });
            noScripts.forEach(el => {
                try {
                    el.remove();
                } catch (e) {
                    // Element may have already been removed
                }
            });
        };
    }, [config]);

    // Este componente no renderiza nada visible
    return null;
};

export default AdPixelsInjector;

