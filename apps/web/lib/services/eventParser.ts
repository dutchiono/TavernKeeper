import { RunEvent } from '../hooks/useRunEvents';

export interface ParsedCombatEvent {
    type: 'attack' | 'damage' | 'death' | 'heal';
    actorId: string;
    targetId?: string;
    damage?: number;
    hit?: boolean;
    critical?: boolean;
    message: string;
}

export function parseCombatEvent(event: RunEvent): ParsedCombatEvent | null {
    // Event payload might be the actual event object
    const payload = event.payload || event;

    // Check if it's a combat event
    if (payload.type !== 'combat' && event.type !== 'combat') {
        return null;
    }

    const action = payload.action || 'attack';
    const actorId = payload.actorId || '';
    const targetId = payload.targetId;
    const damage = payload.damage || 0;
    const hit = payload.hit !== undefined ? payload.hit : true;
    const critical = payload.critical || false;

    // Generate message based on action
    let message = '';
    switch (action) {
        case 'attack':
            message = hit
                ? `Entity ${actorId} attacks${targetId ? ` ${targetId}` : ''}${damage > 0 ? ` for ${damage} damage` : ''}${critical ? ' (CRITICAL!)' : ''}`
                : `Entity ${actorId} misses${targetId ? ` ${targetId}` : ''}`;
            break;
        case 'damage':
            message = `Entity ${targetId || 'target'} takes ${damage} damage`;
            break;
        case 'death':
            message = `Entity ${actorId} has been defeated!`;
            break;
        case 'heal':
            message = `Entity ${targetId || actorId} heals for ${damage || 0} HP`;
            break;
        default:
            message = `Combat action: ${action}`;
    }

    return {
        type: action,
        actorId,
        targetId,
        damage,
        hit,
        critical,
        message,
    };
}

export function getEntityName(entityId: string, partyTokenIds: string[]): string {
    // If it's a party member (token ID), return "Hero #X"
    if (partyTokenIds.includes(entityId)) {
        return `Hero #${entityId}`;
    }
    // Otherwise, it's probably a monster
    return `Monster ${entityId}`;
}
