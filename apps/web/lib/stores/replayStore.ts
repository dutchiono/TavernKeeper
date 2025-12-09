import { create } from 'zustand';

export interface ReplayEvent {
    id: string;
    type: string;
    timestamp: string; // ISO string from DB
    timeOffset: number; // ms from start of run
    payload: any;
}

interface ReplayState {
    // Data
    events: ReplayEvent[];
    startTime: number; // Global start time (ms)
    endTime: number; // Global end time (ms)
    duration: number; // Total duration (ms)

    // Playback State
    currentTime: number; // Current progress in ms (0 to duration)
    isPlaying: boolean;
    playbackSpeed: number; // 1, 2, 4, etc.

    // Derived/Active State
    currentEventIndex: number;
    activeBattleEvent: ReplayEvent | null; // If non-null, show Battle Overlay

    // Actions
    setEvents: (events: any[]) => void;
    play: () => void;
    pause: () => void;
    setSpeed: (speed: number) => void;
    seek: (time: number) => void;
    tick: (deltaMs: number) => void; // Called by requestAnimationFrame
}

export const useReplayStore = create<ReplayState>((set, get) => ({
    events: [],
    startTime: 0,
    endTime: 0,
    duration: 0,

    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,

    currentEventIndex: 0,
    activeBattleEvent: null,

    setEvents: (rawEvents) => {
        if (!rawEvents || rawEvents.length === 0) return;

        // Sort by timestamp
        const sorted = [...rawEvents].sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        const startTime = new Date(sorted[0].timestamp).getTime();
        const endTime = new Date(sorted[sorted.length - 1].timestamp).getTime();

        // Add a buffer at the end so the last event lingers
        const duration = (endTime - startTime) + 2000;

        const processedEvents = sorted.map(e => ({
            ...e,
            timeOffset: new Date(e.timestamp).getTime() - startTime
        }));

        set({
            events: processedEvents,
            startTime,
            endTime,
            duration,
            currentTime: 0,
            currentEventIndex: 0,
            activeBattleEvent: null,
            isPlaying: false
        });
    },

    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    setSpeed: (speed) => set({ playbackSpeed: speed }),

    seek: (time) => {
        const { duration, events } = get();
        const clampedTime = Math.max(0, Math.min(time, duration));

        // Recalculate index based on new time (binary search optimization possible, linear for now)
        let newIndex = 0;
        for (let i = 0; i < events.length; i++) {
            if (events[i].timeOffset <= clampedTime) {
                newIndex = i;
            } else {
                break;
            }
        }

        set({
            currentTime: clampedTime,
            currentEventIndex: newIndex,
            // Check if we landed inside a "battle window" (e.g. 2 seonds after a combat event)
            activeBattleEvent: null // Reset for simplicity, tick will pick it up if needed?  Actually let's just reset.
        });
    },

    tick: (deltaMs) => {
        const { isPlaying, currentTime, duration, playbackSpeed, events, currentEventIndex, activeBattleEvent } = get();

        if (!isPlaying) return;

        const newTime = Math.min(currentTime + (deltaMs * playbackSpeed), duration);

        // Find new events that have passed
        let newIndex = currentEventIndex;
        let newBattleEvent = activeBattleEvent;

        // Check next events
        while (
            newIndex + 1 < events.length &&
            events[newIndex + 1].timeOffset <= newTime
        ) {
            newIndex++;
            const event = events[newIndex];

            // Logic for Battle Overlay
            // If it's a combat event, set it as active
            if (event.type === 'combat' || event.payload?.type === 'combat') {
                newBattleEvent = event;
            }
            // If it's a non-combat event (move), maybe clear battle?
            // Or strictly use time window?
            // Let's say a battle event keeps the overlay open for 2 seconds (in replay time)
        }

        // Auto-close battle overlay if time passed
        if (newBattleEvent && (newTime - newBattleEvent.timeOffset > 2000)) {
            newBattleEvent = null;
        }

        set({
            currentTime: newTime,
            currentEventIndex: newIndex,
            activeBattleEvent: newBattleEvent,
            isPlaying: newTime < duration
        });
    }
}));
