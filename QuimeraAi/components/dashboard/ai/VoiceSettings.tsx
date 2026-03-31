/**
 * VoiceSettings - Voice Configuration Component
 * 
 * Configures the AI assistant's voice:
 * - Toggle live voice (allows users to speak with the assistant)
 * - Select from Gemini prebuilt voices
 * - Gemini 3.1 Flash Live capabilities (affective dialog, unlimited sessions, auto-reconnect)
 */

import React from 'react';
import { Volume2, Mic, Check, Zap, Infinity, RefreshCw, Heart } from 'lucide-react';
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

                {/* Model Badge */}
                {formData.enableLiveVoice && (
                    <div className="mt-4 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Zap size={12} />
                            Powered by Quimera AI Voice
                        </span>
                    </div>
                )}
            </div>

            {/* Gemini 3.1 Flash Live Advanced Options */}
            {formData.enableLiveVoice && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-bold text-foreground text-lg flex items-center gap-2 mb-2">
                        <Zap size={20} className="text-primary" />
                        Capacidades Avanzadas
                    </h3>
                    <p className="text-muted-foreground text-sm mb-5">
                        Funcionalidades avanzadas de voz para una experiencia superior.
                    </p>

                    <div className="space-y-4">
                        {/* Affective Dialog */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Heart size={18} className="text-pink-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground text-sm">Diálogo Empático</h4>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                        El asistente detecta emoción y tono del usuario, adaptando sus respuestas. Ideal para soporte al cliente.
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                                <input
                                    type="checkbox"
                                    checked={formData.enableAffectiveDialog !== false}
                                    onChange={() => updateForm('enableAffectiveDialog', !(formData.enableAffectiveDialog !== false))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        {/* Unlimited Sessions */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Infinity size={18} className="text-emerald-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground text-sm">Sesiones Ilimitadas</h4>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                        Elimina el límite de 15 minutos permitiendo conversaciones de voz de cualquier duración.
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                                <input
                                    type="checkbox"
                                    checked={formData.enableUnlimitedSessions !== false}
                                    onChange={() => updateForm('enableUnlimitedSessions', !(formData.enableUnlimitedSessions !== false))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        {/* Auto-Reconnect */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <RefreshCw size={18} className="text-amber-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-foreground text-sm">Reconexión Automática</h4>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                        Si la conexión se interrumpe, la sesión se reanuda automáticamente sin perder el contexto.
                                    </p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                                <input
                                    type="checkbox"
                                    checked={formData.enableAutoReconnect !== false}
                                    onChange={() => updateForm('enableAutoReconnect', !(formData.enableAutoReconnect !== false))}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

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
                        <span><strong>Idioma automático:</strong> Detecta y responde en el idioma del usuario automáticamente.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Interrupciones (Barge-in):</strong> Los usuarios pueden interrumpir al asistente a mitad de respuesta para una interacción natural.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span><strong>Audio SynthID:</strong> Todas las respuestas de audio están firmadas digitalmente para seguridad.</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default VoiceSettings;
