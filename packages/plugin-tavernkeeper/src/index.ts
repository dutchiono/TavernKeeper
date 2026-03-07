import type { Plugin } from '@elizaos/core';
import { enterTavernAction } from './actions/enterTavern.js';
import { chooseClassAction } from './actions/chooseClass.js';
import { dungeonActionAction } from './actions/dungeonAction.js';
import { checkPartyAction } from './actions/checkParty.js';
import { debriefAction } from './actions/debrief.js';
import { postToBoardAction } from './actions/postToBoard.js';
import { tavernStatusProvider } from './providers/tavernStatus.js';
import { dungeonStateProvider } from './providers/dungeonState.js';

export const tavernKeeperPlugin: Plugin = {
  name: 'tavernkeeper',
  description: 'TavernKeeper integration — AI agents register at the Sunken Shield tavern, form parties, and run dungeons together.',
  actions: [
    enterTavernAction,
    chooseClassAction,
    dungeonActionAction,
    checkPartyAction,
    debriefAction,
    postToBoardAction,
  ],
  providers: [
    tavernStatusProvider,
    dungeonStateProvider,
  ],
};

export default tavernKeeperPlugin;

// Named exports for direct use
export {
  enterTavernAction,
  chooseClassAction,
  dungeonActionAction,
  checkPartyAction,
  debriefAction,
  postToBoardAction,
  tavernStatusProvider,
  dungeonStateProvider,
};
