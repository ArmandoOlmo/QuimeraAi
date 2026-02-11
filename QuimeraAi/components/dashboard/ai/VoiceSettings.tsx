/**
 * VoiceSettings - Voice Configuration Component
 * 
 * Configures the AI assistant's voice:
 * - Toggle live voice (allows users to speak with the assistant)
 * - Select from Gemini prebuilt voices
 */

import React from 'react';
import { Volume2, Mic, Check } from 'lucide-react';
import { AiAssistantConfig } from '../../../types';

interface VoiceSettingsProps {
    formData: AiAssistantConfig;
    updateForm: (key: keyof AiAssistantConfig, value: any) => void;
}

const VOICES: { name: AiAssistantConfig['voiceName']; emoji: string; description: string; gender: string }[] = [
    { name: 'Zephyr', emoji: '🌬️', description: 'Serena, equilibrada, profesional.', gender: 'Femenina' },
    { name: 'Puck', emoji: '⚡', description: 'Enérgica, amigable, juguetona.', gender: 'Masculina' },
    { name: 'Charon', emoji: '🎭', description: 'Profunda, autoritativa, confiable.', gender: 'Masculina' },
    { name: 'Kore', emoji: '🌸', description: 'Cálida, acogedora, suave.', gender: 'Femenina' },
    { name: 'Fenrir', emoji: '🐺', description: 'Fuerte, clara, directa.', gender: 'Masculina' },
];

function VoiceSettings({ formData, updateForm }: VoiceSettingsProps) {
    return (
        <div className="space-y-6">
            {/* Live Voice Toggle */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                            <Mic size={20} className="text-primary" />
                            Habilitar Voz en Vivo
                        </h3>
                        <p className="text-muted-foreground text-sm mt-1">
                            Permite a los usuarios hablar con tu asistente en tiempo real usando el micrófono.
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.enableLiveVoice}
                            onChange={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>

            {/* Voice Selection */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-bold text-foreground text-lg flex items-center gap-2 mb-4">
                    <Volume2 size={20} className="text-primary" />
                    Voz del Asistente
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                    Selecciona la voz que usará tu asistente en las conversaciones de voz.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {VOICES.map(voice => {
                        const isSelected = formData.voiceName === voice.name;
                        return (
                            <button
                                key={voice.name}
                                type="button"
                                onClick={() => updateForm('voiceName', voice.name)}
                                className={`relative p-4 rounded-xl border text-left transition-all ${isSelected
                                        ? 'bg-primary/10 border-primary shadow-md ring-2 ring-primary/30'
                                        : 'bg-background border-border hover:border-primary/50 hover:bg-primary/5'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <Check size={12} className="text-primary-foreground" />
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{voice.emoji}</span>
                                    <span className="font-semibold text-foreground">{voice.name}</span>
                                </div>
                                <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mb-1">
                                    {voice.gender}
                                </span>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {voice.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-5">
                <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                    <Mic size={18} />
                    Cómo Funciona la Voz
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Botón de micrófono:</strong> Los usuarios pueden hablar y escuchar respuestas en tiempo real.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Voz seleccionada:</strong> Se usa tanto para la sesión de voz en vivo como para cualquier respuesta hablada.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Idioma automático:</strong> Gemini detecta y responde en el idioma del usuario automáticamente.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default VoiceSettings;
