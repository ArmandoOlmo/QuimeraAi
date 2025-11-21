
import React from 'react';
import { VideoData, PaddingSize, BorderRadiusSize, FontSize } from '../types';

const paddingYClasses: Record<PaddingSize, string> = {
  sm: 'py-10 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-20 md:py-32',
};

const paddingXClasses: Record<PaddingSize, string> = {
  sm: 'px-4',
  md: 'px-6',
  lg: 'px-8',
};

const titleSizeClasses: Record<FontSize, string> = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
    xl: 'text-5xl md:text-7xl',
};

const descriptionSizeClasses: Record<FontSize, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
};

const borderRadiusClasses: Record<BorderRadiusSize, string> = {
  none: 'rounded-none',
  md: 'rounded-md',
  xl: 'rounded-xl',
  full: 'rounded-full',
};

interface VideoProps extends VideoData {
    borderRadius: BorderRadiusSize;
}

const Video: React.FC<VideoProps> = ({ 
    title, description, source, videoId, videoUrl, autoplay, loop, showControls,
    paddingY, paddingX, colors, borderRadius, titleFontSize = 'md', descriptionFontSize = 'md'
}) => {

    let videoPlayer: React.ReactNode;

    const commonIframeProps = {
        className: `absolute top-0 left-0 w-full h-full ${borderRadiusClasses[borderRadius]}`,
        frameBorder: "0",
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        allowFullScreen: true,
    };

    if (source === 'youtube' && videoId) {
        const params = new URLSearchParams({
            autoplay: autoplay ? '1' : '0',
            loop: loop ? '1' : '0',
            controls: showControls ? '1' : '0',
            playlist: loop ? videoId : '', // YouTube requires playlist param for loop
            mute: autoplay ? '1' : '0',
        }).toString();
        videoPlayer = (
            <iframe
                src={`https://www.youtube.com/embed/${videoId}?${params}`}
                title="YouTube video player"
                {...commonIframeProps}
            />
        );
    } else if (source === 'vimeo' && videoId) {
        const params = new URLSearchParams({
            autoplay: autoplay ? '1' : '0',
            loop: loop ? '1' : '0',
            controls: showControls ? '1' : '0',
            muted: autoplay ? '1' : '0',
        }).toString();
        videoPlayer = (
            <iframe
                src={`https://player.vimeo.com/video/${videoId}?${params}`}
                title="Vimeo video player"
                {...commonIframeProps}
            />
        );
    } else if (source === 'upload' && videoUrl) {
        videoPlayer = (
            <video
                src={videoUrl}
                autoPlay={autoplay}
                loop={loop}
                controls={showControls}
                muted={autoplay} // Mute is required for autoplay in most browsers
                playsInline
                className={`w-full h-full object-cover ${borderRadiusClasses[borderRadius]}`}
            />
        );
    } else {
        videoPlayer = (
            <div className={`w-full h-full bg-dark-700 flex items-center justify-center text-slate-400 ${borderRadiusClasses[borderRadius]}`}>
                <p>Please configure the video source in the editor.</p>
            </div>
        );
    }

    return (
        <section id="video" className={`container mx-auto ${paddingYClasses[paddingY]} ${paddingXClasses[paddingX]}`} style={{ backgroundColor: colors.background }}>
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className={`${titleSizeClasses[titleFontSize]} font-extrabold text-site-heading mb-4 font-header`} style={{ color: colors.heading }}>{title}</h2>
                <p className={`${descriptionSizeClasses[descriptionFontSize]} font-body`} style={{ color: colors.text }}>
                    {description}
                </p>
            </div>
            <div className={`relative aspect-video w-full max-w-4xl mx-auto shadow-2xl ${borderRadiusClasses[borderRadius]}`}>
                {videoPlayer}
            </div>
        </section>
    );
};

export default Video;
