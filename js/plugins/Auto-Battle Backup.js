/*:
 * @plugindesc Stable Auto-Battle (Last Skill/Item Memory) - YEP safe, no BattleManager overrides
 */

(() => {

const AutoBattle = {
    enabled: false
};

// -----------------------------------------------------
// STATE
// -----------------------------------------------------
function setAutoBattle(value) {
    AutoBattle.enabled = value;
}

// -----------------------------------------------------
// RECORD LAST ACTION (MV-safe hook)
// -----------------------------------------------------
const _Game_Action_apply = Game_Action.prototype.apply;

Game_Action.prototype.apply = function(target) {

    const subject = this.subject && this.subject();
    const item = this.item ? this.item() : null;

    // Instant-cast actions (YEP_InstantCast: <Instant>/<Instant Cast> notetag,
    // or granted via Instant Skill/Item/Eval notetags) are free actions that
    // precede the actor's real turn action — they don't consume the turn, and
    // the actor immediately selects another action afterward. Recording one as
    // "last action" would discard the actor's actual follow-up action, and
    // Auto-Battle.js can't replay instant casts at instant speed anyway (it
    // bypasses the input-selection flow YEP_InstantCast needs to trigger on),
    // so it would replay as a normal, slow, turn-consuming action either way.
    const isInstant = !!(subject && item &&
        typeof subject.isInstantCast === 'function' &&
        subject.isInstantCast(item));

    // ✔ ONLY record during active battle, and never for actions another plugin
    // marks as internal (e.g. LotPItemSelect.js's item-application action fired
    // from inside applySelectedItemEffects). Without this, that internal item
    // action would silently overwrite the actor's real last action (skill 58)
    // with the item, causing the next auto-battle turn to replay the item
    // instead of skill 58.
    if (subject && $gameParty.inBattle() && !this._skipAutoBattleRecord && !isInstant) {
        subject._lastBattleAction = {
            type: this.isSkill() ? "skill"
                : this.isItem() ? "item"
                : "attack",
            id: item ? item.id : 0
        };
    }

    return _Game_Action_apply.call(this, target);
};

// -----------------------------------------------------
// AUTO ACTION GENERATION (NO FLOW CONTROL)
// -----------------------------------------------------
Game_Actor.prototype.makeAutoBattleActions = function() {

    this.clearActions();

    const last = this._lastBattleAction;
    const action = new Game_Action(this);

    // Tag this action instance as auto-battle-generated so other plugins
    // (e.g. LotP skill 58 item select) can detect it precisely, per-action,
    // instead of relying on a global "auto-battle enabled" flag that stays
    // true for the rest of the battle even after returning to manual input.
    action._isAutoBattleAction = true;

    if (last && last.type === "skill" && $dataSkills[last.id]) {

        if (this.meetsSkillConditions($dataSkills[last.id])) {
            action.setSkill(last.id);
        } else {
            action.setAttack();
        }

    } else if (last && last.type === "item" && $dataItems[last.id]) {

        action.setItem(last.id);

    } else {
        action.setAttack();
    }

    this.setAction(0, action);
};

// -----------------------------------------------------
// PARTY COMMAND: ADD AUTO-BATTLE BUTTON
// -----------------------------------------------------
const _Window_PartyCommand_makeCommandList =
    Window_PartyCommand.prototype.makeCommandList;

Window_PartyCommand.prototype.makeCommandList = function() {

    _Window_PartyCommand_makeCommandList.call(this);

    this.addCommand("Auto-Battle", "autoBattle", true);
};

// -----------------------------------------------------
// SCENE: HOOK COMMAND
// -----------------------------------------------------
const _Scene_Battle_createPartyCommandWindow =
    Scene_Battle.prototype.createPartyCommandWindow;

Scene_Battle.prototype.createPartyCommandWindow = function() {

    _Scene_Battle_createPartyCommandWindow.call(this);

    this._partyCommandWindow.setHandler(
        "autoBattle",
        this.commandAutoBattle.bind(this)
    );
};

// -----------------------------------------------------
// CORE FIX: SAFE PHASE TRANSITION
// -----------------------------------------------------
Scene_Battle.prototype.commandAutoBattle = function() {

    const actors = $gameParty.battleMembers();

    // assign actions BEFORE leaving input phase
    for (const actor of actors) {
        actor.makeAutoBattleActions();
    }

    setAutoBattle(true);

    // CLOSE INPUT CLEANLY (THIS IS THE KEY FIX)
    this._partyCommandWindow.close();
    if (this._actorCommandWindow) {
        this._actorCommandWindow.close();
    }

    // LET YEP TRANSITION NATURALLY
    // Do NOT call selectNextCommand
    BattleManager.startTurn();
};

// -----------------------------------------------------
// RESET FLAG ON BATTLE END
// -----------------------------------------------------
const _BattleManager_endBattle = BattleManager.endBattle;
BattleManager.endBattle = function(result) {

    setAutoBattle(false);

    _BattleManager_endBattle.call(this, result);
};

})();