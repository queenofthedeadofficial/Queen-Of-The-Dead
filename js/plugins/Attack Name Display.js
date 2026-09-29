/*:
 * @plugindesc Shows selected action below each actor's name (144x36 box) only in base battle command phase. Sprite overlay version (YEP-safe), same hide conditions as Transparent_HP_MP_Gauges.js.
 */

(function() {
"use strict";

window._actorSelectedActions = {};

//
// --------------------------------------------------
// CONFIG (EDIT HERE)
// --------------------------------------------------
//
var OFFSET_X = 20;    // horizontal fine-tune, relative to status slot
var OFFSET_Y = -132;  // vertical fine-tune, relative to status slot
var BOX_WIDTH = 144;
var BOX_HEIGHT = 36;
var FONT_SIZE = 16;

//-----------------------------------------------------------------------------
// Load custom font
//-----------------------------------------------------------------------------

Graphics.loadFont('Jersey10', 'fonts/Jersey10-Regular.ttf');

//-----------------------------------------------------------------------------
// Capture actions (skills/items)
//-----------------------------------------------------------------------------

const _Game_Action_setSkill = Game_Action.prototype.setSkill;
Game_Action.prototype.setSkill = function(skillId) {
    _Game_Action_setSkill.call(this, skillId);
    const subject = this.subject();
    if (subject && subject.isActor() && SceneManager._scene instanceof Scene_Battle) {
        const skill = $dataSkills[skillId];
        if (skill) window._actorSelectedActions[subject.actorId()] = skill.name;
    }
};

const _Game_Action_setItem = Game_Action.prototype.setItem;
Game_Action.prototype.setItem = function(itemId) {
    _Game_Action_setItem.call(this, itemId);
    const subject = this.subject();
    if (subject && subject.isActor() && SceneManager._scene instanceof Scene_Battle) {
        const item = $dataItems[itemId];
        if (item) window._actorSelectedActions[subject.actorId()] = item.name;
    }
};

//-----------------------------------------------------------------------------
// Clear actions
//-----------------------------------------------------------------------------

const _Window_ActorCommand_processCancel = Window_ActorCommand.prototype.processCancel;
Window_ActorCommand.prototype.processCancel = function() {
    if (this._actor) window._actorSelectedActions[this._actor.actorId()] = null;
    _Window_ActorCommand_processCancel.call(this);
};

const _BattleManager_startAction = BattleManager.startAction;
BattleManager.startAction = function() {
    const subject = this._subject;
    if (subject && subject.isActor()) window._actorSelectedActions[subject.actorId()] = null;
    _BattleManager_startAction.call(this);
};

// BattleManager.clearInputtingAction() is the real "deselect" path: YEP_BattleEngineCore
// calls it from onSkillCancel/onItemCancel (backing out of the Skill/Item list to the
// actor command window) and from onActorCancel/onEnemyCancel (backing out of target
// selection). Both null the actor's real Game_Action item without going through
// Window_ActorCommand.processCancel or BattleManager.startAction, so without this hook
// the cached label goes stale -- still showing a skill/item that's no longer selected
// (or, thanks to per-row help/preview scans in the skill list, one that was only
// hovered over and never actually confirmed).
if (BattleManager.clearInputtingAction) {
    const _BattleManager_clearInputtingAction = BattleManager.clearInputtingAction;
    BattleManager.clearInputtingAction = function() {
        const actor = this.actor();
        if (actor && actor.isActor()) window._actorSelectedActions[actor.actorId()] = null;
        _BattleManager_clearInputtingAction.call(this);
    };
}

//-----------------------------------------------------------------------------
// Clear stored action names at the start of each turn's input
//-----------------------------------------------------------------------------

const _BattleManager_startInput = BattleManager.startInput;
BattleManager.startInput = function() {
    window._actorSelectedActions = {};
    _BattleManager_startInput.call(this);
};

//-----------------------------------------------------------------------------
// SCENE_BATTLE INITIALIZATION
//-----------------------------------------------------------------------------

const _Scene_Battle_initialize = Scene_Battle.prototype.initialize;
Scene_Battle.prototype.initialize = function() {
    _Scene_Battle_initialize.call(this);
    this._actionTextOverlaySprite = null;
    this._actionTextMessageWasActive = false;
};

const _Scene_Battle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
Scene_Battle.prototype.createDisplayObjects = function() {
    _Scene_Battle_createDisplayObjects.call(this);
    this.createActionTextOverlaySprite();
};

Scene_Battle.prototype.createActionTextOverlaySprite = function() {
    // Single sprite covering the entire screen for all actors' action text
    this._actionTextOverlaySprite = new Sprite();
    this._actionTextOverlaySprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
    this._actionTextOverlaySprite.z = 10; // Above windows but below popups
    this._actionTextOverlaySprite.visible = true;
    this.addChild(this._actionTextOverlaySprite);
};

const _Scene_Battle_update = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);
    this.updateActionTextOverlay();
};

Scene_Battle.prototype.updateActionTextOverlay = function() {
    if (!this._actionTextOverlaySprite) return;

    const statusWindow = this._statusWindow;
    if (!statusWindow) {
        this._actionTextOverlaySprite.visible = false;
        return;
    }

    // Hide when skill, item, or ADRI enemy scan windows are active
    var skillWindowActive = this._skillWindow && this._skillWindow.active;
    var itemWindowActive = this._itemWindow && this._itemWindow.active;
    var inBattleEnemyStateListActive = this._inBattleEnemyStateList && this._inBattleEnemyStateList.active;

    // Hide during victory aftermath (YEP_VictoryAftermath)
    var inVictoryPhase = BattleManager.isVictoryPhase && BattleManager.isVictoryPhase();

    // Hide during/after battle end (during transition back to map)
    var battleEnded = !BattleManager.isBattleTest && BattleManager._battlePhase === 'battleEnd';
    var sceneChanging = SceneManager.isSceneChanging();

    // Track message activity - once a message appears, stay hidden for a brief grace period
    var messageActive = $gameMessage && ($gameMessage.isBusy() || ($gameMessage._texts && $gameMessage._texts.length > 0));
    if (messageActive) {
        this._actionTextMessageWasActive = true;
        this._actionTextMessageGracePeriod = 5; // 5 frames of grace period after message ends
    }

    // Decrement grace period
    if (this._actionTextMessageGracePeriod > 0) {
        this._actionTextMessageGracePeriod--;
    }

    var textBoxHidden = this._actionTextMessageWasActive && (messageActive || this._actionTextMessageGracePeriod > 0);

    // Only show during base actor command input (this plugin's own condition)
    const scene = SceneManager._scene;
    var notInBaseCommandInput = !BattleManager.isInputting() ||
        !BattleManager.actor() ||
        !scene._actorCommandWindow ||
        !scene._actorCommandWindow.active;

    var shouldHide = skillWindowActive || itemWindowActive || inBattleEnemyStateListActive ||
        inVictoryPhase || battleEnded || sceneChanging || textBoxHidden || notInBaseCommandInput;

    this._actionTextOverlaySprite.visible = !shouldHide;

    if (!shouldHide) {
        this._actionTextOverlaySprite.bitmap.clear();

        const members = $gameParty.battleMembers();
        for (let i = 0; i < members.length; i++) {
            this.drawActionTextOnOverlay(i, statusWindow, members[i]);
        }
    } else {
        this._actionTextOverlaySprite.bitmap.clear();
    }
};

Scene_Battle.prototype.drawActionTextOnOverlay = function(index, statusWindow, actor) {
    if (!actor) return;

    const actionName = window._actorSelectedActions[actor.actorId()];
    if (!actionName) return;

    const bitmap = this._actionTextOverlaySprite.bitmap;
    bitmap.fontFace = 'Jersey10';
    bitmap.fontSize = FONT_SIZE;

    const rect = statusWindow.itemRect(index);
    const screenX = statusWindow.x + rect.x + OFFSET_X;
    const screenY = statusWindow.y + rect.y + rect.height + OFFSET_Y;

    // Vertical centering within the box
    const verticalOffset = Math.floor((BOX_HEIGHT - FONT_SIZE) / 2);

    bitmap.drawText(actionName, screenX, screenY + verticalOffset, BOX_WIDTH, FONT_SIZE, 'center');
};

})();