
import { simulateRun } from '@innkeeper/engine';
import { Entity } from '@innkeeper/lib';

async function main() {
    console.log("Starting Engine Test...");

    // Mock Entity
    const hero: Entity = {
        id: 'mock-hero-1',
        name: 'Test Hero',
        stats: {
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            vitality: 10,
            luck: 10,
            level: 1,
            hp: 100,
            mp: 50,
            maxHp: 100,
            maxMp: 50
        },
        position: undefined,
        isPlayer: true,
        inventory: [],
    };

    console.log("Simulating run...");
    try {
        const result = await simulateRun({
            dungeonSeed: 'test-seed',
            runId: 'test-run-id',
            startTime: Date.now(),
            entities: [hero],
            maxTurns: 100,
            mapId: 'test-map-id',
            agentIds: ['mock-hero-1'],
        });

        console.log("Simulation Output:");
        console.log("Result:", result.result);
        console.log("Events:", result.events.length);
        if (result.events.length > 0) {
            console.log("First Event:", result.events[0]);
        }
    } catch (e) {
        console.error("Simulation Failed:", e);
    }
}

main();
