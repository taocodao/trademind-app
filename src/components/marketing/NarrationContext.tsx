'use client';

import React, {
    createContext,
    useContext,
    useState,
    useRef,
    useCallback,
    useEffect,
} from "react";
import { useTranslation } from "react-i18next";

interface NarrationState {
    progress: number; // 0.0 → 1.0
    isPlaying: boolean;
    currentYear: number;
    currentTradeIndex: number;
    duration: number;
    currentTime: number;
    initialInvestment: number;
    setInitialInvestment: (val: number) => void;
    play: () => void;
    pause: () => void;
    seek: (normalizedPosition: number) => void;
}

const TOTAL_TRADES = 1078;
const YEAR_BOUNDARIES = [
    { year: 2019, startIndex: 0, endIndex: 182 },
    { year: 2020, startIndex: 183, endIndex: 355 },
    { year: 2021, startIndex: 356, endIndex: 533 },
    { year: 2022, startIndex: 534, endIndex: 620 },
    { year: 2023, startIndex: 621, endIndex: 798 },
    { year: 2024, startIndex: 799, endIndex: 945 },
    { year: 2025, startIndex: 946, endIndex: 1077 },
];

const NarrationContext = createContext<NarrationState | null>(null);

export function NarrationProvider({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Create a stable synthetic timer for when audio files are missing
    const syntheticTimerRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(180); // Default to 3 minutes
    const [currentTime, setCurrentTime] = useState(0);
    const [initialInvestment, setInitialInvestment] = useState(5000); // Verified Backtest Baseline

    // Load audio based on current language
    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        const lang = i18n.language?.substring(0, 2) || "en";
        const audio = new Audio(`/audio/narration_${lang}.mp3`);
        audio.preload = "auto";

        const handleLoadedMetadata = () => {
            if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                setDuration(audio.duration);
            }
        };

        const handleTimeUpdate = () => {
            if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                const p = audio.currentTime / audio.duration;
                setProgress(p);
                setCurrentTime(audio.currentTime);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(1);
            setCurrentTime(duration);
        };

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        // If switching languages mid-playback, sync position
        if (audioRef.current) {
            const currentRef = audioRef.current;
            const prevDuration = currentRef.duration && isFinite(currentRef.duration) && currentRef.duration > 0 ? currentRef.duration : duration;
            const prevProgress = prevDuration > 0 ? currentRef.currentTime / prevDuration : progress;

            currentRef.pause();
            audio.currentTime = prevProgress * duration;
        }

        audioRef.current = audio;

        return () => {
            audio.pause();
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [i18n.language, duration, progress]);

    // Synthetic animation loop for fallback when audio files don't exist yet
    useEffect(() => {
        const animate = (time: number) => {
            if (lastTimeRef.current !== null) {
                const delta = (time - lastTimeRef.current) / 1000;

                // Only advance synthetic time if audio isn't actually playing correctly
                if (audioRef.current && (audioRef.current.paused || audioRef.current.error || isNaN(audioRef.current.duration) || audioRef.current.duration === 0)) {
                    setCurrentTime(prev => {
                        const next = prev + delta;
                        if (next >= duration) {
                            setIsPlaying(false);
                            setProgress(1);
                            return duration;
                        }
                        setProgress(next / duration);
                        return next;
                    });
                }
            }

            lastTimeRef.current = time;
            if (isPlaying) {
                syntheticTimerRef.current = requestAnimationFrame(animate);
            }
        };

        if (isPlaying) {
            lastTimeRef.current = performance.now();
            syntheticTimerRef.current = requestAnimationFrame(animate);
        } else {
            lastTimeRef.current = null;
            if (syntheticTimerRef.current) {
                cancelAnimationFrame(syntheticTimerRef.current);
            }
        }

        return () => {
            if (syntheticTimerRef.current) cancelAnimationFrame(syntheticTimerRef.current);
        };
    }, [isPlaying, duration]);

    const currentTradeIndex = Math.min(
        Math.floor(progress * TOTAL_TRADES === TOTAL_TRADES ? TOTAL_TRADES - 1 : progress * TOTAL_TRADES),
        TOTAL_TRADES - 1
    );

    const currentYear =
        YEAR_BOUNDARIES.find(
            (y) =>
                currentTradeIndex >= y.startIndex && currentTradeIndex <= y.endIndex
        )?.year ?? 2019;

    const play = useCallback(() => {
        if (audioRef.current) {
            // Catch play errors so the synthetic fallback can take over
            audioRef.current.play().catch(e => {
                console.warn('Audio playback failed (track might not exist yet), falling back to synthetic timer:', e);
            });
        }
        setIsPlaying(true);
    }, []);

    const pause = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        setIsPlaying(false);
    }, []);

    const seek = useCallback(
        (normalizedPosition: number) => {
            const clamped = Math.max(0, Math.min(1, normalizedPosition));

            if (audioRef.current) {
                const currentDuration = audioRef.current.duration && isFinite(audioRef.current.duration) && audioRef.current.duration > 0 ? audioRef.current.duration : duration;
                audioRef.current.currentTime = clamped * currentDuration;
            }

            setProgress(clamped);
            setCurrentTime(clamped * duration);
        },
        [duration]
    );

    return (
        <NarrationContext.Provider
            value={{
                progress,
                isPlaying,
                currentYear,
                currentTradeIndex,
                duration,
                currentTime,
                initialInvestment,
                setInitialInvestment,
                play,
                pause,
                seek,
            }}
        >
            {children}
        </NarrationContext.Provider>
    );
}

export function useNarration() {
    const ctx = useContext(NarrationContext);
    if (!ctx)
        throw new Error("useNarration must be used within NarrationProvider");
    return ctx;
}
