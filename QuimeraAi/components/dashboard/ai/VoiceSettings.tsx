/**
 * VoiceSettings - Voice Configuration Component
 * 
 * Allows selecting from Gemini prebuilt voices for the AI assistant.
 */

import React from 'react';
import { Volume2, Check } from 'lucide-react';
import { AiAssistantConfig } from '../../../types';

interface VoiceSettingsProps {
    formData: AiAssistantConfig;
    updateForm: (key: keyof AiAssistantConfig, value: any) => void;
}

// Gemini prebuilt voices
const geminiVoices: { name: AiAssistantConfig['voiceName']; description: string; gender: string }[] = [
    { name: 'Zephyr', description: 'Calm, balanced, professional.', gender: 'Female' },
    { name: 'Puck', description: 'Energetic, friendly, playful.', gender: 'Male' },
    { name: 'Charon', description: 'Deep, authoritative, trustworthy.', gender: 'Male' },
    { name: 'Kore', description: 'Warm, nurturing, soft.', gender: 'Female' },
    { name: 'Fenrir', description: 'Strong, clear, direct.', gender: 'Male' },
];

function VoiceSettings({ formData, updateForm }: VoiceSettingsProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Live Voice Toggle */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '18px' }}>🎙️</span>
                        <span style={{ fontWeight: 600, color: '#fff' }}>Habilitar Voz en Vivo</span>
                    </div>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                        Permite a los usuarios hablar con tu asistente en tiempo real.
                    </span>
                </div>
                <label style={{ position: 'relative', width: '48px', height: '26px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={formData.enableLiveVoice}
                        onChange={() => updateForm('enableLiveVoice', !formData.enableLiveVoice)}
                        style={{ display: 'none' }}
                    />
                    <div style={{
                        width: '48px', height: '26px', borderRadius: '13px',
                        background: formData.enableLiveVoice ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                        transition: 'background 0.2s', position: 'relative',
                    }}>
                        <div style={{
                            width: '22px', height: '22px', borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: '2px',
                            left: formData.enableLiveVoice ? '24px' : '2px',
                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }} />
                    </div>
                </label>
            </div>

            {/* Voice Selection */}
            <div>
                <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Volume2 size={18} />
                    Voz del Asistente
                </h4>
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '10px',
                }}>
                    {geminiVoices.map(voice => {
                        const isSelected = formData.voiceName === voice.name;
                        return (
                            <button
                                key={voice.name}
                                onClick={() => updateForm('voiceName', voice.name)}
                                style={{
                                    padding: '14px 12px', borderRadius: '10px', border: 'none',
                                    cursor: 'pointer', textAlign: 'left', position: 'relative',
                                    background: isSelected ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                                    outline: isSelected ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.08)',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {isSelected && (
                                    <div style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        width: '18px', height: '18px', borderRadius: '50%',
                                        background: '#f59e0b', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Check size={12} color="#000" />
                                    </div>
                                )}
                                <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px', marginBottom: '4px' }}>
                                    {voice.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                    {voice.gender}
                                </div>
                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                    {voice.description}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default VoiceSettings;
