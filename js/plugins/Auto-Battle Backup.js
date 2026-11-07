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
// NOTE: This used to hook Game_Battler.prototype.useItem, recording whatever
// action was actually executed once BattleManager.startAction reached it.
// That's too late for this plugin's purposes: if the player picks a skill,
// confirms it, then backs out (cancels back through the command windows)
// and picks something else — or picks Auto-Battle instead — before that
// turn's actions actually execute, useItem never got a chance to fire for
// the abandoned pick, but it also never got a chance to *correct* a stale
// _lastBattleAction from a previous turn's genuinely-executed action either.
// More importantly, whatever ends up queued in the actor's action slot the
// moment the party leaves the input phase is what the player actually
// committed to for that turn, and that's the moment that should count —
// not the moment BattleManager happens to iterate to that actor's action.
//
// BattleManager.startTurn() fires exactly once per turn, right after all
// actors' input has been locked in and the battle transitions from the
// input phase into the combat/execution phase, and before any action has
// actually resolved. Reading each actor's queued action here reflects
// exactly what was committed for combat, with no risk of an in-progress,
// since-canceled selection ever being recorded.
const _BattleManager_startTurn = BattleManager.startTurn;

BattleManager.startTurn = function() {

    for (const actor of $gameParty.battleMembers()) {

        // Actors who can't act (KO'd, restricted, etc.) may have no queued
        // action at all — nothing to record for them.
        const action = actor.action(0);
        if (!action) continue;

        const item = action.item();
        if (!item) continue;

        // Instant-cast actions (YEP_InstantCast: <Instant>/<Instant Cast>
        // notetag, or granted via Instant Skill/Item/Eval notetags) are free
        // actions that precede the actor's real turn action — they don't
        // consume the turn, and the actor immediately selects another action
        // afterward. Recording one as "last action" would discard the
        // actor's actual follow-up action, and Auto-Battle.js can't replay
        // instant casts at instant speed anyway (it bypasses the
        // input-selection flow YEP_InstantCast needs to trigger on), so it
        // would replay as a normal, slow, turn-consuming action either way.
        const isInstant = !!(typeof actor.isInstantCast === 'function' &&
            actor.isInstantCast(item));

        // ✔ ONLY record during active battle, and never for actions another
        // plugin marks as internal (e.g. LotPItemSelect.js's item-application
        // action fired from inside applySelectedItemEffects). Without this,
        // that internal item action would silently overwrite the actor's
        // real last action (skill 58) with the item, causing the next
        // auto-battle turn to replay the item instead of skill 58.
        if ($gameParty.inBattle() && !action._skipAutoBattleRecord && !isInstant) {
            actor._lastBattleAction = {
                type: DataManager.isSkill(item) ? "skill"
                    : DataManager.isItem(item) ? "item"
                    : "attack",
                id: item.id,
                // Target selection already happened during the input phase
                // (Scene_Battle's target window calls action.setTarget()),
                // so by the time startTurn runs, _targetIndex already holds
                // whatever the player picked. Stash it so a replayed action
                // (currently only skill 158, see makeAutoBattleActions) can
                // re-aim at the same target instead of falling back to
                // whatever default targeting the engine picks on replay.
                targetIndex: action._targetIndex
            };
        }
    }

    _BattleManager_startTurn.call(this);
};

// -----------------------------------------------------
// DART SKILLS: MISSING-ITEM MESSAGE (AUTO-BATTLE ONLY)
// -----------------------------------------------------
// Skills 376-379 each consume a specific dart item behind the scenes.
// meetsSkillConditions() has no idea about that hidden item cost, so it
// won't seal the skill on its own once the party runs out.
//
// First attempt hooked BattleManager.startAction and, on a missing item,
// pushed the message then still called the original startAction. That was
// wrong: under YEP_BattleEngineCore, letting the original run still fires
// the skill's full action sequence (which issues its own log-clear calls
// and executes the skill's effects), so the pushed text got wiped and the
// skill fired anyway. There's no safe way to "let it run but suppress it"
// once startAction has been reached.
//
// Instead, prevent the dart skill from ever being queued as this turn's
// action. This is decided in makeAutoBattleActions itself (below), which
// already fully controls what gets set for the turn: if the required item
// is missing, substitute Guard (a native action with no YEP action
// sequence attached) and stash a fail-message on the actor. Window_BattleLog
// is then hooked to check for that stashed message the moment the actor's
// turn actually starts, and print the "tried to use X / but has no Y" pair
// in place of the normal "X guards" text.
const DART_SKILL_REQUIREMENTS = {
    376: { itemId: 19, skillName: "Poison Dart!", itemNamePlural: "Poison Darts!" },
    377: { itemId: 15, skillName: "Burning Dart!", itemNamePlural: "Burning Darts!" },
    378: { itemId: 37, skillName: "Paralytic Dart!", itemNamePlural: "Paralytic Darts!" },
    379: { itemId: 42, skillName: "Syringe!", itemNamePlural: "Darts!" }
};

// -----------------------------------------------------
// SKILL 158: PRIORITIZE REPLAY, WEAPON 44 GATED
// -----------------------------------------------------
// Skill 158 is the syringe item-select skill (see Andrew_SyringeItemSelect.js,
// which intercepts it to open item selection mid-battle). For auto-battle,
// this actor's turn should always retry skill 158 on the same target rather
// than falling through to the generic skill/item/attack logic below — but
// only if the actor still has weapon 44 equipped and still meets the skill's
// normal conditions (MP/TP cost, silence, etc). If either check fails, the
// actor's turn is skipped outright rather than substituting a plain Attack,
// since attacking was never what the player asked auto-battle to repeat.
const SYRINGE_SKILL_ID = 379;
const SYRINGE_WEAPON_ID = 44;

// -----------------------------------------------------
// SKILL 380: PRIORITIZE REPLAY, "EMIRAJI BLOWPIPE" GATED
// -----------------------------------------------------
// Same idea as the syringe skill above, but gated on a weapon *name* rather
// than a database ID (the blowpipe's item ID wasn't given, and names are
// stable enough here since this is a single specific weapon). Skill 380 is
// also paired with Andrew_Skill380ItemSelect.js, which opens an item window
// after the skill resolves and applies the chosen item to the skill's last
// target. On an auto-battle replay we don't want to re-prompt the player,
// so that plugin checks this action's _isAutoBattleAction flag (already set
// below) and, when true, auto-applies the actor's last-used item instead of
// opening the window.
const SKILL_380_ID = 380;
const SKILL_380_WEAPON_NAME = "Emiraji Blowpipe";

function hasWeaponNamed(actor, name) {
    if (!actor || typeof actor.weapons !== "function") return false;
    return actor.weapons().some(function(weapon) {
        return weapon && weapon.name === name;
    });
}

// -----------------------------------------------------
// SKILL 380: TRACK ITS ACTUAL LAST-HIT TARGET
// -----------------------------------------------------
// The target chosen at input time (captured as targetIndex in startTurn,
// above) is the target the player *aimed at*, not necessarily where the
// skill actually landed once it resolved (redirects, retargeting, etc). The
// follow-up item application (Andrew_Skill380ItemSelect.js) needs to land on
// whichever target skill 380 actually hit, so that's tracked here directly
// off Game_Action.apply — the same event that plugin uses — independent of
// the general _lastBattleAction/targetIndex recording above.
function targetIndexForApply(action, target) {
    try {
        const unit = action.isForOpponent() ? action.opponentsUnit() : action.friendsUnit();
        const idx = unit.members().indexOf(target);
        return idx >= 0 ? idx : -1;
    } catch (e) {
        return -1;
    }
}

const _Game_Action_apply_Skill380Track = Game_Action.prototype.apply;
Game_Action.prototype.apply = function(target) {
    _Game_Action_apply_Skill380Track.call(this, target);
    try {
        const item = this.item && this.item();
        if (!item || item.id !== SKILL_380_ID) return;

        const subject = this.subject && this.subject();
        if (!subject) return;

        const idx = targetIndexForApply(this, target);
        if (idx >= 0) {
            subject._lastSkill380TargetIndex = idx;
        }
    } catch (e) {
        if (typeof console !== "undefined") console.error("Auto-Battle: skill 380 target tracking error:", e);
    }
};

// -----------------------------------------------------
// YEP_X_SelectionControl COMPATIBILITY: SKIP UNSELECTABLE SKILLS
// -----------------------------------------------------
// YEP_X_SelectionControl lets skills/items carry <Cannot Select: ...>
// notetags on states/actors/enemies/weapons/armors/classes that remove
// otherwise-valid enemies from a skill's target pool. meetsSkillConditions()
// only checks MP/TP cost, silence, etc. — it has no idea a skill's entire
// enemy target pool can be wiped out by those notetags, so without this
// check auto-battle would still queue the skill even when no enemy on the
// field can legally be targeted by it, and the skill would fire against
// nothing (or get force-fed a target it was never allowed to hit).
//
// This only looks at skills that target opponents; the "against the enemy"
// check the player asked for doesn't apply to ally/self-targeted skills, and
// checking those would risk misreading YEP_X_SelectionControl's rules for a
// scope they were never written for. If YEP_X_SelectionControl isn't loaded
// (Game_Battler#isSelectable missing), this always returns true so
// auto-battle behaves exactly as it did before.
function skillHasSelectableEnemyTarget(actor, skillId) {
    const skill = $dataSkills[skillId];
    if (!skill) return true;

    const action = new Game_Action(actor);
    action.setSkill(skillId);

    // Not an enemy-targeting skill (self/ally scope) -- nothing to gate.
    if (typeof action.isForOpponent !== "function" || !action.isForOpponent()) {
        return true;
    }

    const opponents = action.opponentsUnit();
    if (!opponents || typeof opponents.aliveMembers !== "function") return true;

    const members = opponents.aliveMembers();
    // No living enemies at all isn't this check's concern -- let the normal
    // flow (which already handles an empty battle) deal with it.
    if (members.length === 0) return true;

    return members.some(function(target) {
        if (!target || typeof target.isSelectable !== "function") return true;
        return target.isSelectable(action);
    });
}

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

    const isSyringeReplay = last && last.type === "skill" && last.id === SYRINGE_SKILL_ID;

    const dartReq = last && last.type === "skill" ? DART_SKILL_REQUIREMENTS[last.id] : null;
    const missingDart = dartReq && $gameParty.numItems($dataItems[dartReq.itemId]) <= 0;

    if (isSyringeReplay) {

        const syringeSkill = $dataSkills[SYRINGE_SKILL_ID];
        const hasWeapon44 = typeof this.hasWeapon === "function" &&
            this.hasWeapon($dataWeapons[SYRINGE_WEAPON_ID]);
        const meetsConditions = !!syringeSkill && this.meetsSkillConditions(syringeSkill);
        const hasSelectableTarget = skillHasSelectableEnemyTarget(this, SYRINGE_SKILL_ID);

        if (hasWeapon44 && meetsConditions && hasSelectableTarget) {

            action.setSkill(SYRINGE_SKILL_ID);

            // Re-aim at the same target as last time, if that target index
            // was actually recorded. -1 (or missing) means the original
            // action never had a specific target locked in (e.g. it was
            // random/all-scope), so leave targeting to the engine's default
            // rather than forcing an index that was never meaningful.
            if (typeof last.targetIndex === "number" && last.targetIndex >= 0) {
                action.setTarget(last.targetIndex);
            }

        } else {

            // Weapon not equipped, skill conditions no longer met
            // (insufficient MP/TP, silenced, etc), or no enemy on the field
            // can currently be selected by this skill (YEP_X_SelectionControl
            // <Cannot Select: ...>). Same pattern as the missing-dart case
            // below: queue a safe Attack stand-in (a
            // fully empty action breaks party turn-order computation, see
            // note below), skip recording it as the new "last action" so
            // next turn still retries skill 158, and suppress the stand-in
            // entirely via the BattleManager.startAction hook so nothing
            // actually executes — the actor's turn is skipped, not
            // replaced with an attack.
            this._syringeSkipMessage = { name: this.name() };
            action.setAttack();
            action._skipAutoBattleRecord = true;
        }

    } else if (last && last.type === "skill" && last.id === SKILL_380_ID) {

        const skill380 = $dataSkills[SKILL_380_ID];
        const hasBlowpipe = hasWeaponNamed(this, SKILL_380_WEAPON_NAME);
        const meetsConditions = !!skill380 && this.meetsSkillConditions(skill380);
        const hasSelectableTarget = skillHasSelectableEnemyTarget(this, SKILL_380_ID);

        if (hasBlowpipe && meetsConditions && hasSelectableTarget) {

            action.setSkill(SKILL_380_ID);

            // Re-aim at skill 380's actual last-hit target (tracked by the
            // Game_Action.apply hook above), not the targetIndex captured
            // at input time — that's the target the follow-up item needs
            // to land on too.
            const idx = this._lastSkill380TargetIndex;
            if (typeof idx === "number" && idx >= 0) {
                action.setTarget(idx);
            }

            // action._isAutoBattleAction is already set above; that's what
            // Andrew_Skill380ItemSelect.js checks to auto-apply this actor's
            // last-used item to the same target instead of opening the
            // interactive item window.

        } else {

            // Weapon not equipped, skill conditions no longer met, or no
            // enemy on the field can currently be selected by this skill
            // (YEP_X_SelectionControl <Cannot Select: ...>). Same pattern as
            // the syringe/dart cases: queue a safe Attack
            // stand-in, don't record it as the new last action, and
            // suppress it entirely via BattleManager.startAction so the
            // actor's turn is skipped rather than replaced with an attack.
            this._skill380SkipMessage = { name: this.name() };
            action.setAttack();
            action._skipAutoBattleRecord = true;
        }

    } else if (missingDart) {

        // Leave the queued action as a normal, safely-backed Attack rather
        // than fully unset. A completely empty/invalid action (no item at
        // all) turned out to break turn-order/priority computation for the
        // whole party, not just this actor — Attack is the same safe
        // fallback already used elsewhere in this plugin, so it survives
        // that stage fine. It's suppressed before it can actually fire, via
        // the BattleManager.startAction hook below.
        //
        // _skipAutoBattleRecord reuses this plugin's existing recording
        // guard (see BattleManager.startTurn above) so this stand-in Attack
        // never overwrites the actor's real _lastBattleAction — next turn
        // still tries the dart skill again in case the item's back in stock.
        this._dartFailMessage = {
            name: this.name(),
            skillName: dartReq.skillName,
            itemNamePlural: dartReq.itemNamePlural
        };
        action.setAttack();
        action._skipAutoBattleRecord = true;

    } else if (last && last.type === "skill" && $dataSkills[last.id]) {

        // In addition to the normal MP/TP/silence check, make sure the
        // skill still has at least one legal enemy target under
        // YEP_X_SelectionControl's <Cannot Select: ...> rules before
        // replaying it -- otherwise fall back to Attack the same way an
        // unmet skill condition already does, rather than queuing a skill
        // that has nothing it's allowed to hit.
        if (this.meetsSkillConditions($dataSkills[last.id]) &&
                skillHasSelectableEnemyTarget(this, last.id)) {
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
// DART SKILLS: DISPLAY THE FAIL MESSAGE, SUPPRESS THE ATTACK
// -----------------------------------------------------
// BattleManager.startAction is the point where the queued action's actual
// effects/animation/action-sequence would fire — and it's already confirmed
// safe to hook in this project (used elsewhere for turn-skip logic). When
// this._subject is carrying a stashed _dartFailMessage, print the fail text
// and simply don't delegate to the original startAction at all: the stand-in
// Attack action never executes, so no damage, no animation, nothing.
//
// processTurn() calls subject.removeCurrentAction() immediately after
// startAction() returns, regardless of what startAction did internally —
// that's the same cleanup call that runs after every normal action — so
// returning early here still lets the turn advance to the next actor on
// its own, with no extra bookkeeping needed.
const _BattleManager_startAction = BattleManager.startAction;
BattleManager.startAction = function() {

    const subject = this._subject;

    if (subject && subject._dartFailMessage) {
        const msg = subject._dartFailMessage;
        subject._dartFailMessage = null;

        if (this._logWindow) {
            this._logWindow.push('addText', msg.name + " tried to use " + msg.skillName);
            this._logWindow.push('addText', "But " + msg.name + " has no " + msg.itemNamePlural);
            this._logWindow.push('wait');
            this._logWindow.push('clear');
        }

        return;
    }

    if (subject && subject._syringeSkipMessage) {
        const msg = subject._syringeSkipMessage;
        subject._syringeSkipMessage = null;

        if (this._logWindow) {
            this._logWindow.push('addText', msg.name + " can't use the syringe and skips their turn");
            this._logWindow.push('wait');
            this._logWindow.push('clear');
        }

        return;
    }

    if (subject && subject._skill380SkipMessage) {
        const msg = subject._skill380SkipMessage;
        subject._skill380SkipMessage = null;

        if (this._logWindow) {
            this._logWindow.push('addText', msg.name + " can't use the blowpipe and skips their turn");
            this._logWindow.push('wait');
            this._logWindow.push('clear');
        }

        return;
    }

    _BattleManager_startAction.call(this);
};

// -----------------------------------------------------
// ELIGIBILITY CHECK
// -----------------------------------------------------
// Auto-Battle replays whatever's in _lastBattleAction. If an actor able to
// act doesn't have one yet (they haven't taken a real action this playthrough),
// there's nothing meaningful to replay for them, so the command should be
// disabled rather than silently falling back to a plain Attack for that actor.
// Actors who currently can't act (KO'd, restricted, etc.) are skipped, since
// they have no action to store and shouldn't permanently lock the command out.
function allActorsHaveStoredAction() {
    return $gameParty.battleMembers().every(function(actor) {
        if (typeof actor.canInput === "function" && !actor.canInput()) {
            return true;
        }
        return !!actor._lastBattleAction;
    });
}

// -----------------------------------------------------
// PARTY COMPOSITION CHANGES MID-BATTLE
// -----------------------------------------------------
// Some plugins swap party members in/out at instant-cast speed, mid-turn,
// without going through the normal party command flow. The party command
// window's enabled state is only recalculated when its command list is
// rebuilt (normally once per turn, via makeCommandList), so a composition
// change that happens between turns -- or mid-turn while the window is
// already open -- wouldn't otherwise be reflected until the next natural
// refresh. Force one immediately whenever the party's membership changes
// during battle.
function refreshPartyCommandWindow() {
    if (!$gameParty.inBattle()) return;
    const scene = SceneManager._scene;
    if (scene instanceof Scene_Battle && scene._partyCommandWindow) {
        scene._partyCommandWindow.refresh();
    }
}

const _Game_Party_addActor = Game_Party.prototype.addActor;
Game_Party.prototype.addActor = function(actorId) {
    _Game_Party_addActor.call(this, actorId);
    refreshPartyCommandWindow();
};

const _Game_Party_removeActor = Game_Party.prototype.removeActor;
Game_Party.prototype.removeActor = function(actorId) {
    _Game_Party_removeActor.call(this, actorId);
    refreshPartyCommandWindow();
};

// -----------------------------------------------------
// PARTY COMMAND: ADD AUTO-BATTLE BUTTON
// -----------------------------------------------------
const _Window_PartyCommand_makeCommandList =
    Window_PartyCommand.prototype.makeCommandList;

Window_PartyCommand.prototype.makeCommandList = function() {

    _Window_PartyCommand_makeCommandList.call(this);

    this.addCommand("Auto-Battle", "autoBattle", allActorsHaveStoredAction());
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