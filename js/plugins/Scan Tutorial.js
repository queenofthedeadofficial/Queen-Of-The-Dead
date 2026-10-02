/*: 
 * @plugindesc Scan -> Status Tutorial for YEP In-Battle Status + ADRI Enemy Status 
 * @author Copilot 
 * 
 * @help 
 * Switch 601 = Scan tutorial complete (now set when the Scan/enemy status 
 * interface is CLOSED, not when it's selected) 
 * Switch 602 = Status tutorial complete 
 * 
 * No popup/message of any kind. Purely: gate the party command list to 
 * Scan-only, then to Status-only, driven by those two switches. 
 * 
 * While Switch 602 is OFF, the player cannot proceed from the party 
 * command window into the actor command window. 
 * 
 * Requires: 
 * YEP_X_InBattleStatus 
 * ADRI_InBattleEnemyStatus 
 */ 
 
(function() { 
 
var SCAN_SWITCH = 601; 
var STATUS_SWITCH = 602; 
 
var SCAN_SYMBOL = "inBattleEnemyStatus"; 
var STATUS_SYMBOL = "inBattleStatus"; 
 
 
//============================================================================= 
// Refresh Helper 
//============================================================================= 
 
Window_PartyCommand.prototype.refreshTutorialList = 
function() { 
 
    this.clearCommandList(); 
 
    this.makeCommandList(); 
    this.refresh(); 
 
}; 
 
 
function refreshPartyCommands() { 
 
    var scene = SceneManager._scene; 
 
    if (!scene) return; 
    if (!scene._partyCommandWindow) return; 
 
    scene._partyCommandWindow.refreshTutorialList(); 
 
} 
 
 
//============================================================================= 
// Command Restrictions 
//============================================================================= 
 
var _Window_PartyCommand_makeCommandList = 
    Window_PartyCommand.prototype.makeCommandList; 
 
Window_PartyCommand.prototype.makeCommandList = function() { 
 
    _Window_PartyCommand_makeCommandList.call(this); 
 
    // Tutorial finished 
    if ($gameSwitches.value(STATUS_SWITCH)) { 
        return; 
    } 
 
    // Stage 1: 
    // Only Scan is enabled. 
    if (!$gameSwitches.value(SCAN_SWITCH)) { 
 
        for (var i = 0; i < this._list.length; i++) { 
 
            if (this._list[i].symbol !== SCAN_SYMBOL) { 
                this._list[i].enabled = false; 
            } 
 
        } 
 
        return; 
    } 
 
    // Stage 2: 
    // Only Status is enabled. 
    for (var j = 0; j < this._list.length; j++) { 
 
        if (this._list[j].symbol !== STATUS_SYMBOL) { 
            this._list[j].enabled = false; 
        } 
 
    } 
 
}; 
 
 
//============================================================================= 
// Detect Status Selection 
//============================================================================= 
 
var _Window_PartyCommand_processOk = 
    Window_PartyCommand.prototype.processOk; 
 
Window_PartyCommand.prototype.processOk = function() { 
 
    var cmd = this.currentData(); 
 
    if (cmd) { 
 
        // Status selected 
        if (cmd.symbol === STATUS_SYMBOL && 
            $gameSwitches.value(SCAN_SWITCH) && 
            !$gameSwitches.value(STATUS_SWITCH)) { 
 
            $gameSwitches.setValue( 
                STATUS_SWITCH, 
                true 
            ); 
 
            refreshPartyCommands(); 
        } 
    } 
 
    _Window_PartyCommand_processOk.call(this); 
 
}; 
 
 
//============================================================================= 
// Prevent Party Command -> Actor Command During Tutorial 
//============================================================================= 
// 
// While Switch 602 is OFF, prevent the normal Fight/actor-command transition.
// This keeps the player inside the Party Command window until the tutorial
// has been completed.
// 
 
var _Tutorial_commandFight = 
    Scene_Battle.prototype.commandFight; 
 
Scene_Battle.prototype.commandFight = function() { 
 
    if (!$gameSwitches.value(STATUS_SWITCH)) { 
 
        // Stay in the Party Command window. 
        if (this._partyCommandWindow) { 
            this._partyCommandWindow.activate(); 
        } 
 
        return; 
    } 
 
    _Tutorial_commandFight.call(this); 
 
}; 
 
 
//============================================================================= 
// ADRI Enemy Status Close -- turn on SCAN_SWITCH here 
//============================================================================= 
 
if (Imported.ADRI_InBattleEnemyStatus) { 
 
    var _Tutorial_onEnemyStatusCancel = 
        Scene_Battle.prototype.onInBattleEnemyStatusCancel; 
 
    Scene_Battle.prototype.onInBattleEnemyStatusCancel = 
    function() { 
 
        _Tutorial_onEnemyStatusCancel.call(this); 
 
        $gameSwitches.setValue(SCAN_SWITCH, true); 
 
        // Tutorial already finished -- nothing further to update. 
        if ($gameSwitches.value(STATUS_SWITCH)) { 
            return; 
        } 
 
        refreshPartyCommands(); 
 
        if (this._partyCommandWindow) { 
 
            var index = 
                this._partyCommandWindow.findSymbol( 
                    STATUS_SYMBOL 
                ); 
 
            if (index >= 0) { 
                this._partyCommandWindow.select(index); 
            } 
        } 
 
    }; 
 
} 
 
})(); 