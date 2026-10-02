/*:
 * @plugindesc v38 DTB Combat Log (selectable per-turn action list) - FIXED YEP SAFE VERSION
 * @author ChatGPT
 */

(function() {

"use strict";

/* =============================================================
 * STORAGE
 * ============================================================= */

function ensureBM() {
    if (!BattleManager._combatTimeline) BattleManager._combatTimeline = [];
    if (!BattleManager._turnActions) BattleManager._turnActions = [];
    if (!BattleManager._deferredInstantActions) BattleManager._deferredInstantActions = [];
    if (!BattleManager._actionLog) BattleManager._actionLog = null;
    if (!BattleManager._actionSequence) BattleManager._actionSequence = 0;
    if (BattleManager._combatLogReturnFocus === undefined)
        BattleManager._combatLogReturnFocus = false;
}

/* =============================================================
 * HELPERS
 * ============================================================= */

function timelineEntryAt(index) {
    const timeline = BattleManager._combatTimeline;
    return timeline[timeline.length - 1 - index];
}

function isInstantCastAction(subject, item) {
    if (!subject || !item) return false;
    if (subject.isActor && subject.isActor()) {
        return !!BattleManager._instantCasting;
    }
    if (typeof subject.isInstantCast === "function") {
        return !!subject.isInstantCast(item);
    }
    return false;
}

/* =============================================================
 * PASSIVE ENTRY API
 * Called by DoT/HoT plugins (YEP_X_ExtDoT) and native regen hooks.
 * ============================================================= */

BattleManager.pushPassiveLogEntry = function(targetName, amount, sourceName, isHeal) {
    ensureBM();
    if (!$gameParty.inBattle()) return;

    const sentence = isHeal
        ? (targetName + " recovered " + amount + " HP from " + sourceName + ".")
        : (targetName + " took " + amount + " HP damage from " + sourceName + ".");

    BattleManager._turnActions.push({
        subject: sentence,
        skill: "",
        log: [],
        passive: true
    });
};

/* =============================================================
 * NATIVE REGEN / POISON HOOKS
 * TRAIT_XPARAM = 22. HRG = dataId 7. MRG = dataId 8.
 * ============================================================= */

const _Game_Battler_regenerateHp = Game_Battler.prototype.regenerateHp;
Game_Battler.prototype.regenerateHp = function() {
    const hpBefore = this._hp;
    _Game_Battler_regenerateHp.call(this);

    const hpDiff = this._hp - hpBefore;

    if (hpDiff !== 0 && $gameParty.inBattle()) {
        let sourceName = hpDiff > 0 ? "HP Regen" : "Poison";

        for (let i = 0; i < this._states.length; i++) {
            const state = $dataStates[this._states[i]];
            if (!state || !state.traits) continue;

            for (let j = 0; j < state.traits.length; j++) {
                const t = state.traits[j];

                if (
                    t.code === 22 &&
                    t.dataId === 7 &&
                    (hpDiff > 0 ? t.value > 0 : t.value < 0)
                ) {
                    sourceName = state.name;
                    i = this._states.length;
                    break;
                }
            }
        }

        BattleManager.pushPassiveLogEntry(
            this.name(),
            Math.abs(hpDiff),
            sourceName,
            hpDiff > 0
        );
    }
};

const _Game_Battler_regenerateMp = Game_Battler.prototype.regenerateMp;
Game_Battler.prototype.regenerateMp = function() {
    const mpBefore = this._mp;
    _Game_Battler_regenerateMp.call(this);

    const mpDiff = this._mp - mpBefore;

    if (mpDiff !== 0 && $gameParty.inBattle()) {
        let sourceName = mpDiff > 0 ? "MP Regen" : "MP Drain";

        for (let i = 0; i < this._states.length; i++) {
            const state = $dataStates[this._states[i]];
            if (!state || !state.traits) continue;

            for (let j = 0; j < state.traits.length; j++) {
                const t = state.traits[j];

                if (
                    t.code === 22 &&
                    t.dataId === 8 &&
                    (mpDiff > 0 ? t.value > 0 : t.value < 0)
                ) {
                    sourceName = state.name;
                    i = this._states.length;
                    break;
                }
            }
        }

        BattleManager.pushPassiveLogEntry(
            this.name(),
            Math.abs(mpDiff),
            sourceName,
            mpDiff > 0
        );
    }
};

/* =============================================================
 * CORE LOGGING
 * ============================================================= */

const _BattleManager_startAction = BattleManager.startAction;
BattleManager.startAction = function(subject, action, targets) {
    ensureBM();

    const actualSubject = subject || BattleManager._subject;
    const actualAction =
        action ||
        (actualSubject && actualSubject.currentAction
            ? actualSubject.currentAction()
            : null);

    const item =
        actualAction && actualAction.item
            ? actualAction.item()
            : null;

    BattleManager._actionLog = {
        subject: actualSubject ? actualSubject.name() : "",
        skill: item ? item.name : "",
        log: [],
        instant: isInstantCastAction(actualSubject, item),
        sequence: BattleManager._actionSequence++
    };

    _BattleManager_startAction.call(this, subject, action, targets);
};

const _Window_BattleLog_addText = Window_BattleLog.prototype.addText;
Window_BattleLog.prototype.addText = function(text) {
    if (BattleManager._actionLog) {
        BattleManager._actionLog.log.push(text);
    }
    _Window_BattleLog_addText.call(this, text);
};

const _BattleManager_endAction = BattleManager.endAction;
BattleManager.endAction = function() {
    ensureBM();

    if (BattleManager._actionLog) {
        // Don't add instant cast actions to turn actions yet
        // They'll be added when the turn actually ends
        if (!BattleManager._actionLog.instant) {
            BattleManager._turnActions.push({
                subject: BattleManager._actionLog.subject,
                skill: BattleManager._actionLog.skill,
                log: BattleManager._actionLog.log.slice(),
                instant: BattleManager._actionLog.instant,
                sequence: BattleManager._actionLog.sequence
            });
        } else {
            // Store instant cast actions separately to add them later
            if (!BattleManager._deferredInstantActions) {
                BattleManager._deferredInstantActions = [];
            }
            BattleManager._deferredInstantActions.push({
                subject: BattleManager._actionLog.subject,
                skill: BattleManager._actionLog.skill,
                log: BattleManager._actionLog.log.slice(),
                instant: BattleManager._actionLog.instant,
                sequence: BattleManager._actionLog.sequence
            });
        }

        BattleManager._actionLog = null;
    }

    _BattleManager_endAction.call(this);
};

const _BattleManager_startTurn = BattleManager.startTurn;
BattleManager.startTurn = function() {
    ensureBM();
    // Reset sequence counter at the start of each turn
    BattleManager._actionSequence = 0;
    _BattleManager_startTurn.call(this);
};

/* =============================================================
 * PARTY COMMAND
 * ============================================================= */

const _Window_PartyCommand_makeCommandList =
    Window_PartyCommand.prototype.makeCommandList;

Window_PartyCommand.prototype.makeCommandList = function() {
    _Window_PartyCommand_makeCommandList.call(this);
    ensureBM();

    const enabled =
        BattleManager._combatTimeline &&
        BattleManager._combatTimeline.length > 0;

    this.addCommand("Combat Log", "combatLog", enabled);

    if (BattleManager.isInputting() && BattleManager._turnActions.length > 0) {
        const turn =
            $gameTroop && $gameTroop.turnCount
                ? $gameTroop.turnCount()
                : 0;

        if (turn > 0) {
            // Include any deferred instant cast actions
            let allActions = BattleManager._turnActions.slice();
            if (BattleManager._deferredInstantActions && BattleManager._deferredInstantActions.length > 0) {
                allActions = allActions.concat(BattleManager._deferredInstantActions);
                BattleManager._deferredInstantActions = [];
            }

            // Separate instant cast from normal actions
            const instantCast = allActions.filter(a => a.instant);
            const normalActions = allActions.filter(a => !a.instant);
            
            // Sort each group by sequence, then combine (instant first, then normal)
            instantCast.sort(function(a, b) {
                return a.sequence - b.sequence;
            });
            normalActions.sort(function(a, b) {
                return a.sequence - b.sequence;
            });
            
            const sortedActions = instantCast.concat(normalActions);

            BattleManager._combatTimeline.push({
                turn: turn,
                entries: sortedActions
            });

            BattleManager._turnActions = [];
        }
    }
};

/* =============================================================
 * SCENE HOOK
 * ============================================================= */

const _Scene_Battle_createPartyCommandWindow =
    Scene_Battle.prototype.createPartyCommandWindow;

Scene_Battle.prototype.createPartyCommandWindow = function() {
    _Scene_Battle_createPartyCommandWindow.call(this);

    this._partyCommandWindow.setHandler(
        "combatLog",
        this.commandCombatLog.bind(this)
    );

    ensureBM();

    if (BattleManager._combatLogReturnFocus) {
        BattleManager._combatLogReturnFocus = false;
        this._partyCommandWindow.selectSymbol("combatLog");
    }
};

Scene_Battle.prototype.commandCombatLog = function() {
    const t = BattleManager._combatTimeline;

    if (!t || t.length === 0) {
        SoundManager.playBuzzer();
        this._partyCommandWindow.activate();
        return;
    }

    SceneManager.push(Scene_CombatLog);
};

const _BattleManager_startInput = BattleManager.startInput;
BattleManager.startInput = function() {
    _BattleManager_startInput.call(this);
};

const _BattleManager_inputtingAction = BattleManager.inputtingAction;
BattleManager.inputtingAction = function() {
    // Save state right when we're about to ask for player input (before any removal happens)
    const allBattlers = $gameParty.members().concat($gameTroop.members());
    const savedStates = [];
    
    for (const battler of allBattlers) {
        savedStates.push({
            battler: battler,
            states: battler._states.slice(),
            stateTurns: battler._stateTurns ? Object.assign({}, battler._stateTurns) : {}
        });
    }
    
    BattleManager._savedBattleState = {
        phase: this._phase,
        turn: this._turn,
        actor: this._actor,
        subject: this._subject,
        actionBattlers: this._actionBattlers ? this._actionBattlers.slice() : [],
        battlerStates: savedStates
    };
    
    return _BattleManager_inputtingAction.call(this);
};

const _BattleManager_endBattle = BattleManager.endBattle;
BattleManager.endBattle = function(result) {
    // Clear combat log at end of battle
    ensureBM();
    BattleManager._combatTimeline = [];
    BattleManager._turnActions = [];
    BattleManager._deferredInstantActions = [];
    BattleManager._actionSequence = 0;
    BattleManager._savedBattleState = null;
    
    _BattleManager_endBattle.call(this, result);
};

/* =============================================================
 * SCENE
 * ============================================================= */

function Scene_CombatLog() {
    this.initialize.apply(this, arguments);
}

Scene_CombatLog.prototype = Object.create(Scene_MenuBase.prototype);
Scene_CombatLog.prototype.constructor = Scene_CombatLog;

Scene_CombatLog.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
    this._focus = "list";
};

Scene_CombatLog.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this.createWindows();
};

Scene_CombatLog.prototype.activateList = function() {
    this._focus = "list";
    this._view.deactivate();
    this._list.activate();
};

Scene_CombatLog.prototype.activateView = function() {
    this._focus = "view";
    this._list.deactivate();
    this._view.activate();
};

Scene_CombatLog.prototype.createWindows = function() {
    const w1 = 260;
    const w2 = Graphics.boxWidth - w1;

    this._list = new Window_CombatLogList(0, 0, w1, Graphics.boxHeight);
    this._view = new Window_CombatLogView(w1, 0, w2, Graphics.boxHeight);

    this._list.setHandler("ok", this.onListOk.bind(this));
    this._list.setHandler("cancel", this.onListCancel.bind(this));
    this._view.setHandler("cancel", this.onViewCancel.bind(this));

    this.addWindow(this._list);
    this.addWindow(this._view);

    this.activateList();
};

Scene_CombatLog.prototype.onListOk = function() {
    const data = timelineEntryAt(this._list.index());
    if (!data) return;
    this._view.setData(data);
    this.activateView();
};

Scene_CombatLog.prototype.onListCancel = function() {
    this.onCancel();
};

Scene_CombatLog.prototype.onViewCancel = function() {
    this.onCancel();
};

Scene_CombatLog.prototype.onCancel = function() {
    if (this._focus === "view") {
        this.activateList();
    } else {
        if (BattleManager._savedBattleState) {
            const saved = BattleManager._savedBattleState;
            BattleManager._phase = saved.phase;
            BattleManager._turn = saved.turn;
            BattleManager._actor = saved.actor;
            BattleManager._subject = saved.subject;
            BattleManager._actionBattlers = saved.actionBattlers.slice();
            
            // Restore all battler states
            for (const stateData of saved.battlerStates) {
                stateData.battler._states = stateData.states.slice();
                stateData.battler._stateTurns = Object.assign({}, stateData.stateTurns);
            }
            
            BattleManager._savedBattleState = null;
        }
        BattleManager._combatLogReturnFocus = true;
        SceneManager.pop();
    }
};

/* =============================================================
 * WINDOW: LIST
 * ============================================================= */

window.Window_CombatLogList = function() {
    this.initialize.apply(this, arguments);
};

Window_CombatLogList.prototype = Object.create(Window_Selectable.prototype);
Window_CombatLogList.prototype.constructor = Window_CombatLogList;

Window_CombatLogList.prototype.initialize = function(x, y, w, h) {
    Window_Selectable.prototype.initialize.call(this, x, y, w, h);
    this.refresh();
    this.select(0);
};

Window_CombatLogList.prototype.maxItems = function() {
    return BattleManager._combatTimeline.length;
};

Window_CombatLogList.prototype.drawItem = function(index) {
    const d = timelineEntryAt(index);
    if (!d) return;

    const rect = this.itemRectForText(index);
    this.drawText("Turn " + d.turn, rect.x, rect.y, rect.width, 'center');
};

/* =============================================================
 * WINDOW: VIEW
 * ============================================================= */

window.Window_CombatLogView = function() {
    this.initialize.apply(this, arguments);
};

Window_CombatLogView.prototype = Object.create(Window_Selectable.prototype);
Window_CombatLogView.prototype.constructor = Window_CombatLogView;

Window_CombatLogView.prototype.initialize = function(x, y, w, h) {
    this._data = null;
    this._entries = [];
    this._logScrollY = 0;

    Window_Selectable.prototype.initialize.call(this, x, y, w, h);
    this.refresh();
};

Window_CombatLogView.prototype.setData = function(data) {
    this._data = data;
    this._entries = (data && data.entries) ? data.entries : [];
    this._logScrollY = 0;

    this.select(0);
    this.refresh();
};

Window_CombatLogView.prototype.maxItems = function() {
    return this._entries ? this._entries.length : 0;
};

Window_CombatLogView.prototype.entryHeight = function(index) {
    const entry = this._entries[index];
    if (!entry) return this.lineHeight();

    if (entry.passive) return this.lineHeight() * 2;

    return this.lineHeight() * (2 + entry.log.length);
};

Window_CombatLogView.prototype.entryY = function(index) {
    let y = this.lineHeight();

    for (let i = 0; i < index; i++) {
        y += this.entryHeight(i);
    }

    return y;
};

Window_CombatLogView.prototype.overallHeight = function() {
    return this.entryY(this.maxItems());
};

Window_CombatLogView.prototype.maxScrollY = function() {
    return Math.max(0, this.overallHeight() - this.contentsHeight());
};

Window_CombatLogView.prototype.itemRect = function(index) {
    const rect = new Rectangle();
    rect.x = 0;
    rect.width = this.contentsWidth();
    rect.y = this.entryY(index) - this._logScrollY;
    rect.height = this.entryHeight(index) - this.lineHeight();
    return rect;
};

Window_CombatLogView.prototype.isCurrentItemEnabled = function() {
    return false;
};

Window_CombatLogView.prototype.drawAllItems = function() {
    for (let i = 0; i < this.maxItems(); i++) {
        this.drawItem(i);
    }
};

Window_CombatLogView.prototype.drawItem = function(index) {
    const entry = this._entries[index];
    if (!entry) return;

    const rect = this.itemRect(index);

    if (rect.y + rect.height <= 0 || rect.y >= this.contentsHeight()) return;

    let y = rect.y;

    if (entry.passive) {
        this.drawText(entry.subject, rect.x, y, rect.width);
    } else {
        this.drawText(entry.subject + " → " + entry.skill, rect.x, y, rect.width);

        y += this.lineHeight();

        for (const line of entry.log) {
            this.drawText(line, rect.x, y, rect.width);
            y += this.lineHeight();
        }
    }
};

Window_CombatLogView.prototype.ensureCursorVisible = function() {
    if (this.index() < 0 || !this._entries[this.index()]) return;

    const visible = this.contentsHeight();
    const entryY = this.entryY(this.index());
    const entryH = this.entryHeight(this.index());

    let scrollY = this._logScrollY;

    if (entryH >= visible) {
        scrollY = entryY;
    } else if (entryY < scrollY) {
        scrollY = entryY;
    } else if (entryY + entryH > scrollY + visible) {
        scrollY = entryY + entryH - visible;
    }

    scrollY = scrollY.clamp(0, this.maxScrollY());

    if (scrollY !== this._logScrollY) {
        this._logScrollY = scrollY;
        this.refresh();
    }
};

Window_CombatLogView.prototype.refresh = function() {
    this.createContents();

    if (this._data) {
        this.drawText(
            "Turn " + this._data.turn,
            0,
            -this._logScrollY,
            this.contentsWidth()
        );
    } else {
        this.changePaintOpacity(false);
        this.drawText("Select a turn to view details.", 0, 0, this.contentsWidth());
        this.changePaintOpacity(true);
    }

    this.drawAllItems();
};

})();