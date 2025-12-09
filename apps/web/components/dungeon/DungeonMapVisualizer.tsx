
import React, { useEffect, useRef, useState } from 'react';
import { useReplayStore } from '../../lib/stores/replayStore';

export const DungeonMapVisualizer: React.FC = () => {
    const { events, currentEventIndex } = useReplayStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State for auto-mapping
    // We scan all events up to current index to build the map

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        // Resize
        const parent = containerRef.current;
        if (parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        }

        // Clear
        ctx.fillStyle = '#1a120b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Find standard scaling
        // We iterate ALL events to find bounds? Or just up to now?
        // Better to find global bounds so map doesn't jitter.
        // But for "fog of war" feel, jitter might be okay or we center on character.
        // Let's center on character (camera follow).

        // Find current position from last 'move' event
        let currentPos = { x: 0, y: 0 };
        const visited: { x: number, y: number }[] = [];

        // Scan up to current index
        for (let i = 0; i <= currentEventIndex && i < events.length; i++) {
            const e = events[i];
            const p = e.payload || e;

            if (p.location && (p.action === 'move' || e.type === 'exploration')) {
                currentPos = { x: p.location.x, y: p.location.y };
                visited.push(currentPos);
            }
            // fallback for mock events if any
        }

        // Drawing Config
        const SCALE = 20; // 1 unit = 20px
        const CENTER_X = canvas.width / 2;
        const CENTER_Y = canvas.height / 2;

        // Transform function: Map world (x,y) to Canvas (x,y)
        // Camera centered on currentPos
        const toScreen = (x: number, y: number) => ({
            x: CENTER_X + (x - currentPos.x) * SCALE,
            y: CENTER_Y + (y - currentPos.y) * SCALE
        });

        // Draw Visited Path/Rooms
        ctx.strokeStyle = '#5c4033';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (visited.length > 0) {
            const start = toScreen(visited[0].x, visited[0].y);
            ctx.moveTo(start.x, start.y);

            for (const pt of visited) {
                const s = toScreen(pt.x, pt.y);
                ctx.lineTo(s.x, s.y);
                // Draw node for room
                // ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
            }
        }
        ctx.stroke();

        // Draw Nodes
        visited.forEach(pt => {
            const s = toScreen(pt.x, pt.y);
            ctx.fillStyle = '#3a2d23';
            ctx.fillRect(s.x - 8, s.y - 8, 16, 16);
        });

        // Draw Player
        const pScreen = toScreen(currentPos.x, currentPos.y);
        ctx.fillStyle = '#22c55e'; // Green
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pScreen.x, pScreen.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Grid (Optional background reference)
        // ...

    }, [events, currentEventIndex]); // Redraw on index change

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#1a120b]">
            <div className="absolute top-4 left-4 text-xs text-[#8c7b63] font-pixel pointer-events-none">
                EXPLORATION MODE
            </div>
            <canvas ref={canvasRef} className="block" />
        </div>
    );
};
