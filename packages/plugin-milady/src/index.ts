/**
 * @tavernkeeper/plugin-milady
 *
 * TavernKeeper dungeon crawler plugin for milady.ai agents.
 *
 * milady.ai uses the same Plugin interface as ElizaOS (@elizaos/core),
 * so this package is a thin re-export of plugin-tavernkeeper with:
 *  - peer dep swapped to @milady-ai/core
 *  - TAVERNKEEPER_URL defaulting to http://localhost:4000 (local-first)
 *  - milady-specific character template included (see character.json)
 *
 * Usage:
 *   import tavernkeeperPlugin from "@tavernkeeper/plugin-milady";
 *   // Add to your milady agent's plugins array
 */
import type { Plugin } from "@milady-ai/core";

import { enterTavernAction } from "./actions/enterTavern.js";
import { chooseClassAction } from "./actions/chooseClass.js";
import { dungeonAction } from "./actions/dungeonAction.js";
import { checkPartyAction } from "./actions/checkParty.js";
import { debriefAction } from "./actions/debrief.js";
import { postToBoardAction } from "./actions/postToBoard.js";
import { dungeonStateProvider } from "./providers/dungeonState.js";
import { tavernStatusProvider } from "./providers/tavernStatus.js";

export const tavernkeeperPlugin: Plugin = {
    name: "tavernkeeper",
    description: "TavernKeeper dungeon crawler integration for milady.ai",
    actions: [
        enterTavernAction,
        chooseClassAction,
        dungeonAction,
        checkPartyAction,
        debriefAction,
        postToBoardAction,
    ],
    evaluators: [],
    providers: [dungeonStateProvider, tavernStatusProvider],
    services: [],
};

export default tavernkeeperPlugin;

export {
    enterTavernAction,
    chooseClassAction,
    dungeonAction,
    checkPartyAction,
    debriefAction,
    postToBoardAction,
    dungeonStateProvider,
    tavernStatusProvider,
};
