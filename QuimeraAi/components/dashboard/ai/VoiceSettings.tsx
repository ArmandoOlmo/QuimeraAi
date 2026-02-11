/**
 * VoiceSettings - ElevenLabs Voice Management Component
 * 
 * Three sections:
 * 1. Voice Provider Selector (Gemini vs ElevenLabs)
 * 2. ElevenLabs Voice Library (browse & select prebuilt voices)
 * 3. Voice Training / Cloning (upload audio to create custom voice)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../../../contexts/project/ProjectContext';
import { useAuth } from '../../../contexts/core/AuthContext';
import {
    Mic, Radio, Upload, Trash2, Play, Pause, Square, Loader2,
    Volume2, Plus, AlertCircle, CheckCircle, Sparkles, AudioLines
} from 'lucide-react';
import {
    listElevenLabsVoices,
    cloneVoice,
    deleteClonedVoice,
    previewVoice,
    type ElevenLabsVoice,
} from '../../../utils/voiceProxyClient';
import { AiAssistantConfig } from '../../../types';

interface VoiceSettingsProps {
    formData: AiAssistantConfig;
    updateForm: (key: keyof AiAssistantConfig, value: any) => void;
}

// Gemini prebuilt voices
const geminiVoices: { name: AiAssistantConfig['voiceName']; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calm, balanced, professional.', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, friendly, youthful.', gender: 'Male' },
    { name: 'Charon', description: 'Deep, authoritative, trustworthy.', gender: 'Male' },
    { name: 'Kore', description: 'Warm, nurturing, soft.', gender: 'Female' },
    { name: 'Fenrir', description: 'Strong, clear, direct.', gender: 'Male' },
];

const VoiceSettings: React.FC<VoiceSettingsProps> = ({ formData, updateForm }) => {
    const { t } = useTranslation();
    const { activeProject } = useProject();
    const { user } = useAuth();

    // State
    const [voiceProvider, setVoiceProvider] = useState<'gemini' | 'elevenlabs'>(formData.voiceProvider || 'gemini');
    const [elevenlabsVoices, setElevenlabsVoices] = useState<ElevenLabsVoice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(false);
    const [voiceError, setVoiceError] = useState<string | null>(null);

    // Voice cloning state
    const [cloneName, setCloneName] = useState('');
    const [cloneDescription, setCloneDescription] = useState('');
    const [isCloning, setIsCloning] = useState(false);
    const [cloneError, setCloneError] = useState<string | null>(null);
    const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingTimerRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // Audio preview
    const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Gender filter for Gemini voices
    const [genderFilter, setGenderFilter] = useState<'all' | 'Male' | 'Female'>('all');

    // Deleting state
    const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null);

    // Load ElevenLabs voices when switching to that provider
    useEffect(() => {
        if (voiceProvider === 'elevenlabs') {
            loadElevenLabsVoices();
        }
    }, [voiceProvider]);

    const loadElevenLabsVoices = async () => {
        setIsLoadingVoices(true);
        setVoiceError(null);
        try {
            const voices = await listElevenLabsVoices();
            setElevenlabsVoices(voices);
        } catch (error: any) {
            console.error('Failed to load ElevenLabs voices:', error);
            setVoiceError(error.message || 'Error al cargar voces de ElevenLabs');
        } finally {
            setIsLoadingVoices(false);
        }
    };

    // Handle provider change
    const handleProviderChange = (provider: 'gemini' | 'elevenlabs') => {
        setVoiceProvider(provider);
        updateForm('voiceProvider', provider);
    };

    // Handle ElevenLabs voice selection
    const handleSelectElevenLabsVoice = (voice: ElevenLabsVoice) => {
        updateForm('elevenlabsVoiceId', voice.voice_id);
        updateForm('elevenlabsVoiceName', voice.name);
    };

    // Audio Preview
    const handlePreview = async (voiceId: string) => {
        // Stop any current preview
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (previewingVoiceId === voiceId && isPreviewPlaying) {
            setIsPreviewPlaying(false);
            setPreviewingVoiceId(null);
            return;
        }

        setPreviewingVoiceId(voiceId);
        setIsPreviewPlaying(true);

        try {
            const result = await previewVoice(voiceId);
            const audio = new Audio(`data:${result.mimeType};base64,${result.audio}`);
            audioRef.current = audio;
            audio.onended = () => {
                setIsPreviewPlaying(false);
                setPreviewingVoiceId(null);
            };
            audio.play();
        } catch (error) {
            console.error('Preview failed:', error);
            setIsPreviewPlaying(false);
            setPreviewingVoiceId(null);
        }
    };

    // Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setRecordedBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000);
            setIsRecording(true);
            setRecordingTime(0);
            setRecordedBlob(null);
            setAudioFile(null);

            recordingTimerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Failed to start recording:', error);
            setCloneError('No se pudo acceder al micrófono. Verifica los permisos.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    // File upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            setRecordedBlob(null);
        }
    };

    // Convert file/blob to base64
    const toBase64 = (input: File | Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove the data:...;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(input);
        });
    };

    // Clone voice
    const handleCloneVoice = async () => {
        const audioSource = audioFile || recordedBlob;
        if (!audioSource || !cloneName.trim()) {
            setCloneError('Se requiere un nombre y una muestra de audio.');
            return;
        }

        if (!activeProject?.id) {
            setCloneError('No hay un proyecto activo seleccionado.');
            return;
        }

        setIsCloning(true);
        setCloneError(null);
        setCloneSuccess(null);

        try {
            const audioBase64 = await toBase64(audioSource);
            const fileName = audioFile?.name || 'recording.webm';
            const mimeType = audioFile?.type || 'audio/webm';

            const result = await cloneVoice(cloneName.trim(), audioBase64, activeProject.id, {
                description: cloneDescription.trim(),
                audioFileName: fileName,
                audioMimeType: mimeType,
                userId: user?.uid || '',
            });

            setCloneSuccess(`¡Voz "${result.name}" creada exitosamente!`);
            setCloneName('');
            setCloneDescription('');
            setAudioFile(null);
            setRecordedBlob(null);

            // Select the new voice
            updateForm('elevenlabsVoiceId', result.voice_id);
            updateForm('elevenlabsVoiceName', result.name);
            updateForm('voiceProvider', 'elevenlabs');

            // Reload voices
            await loadElevenLabsVoices();
        } catch (error: any) {
            console.error('Clone failed:', error);
            setCloneError(error.message || 'Error al clonar la voz');
        } finally {
            setIsCloning(false);
        }
    };

    // Delete voice
    const handleDeleteVoice = async (voiceId: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta voz clonada?')) return;

        setDeletingVoiceId(voiceId);
        try {
            await deleteClonedVoice(voiceId, activeProject?.id);

            // If this was the selected voice, clear it
            if (formData.elevenlabsVoiceId === voiceId) {
                updateForm('elevenlabsVoiceId', '');
                updateForm('elevenlabsVoiceName', '');
            }

            // Reload
            await loadElevenLabsVoices();
        } catch (error: any) {
            console.error('Delete failed:', error);
            setVoiceError(error.message || 'Error al eliminar la voz');
        } finally {
            setDeletingVoiceId(null);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const filteredGeminiVoices = genderFilter === 'all'
        ? geminiVoices
        : geminiVoices.filter(v => v.gender === genderFilter);

    const clonedVoices = elevenlabsVoices.filter(v => v.category === 'cloned');
    const premadeVoices = elevenlabsVoices.filter(v => v.category === 'premade' || v.category === 'generated');

    return (
        <div className="space-y-6 animate-fade-in-up">

            {/* Section 1: Live Voice Toggle */}
            <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Mic className="text-primary" size={20} />
                        {t('aiAssistant.dashboard.enableLiveVoice')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t('aiAssistant.dashboard.enableLiveVoiceDesc')}</p>
                </div>
                <button
                    onClick={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableLiveVoice ? 'bg-primary' : 'bg-secondary'}`}
                >
                    <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.enableLiveVoice ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>

            {/* Section 2: Voice Provider Selector */}
            <div className="bg-card border border-border p-6 rounded-xl">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <AudioLines className="text-primary" size={20} />
                    Proveedor de Voz
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleProviderChange('gemini')}
                        className={`p-4 rounded-xl border transition-all text-left ${voiceProvider === 'gemini'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${voiceProvider === 'gemini' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold">Google Gemini</h4>
                                <span className="text-xs text-green-500 font-medium">Incluido</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">5 voces preintegradas, baja latencia, ideal para conversaciones en tiempo real.</p>
                    </button>

                    <button
                        onClick={() => handleProviderChange('elevenlabs')}
                        className={`p-4 rounded-xl border transition-all text-left ${voiceProvider === 'elevenlabs'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:border-primary/50'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${voiceProvider === 'elevenlabs' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                <Volume2 size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold">ElevenLabs</h4>
                                <span className="text-xs text-amber-500 font-medium">Premium</span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Voces ultra-realistas, clonación de voz, ideal para una experiencia de marca única.</p>
                    </button>
                </div>
            </div>

            {/* Section 3A: Gemini Voices (when provider is Gemini) */}
            {voiceProvider === 'gemini' && (
                <div className="bg-card border border-border p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Radio className="text-primary" size={18} />
                            {t('aiAssistant.dashboard.selectVoice')}
                        </label>
                        <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg">
                            {(['all', 'Male', 'Female'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setGenderFilter(filter)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${genderFilter === filter
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    {filter === 'all' ? 'Todos' : filter === 'Male' ? '♂ Masculino' : '♀ Femenino'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredGeminiVoices.map(v => (
                            <button
                                key={v.name}
                                onClick={() => updateForm('voiceName', v.name)}
                                className={`p-4 rounded-xl border text-left transition-all hover:shadow-md flex items-center ${formData.voiceName === v.name ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-secondary/10 hover:border-primary/50'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${formData.voiceName === v.name ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                    {v.gender === 'Male' ? '♂' : '♀'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-foreground">{v.name}</h4>
                                    <p className="text-xs text-muted-foreground">{v.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 3B: ElevenLabs Voices (when provider is ElevenLabs) */}
            {voiceProvider === 'elevenlabs' && (
                <>
                    {/* ElevenLabs TTS Toggle */}
                    <div className="bg-card border border-border p-6 rounded-xl flex items-center justify-between">
                        <div>
                            <h3 className="font-bold flex items-center gap-2">
                                <Volume2 size={18} className="text-primary" />
                                Auto-reproducir respuestas con voz
                            </h3>
                            <p className="text-sm text-muted-foreground">Las respuestas del bot se convertirán a audio automáticamente.</p>
                        </div>
                        <button
                            onClick={() => updateForm('enableElevenLabsTTS', !formData.enableElevenLabsTTS)}
                            className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableElevenLabsTTS ? 'bg-primary' : 'bg-secondary'}`}
                        >
                            <span className={`shrink-0 inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.enableElevenLabsTTS ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Error state */}
                    {voiceError && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle size={16} />
                            {voiceError}
                        </div>
                    )}

                    {/* Loading state */}
                    {isLoadingVoices && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-primary" size={24} />
                            <span className="ml-2 text-muted-foreground">Cargando voces de ElevenLabs...</span>
                        </div>
                    )}

                    {/* Cloned Voices */}
                    {!isLoadingVoices && clonedVoices.length > 0 && (
                        <div className="bg-card border border-border p-6 rounded-xl">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Mic className="text-primary" size={18} />
                                Voces Clonadas
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{clonedVoices.length}</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {clonedVoices.map(voice => (
                                    <div
                                        key={voice.voice_id}
                                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${formData.elevenlabsVoiceId === voice.voice_id
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        <button
                                            onClick={() => handleSelectElevenLabsVoice(voice)}
                                            className="flex items-center gap-3 flex-1 text-left"
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${formData.elevenlabsVoiceId === voice.voice_id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                                <Mic size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-sm truncate">{voice.name}</h4>
                                                <p className="text-xs text-muted-foreground truncate">{voice.description || 'Voz clonada'}</p>
                                            </div>
                                        </button>
                                        <div className="flex items-center gap-1 ml-2 shrink-0">
                                            <button
                                                onClick={() => handlePreview(voice.voice_id)}
                                                className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                                title="Vista previa"
                                            >
                                                {previewingVoiceId === voice.voice_id && isPreviewPlaying ? (
                                                    <Pause size={14} />
                                                ) : (
                                                    <Play size={14} />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteVoice(voice.voice_id)}
                                                disabled={deletingVoiceId === voice.voice_id}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                                title="Eliminar voz"
                                            >
                                                {deletingVoiceId === voice.voice_id ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={14} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Premade Voices Library */}
                    {!isLoadingVoices && premadeVoices.length > 0 && (
                        <div className="bg-card border border-border p-6 rounded-xl">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <Radio className="text-primary" size={18} />
                                Biblioteca de Voces
                                <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">{premadeVoices.length}</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                                {premadeVoices.slice(0, 20).map(voice => (
                                    <div
                                        key={voice.voice_id}
                                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${formData.elevenlabsVoiceId === voice.voice_id
                                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                            : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        <button
                                            onClick={() => handleSelectElevenLabsVoice(voice)}
                                            className="flex items-center gap-3 flex-1 text-left"
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${formData.elevenlabsVoiceId === voice.voice_id ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                                {voice.labels?.gender === 'male' ? '♂' : voice.labels?.gender === 'female' ? '♀' : '◉'}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-semibold text-sm truncate">{voice.name}</h4>
                                                <div className="flex items-center gap-2">
                                                    {voice.labels?.accent && <span className="text-[10px] text-muted-foreground">{voice.labels.accent}</span>}
                                                    {voice.labels?.use_case && <span className="text-[10px] text-muted-foreground">• {voice.labels.use_case}</span>}
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => handlePreview(voice.voice_id)}
                                            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                            title="Vista previa"
                                        >
                                            {previewingVoiceId === voice.voice_id && isPreviewPlaying ? (
                                                <Pause size={14} />
                                            ) : (
                                                <Play size={14} />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {premadeVoices.length > 20 && (
                                <p className="text-xs text-muted-foreground text-center mt-3">
                                    Mostrando 20 de {premadeVoices.length} voces
                                </p>
                            )}
                        </div>
                    )}

                    {/* Section 4: Voice Training / Cloning */}
                    <div className="bg-gradient-to-br from-card via-card to-primary/5 border border-border p-6 rounded-xl">
                        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                            <Plus className="text-primary" size={20} />
                            Entrenar Voz Personalizada
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Crea una copia de voz única para tu marca. Graba o sube al menos 1 minuto de audio claro.
                        </p>

                        {/* Success message */}
                        {cloneSuccess && (
                            <div className="flex items-center gap-2 p-4 mb-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
                                <CheckCircle size={16} />
                                {cloneSuccess}
                            </div>
                        )}

                        {/* Clone error */}
                        {cloneError && (
                            <div className="flex items-center gap-2 p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                <AlertCircle size={16} />
                                {cloneError}
                            </div>
                        )}

                        {/* Voice Name & Description */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">Nombre de la voz *</label>
                                <input
                                    type="text"
                                    value={cloneName}
                                    onChange={(e) => setCloneName(e.target.value)}
                                    placeholder="Ej: Voz de María"
                                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground mb-1 block">Descripción (opcional)</label>
                                <input
                                    type="text"
                                    value={cloneDescription}
                                    onChange={(e) => setCloneDescription(e.target.value)}
                                    placeholder="Ej: Voz femenina, cálida, profesional"
                                    className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                                />
                            </div>
                        </div>

                        {/* Audio Source: Record or Upload */}
                        <div className="border border-dashed border-border rounded-xl p-6 mb-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Record Button */}
                                <div className="flex-1 w-full">
                                    {!isRecording ? (
                                        <button
                                            onClick={startRecording}
                                            disabled={isCloning}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-medium transition-all"
                                        >
                                            <Mic size={18} />
                                            Grabar Audio
                                        </button>
                                    ) : (
                                        <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-sm font-mono text-red-400">{formatTime(recordingTime)}</span>
                                            </div>
                                            <button
                                                onClick={stopRecording}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                                            >
                                                <Square size={12} fill="currentColor" />
                                                Detener
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <span className="text-sm text-muted-foreground font-medium">o</span>

                                {/* Upload Button */}
                                <div className="flex-1 w-full">
                                    <label className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary/50 hover:bg-secondary border border-border text-foreground font-medium cursor-pointer transition-all">
                                        <Upload size={18} />
                                        Subir Archivo
                                        <input
                                            type="file"
                                            accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a,audio/webm"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            disabled={isCloning}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Audio Source Indicator */}
                            {(recordedBlob || audioFile) && (
                                <div className="mt-4 flex items-center gap-2 p-3 bg-green-500/10 rounded-xl border border-green-500/30 text-green-400 text-sm">
                                    <CheckCircle size={14} />
                                    {audioFile ? (
                                        <span>Archivo: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                                    ) : (
                                        <span>Grabación: {formatTime(recordingTime)}</span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Clone Button */}
                        <button
                            onClick={handleCloneVoice}
                            disabled={isCloning || (!audioFile && !recordedBlob) || !cloneName.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCloning ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Creando voz...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Clonar Voz
                                </>
                            )}
                        </button>

                        <p className="text-xs text-muted-foreground mt-3 text-center">
                            💡 Para mejores resultados, usa audio claro sin ruido de fondo. Mínimo 1 minuto recomendado.
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default VoiceSettings;
