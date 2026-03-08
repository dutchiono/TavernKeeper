import type { Plugin } from "@elizaos/core";
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
    description: "TavernKeeper dungeon crawler integration for Eliza",
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