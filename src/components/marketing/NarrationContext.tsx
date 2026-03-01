'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export const TOTAL_DURATION_SEC = 180.0; // 3 minutes

interface NarrationContextType {
    isPlaying: boolean;
    progress: number;      // 0.0 to 1.0
    elapsedTime: number;   // 0 to 180
    togglePlay: () => void;
    seekTo: (timeSec: number) => void;
    activeLanguage: string;
}

const NarrationContext = createContext<NarrationContextType | undefined>(undefined);

export function NarrationProvider({ children }: { children: ReactNode }) {
    const { i18n } = useTranslation();
    const activeLanguage = i18n.language ? i18n.language.split('-')[0] : 'en';

    const [isPlaying, setIsPlaying] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);

    const animationRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Swap Audio track when language changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const audioSrc = `/audio/${activeLanguage}_narration.mp3`;

            // If playing, pause, swap src, seek to current time, then play
            const wasPlaying = isPlaying;
            if (audioRef.current) {
                audioRef.current.pause();
            }

            audioRef.current = new Audio(audioSrc);
            audioRef.current.currentTime = elapsedTime;

            // Note: Since these are mock paths until ElevenLabs generates them, 
            // we will catch play() errors gracefully to allow the visual timeline to keep working.
            if (wasPlaying) {
                audioRef.current.play().catch(e => console.warn('Audio playback failed (track might not exist yet):', e));
            }
        }
    }, [activeLanguage]);

    const togglePlay = () => {
        setIsPlaying(prev => !prev);
    };

    const seekTo = (timeSec: number) => {
        const clamped = Math.max(0, Math.min(timeSec, TOTAL_DURATION_SEC));
        setElapsedTime(clamped);
        if (audioRef.current) {
            audioRef.current.currentTime = clamped;
        }
    };

    // Animation Loop
    useEffect(() => {
        const animate = (time: number) => {
            if (lastTimeRef.current !== null) {
                const delta = (time - lastTimeRef.current) / 1000;
                setElapsedTime(prev => {
                    const next = prev + delta;
                    if (next >= TOTAL_DURATION_SEC) {
                        setIsPlaying(false);
                        return TOTAL_DURATION_SEC;
                    }
                    return next;
                });
            }
            lastTimeRef.current = time;
            if (isPlaying) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        if (isPlaying) {
            lastTimeRef.current = performance.now();
            animationRef.current = requestAnimationFrame(animate);
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.warn('Audio playback failed (track might not exist yet):', e));
            }
        } else {
            lastTimeRef.current = null;
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
            }
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [isPlaying]);

    // Keep Audio in sync if timeline desyncs somehow (e.g. tab backgrounding)
    useEffect(() => {
        if (isPlaying && audioRef.current && Math.abs(audioRef.current.currentTime - elapsedTime) > 0.5) {
            audioRef.current.currentTime = elapsedTime;
        }
    }, [elapsedTime, isPlaying]);

    const progress = Math.min(elapsedTime / TOTAL_DURATION_SEC, 1.0);

    return (
        <NarrationContext.Provider value={{ isPlaying, progress, elapsedTime, togglePlay, seekTo, activeLanguage }}>
            {children}
        </NarrationContext.Provider>
    );
}

export function useNarration() {
    const context = useContext(NarrationContext);
    if (!context) {
        throw new Error("useNarration must be used within a NarrationProvider");
    }
    return context;
}
