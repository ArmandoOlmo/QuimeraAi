import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VideoFrameType } from '../../../types/videoGeneration';

interface FrameSlot {
    type: VideoFrameType;
    url: string | null;
}

interface FrameImagePickerProps {
    startFrame: string | null;
    endFrame: string | null;
    onStartFrameChange: (url: string | null) => void;
    onEndFrameChange: (url: string | null) => void;
    supportsEndFrame?: boolean;
    sessionImages?: string[];
    onPickFromSession?: (url: string, type: VideoFrameType) => void;
}

const FrameImagePicker: React.FC<FrameImagePickerProps> = ({
    startFrame,
    endFrame,
    onStartFrameChange,
    onEndFrameChange,
    supportsEndFrame = true,
    sessionImages = [],
    onPickFromSession,
}) => {
    const { t } = useTranslation();
    const startInputRef = useRef<HTMLInputElement>(null);
    const endInputRef = useRef<HTMLInputElement>(null);
    const [draggingSlot, setDraggingSlot] = useState<VideoFrameType | null>(null);

    const readFile = (file: File, setter: (url: string | null) => void) => {
        const reader = new FileReader();
        reader.onload = () => setter(reader.result as string);
        reader.readAsDataURL(file);
    };

    const slots: FrameSlot[] = [
        { type: 'first_frame', url: startFrame },
        ...(supportsEndFrame ? [{ type: 'last_frame' as VideoFrameType, url: endFrame }] : []),
    ];

    const setFrame = (type: VideoFrameType, url: string | null) => {
        if (type === 'first_frame') onStartFrameChange(url);
        else onEndFrameChange(url);
    };

    const extractDroppedImageUrl = (transfer: DataTransfer): string | null => {
        const candidates = [
            transfer.getData('application/x-library-image-base64'),
            transfer.getData('application/x-library-image'),
            transfer.getData('text/uri-list'),
            transfer.getData('text/plain'),
        ];

        return candidates.find(value => {
            const normalized = value?.trim();
            return normalized && (normalized.startsWith('data:image/') || /^https?:\/\//.test(normalized));
        })?.trim() || null;
    };

    const handleFrameDragOver = (e: React.DragEvent, type: VideoFrameType) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDraggingSlot(type);
    };

    const handleFrameDragLeave = (e: React.DragEvent, type: VideoFrameType) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setDraggingSlot(prev => (prev === type ? null : prev));
        }
    };

    const handleFrameDrop = (e: React.DragEvent, type: VideoFrameType) => {
        e.preventDefault();
        setDraggingSlot(null);

        const droppedUrl = extractDroppedImageUrl(e.dataTransfer);
        if (droppedUrl) {
            setFrame(type, droppedUrl);
            return;
        }

        const file = Array.from(e.dataTransfer.files || []).find(item => item.type.startsWith('image/'));
        if (file) {
            readFile(file, url => setFrame(type, url));
        }
    };

    const handleSessionImageDragStart = (e: React.DragEvent, url: string) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/x-library-image', url);
        e.dataTransfer.setData('text/uri-list', url);
        e.dataTransfer.setData('text/plain', url);
    };

    return (
        <div className="space-y-3">
            <label className="text-xs font-bold text-q-text-secondary uppercase tracking-wide">
                {t('mediaGeneration.frameImages', { defaultValue: 'Frame images' })}
            </label>
            <div className="grid grid-cols-2 gap-3">
                {slots.map(slot => (
                    <div key={slot.type} className="space-y-1.5">
                        <span className="text-[10px] font-medium text-q-text-secondary uppercase">
                            {slot.type === 'first_frame'
                                ? t('mediaGeneration.startFrame', { defaultValue: 'Start frame' })
                                : t('mediaGeneration.endFrame', { defaultValue: 'End frame' })}
                        </span>
                        {slot.url ? (
                            <div
                                className={`relative aspect-video rounded-lg overflow-hidden border group transition-colors ${
                                    draggingSlot === slot.type ? 'border-q-accent ring-2 ring-q-accent/30' : 'border-q-border'
                                }`}
                                onDragOver={(e) => handleFrameDragOver(e, slot.type)}
                                onDragLeave={(e) => handleFrameDragLeave(e, slot.type)}
                                onDrop={(e) => handleFrameDrop(e, slot.type)}
                            >
                                <img src={slot.url} alt="" className="w-full h-full object-cover" />
                                {draggingSlot === slot.type && (
                                    <div className="absolute inset-0 grid place-items-center bg-black/55 text-[10px] font-bold uppercase text-white">
                                        {t('mediaGeneration.dropFrame', { defaultValue: 'Drop to replace' })}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setFrame(slot.type, null)}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => (slot.type === 'first_frame' ? startInputRef : endInputRef).current?.click()}
                                onDragOver={(e) => handleFrameDragOver(e, slot.type)}
                                onDragLeave={(e) => handleFrameDragLeave(e, slot.type)}
                                onDrop={(e) => handleFrameDrop(e, slot.type)}
                                className={`w-full aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                                    draggingSlot === slot.type
                                        ? 'border-q-accent bg-q-accent/10 text-q-accent'
                                        : 'border-q-border text-q-text-secondary hover:border-q-accent/50 hover:text-q-accent'
                                }`}
                            >
                                <Upload size={16} />
                                <span className="text-[10px]">
                                    {draggingSlot === slot.type
                                        ? t('mediaGeneration.dropFrame', { defaultValue: 'Drop image' })
                                        : t('mediaGeneration.uploadFrame', { defaultValue: 'Upload' })}
                                </span>
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <input
                ref={startInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readFile(file, onStartFrameChange);
                    e.target.value = '';
                }}
            />
            {supportsEndFrame && (
                <input
                    ref={endInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) readFile(file, onEndFrameChange);
                        e.target.value = '';
                    }}
                />
            )}

            {sessionImages.length > 0 && (
                <div className="space-y-1.5">
                    <span className="text-[10px] font-medium text-q-text-secondary uppercase">
                        {t('mediaGeneration.recentGenerations', { defaultValue: 'Recent generations' })}
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {sessionImages.slice(0, 8).map((url, i) => (
                            <div
                                key={`${url}-${i}`}
                                draggable
                                onDragStart={(e) => handleSessionImageDragStart(e, url)}
                                className="group relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-q-border"
                            >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => onPickFromSession?.(url, 'first_frame')}
                                        className="flex-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white"
                                        title={t('mediaGeneration.useAsStartFrame', { defaultValue: 'Use as start frame' })}
                                    >
                                        {t('mediaGeneration.startShort', { defaultValue: 'Start' })}
                                    </button>
                                    {supportsEndFrame && (
                                        <button
                                            type="button"
                                            onClick={() => onPickFromSession?.(url, 'last_frame')}
                                            className="flex-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white"
                                            title={t('mediaGeneration.useAsEndFrame', { defaultValue: 'Use as end frame' })}
                                        >
                                            {t('mediaGeneration.endShort', { defaultValue: 'End' })}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FrameImagePicker;
