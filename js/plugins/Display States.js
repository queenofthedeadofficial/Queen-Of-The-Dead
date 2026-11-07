/*:
 * @plugindesc Displays battler state names as scene-level overlay, cycling every 60 frames.
 * Compatible with YEP Battle Status Window. Hides during windows, victory, text boxes.
 * 
 * @param State Font Size
 * @type number
 * @min 1
 * @desc Font size for state names
 * @default 18
 *
 * @param State Y Offset
 * @type number
 * @desc Vertical offset for state text
 * @default 38
 *
 * @param State X Offset
 * @type number
 * @desc Horizontal offset for state text
 * @default 0
 *
 * @param State Outline Width
 * @type number
 * @min 0
 * @decimals 1
 * @desc Boldness of the text outline (0 = no outline, higher = thicker)
 * @default 2
 *
 * @help
 * Displays actor state names on a scene-level overlay.
 * States cycle every 60 frames and respect all standard hide conditions.
 */

(function() {

"use strict";

var parameters = PluginManager.parameters('Display_States');
var stateFont = Number(parameters['State Font Size'] || 18);
var stateYOffset = Number(parameters['State Y Offset'] || 66);
var stateXOffset = Number(parameters['State X Offset'] || 18);
var stateOutlineWidth = Number(parameters['State Outline Width'] || 2.5);

function getAlphabeticalStates(battler) {
    if (!battler) return [];

    return battler.states()
        .filter(function(state) {
            return state && !state.meta["Hide State"];
        })
        .sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });
}

//=============================================================================
// Scene_Battle
//=============================================================================

var _Scene_Battle_initialize = Scene_Battle.prototype.initialize;
Scene_Battle.prototype.initialize = function() {
    _Scene_Battle_initialize.call(this);
    this._stateOverlaySprite = null;
    this._stateIndex = [];
    this._stateCycleFrame = 0;
    this._messageWasActive = false;
};

var _Scene_Battle_createDisplayObjects = Scene_Battle.prototype.createDisplayObjects;
Scene_Battle.prototype.createDisplayObjects = function() {
    _Scene_Battle_createDisplayObjects.call(this);
    this.createStateOverlaySprite();
};

Scene_Battle.prototype.createStateOverlaySprite = function() {
    // Create a single sprite covering the entire screen for all state displays
    this._stateOverlaySprite = new Sprite();
    this._stateOverlaySprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
    this._stateOverlaySprite.z = 10; // Above windows but below popups
    this._stateOverlaySprite.visible = true;
    this.addChild(this._stateOverlaySprite);
};

var _Scene_Battle_update = Scene_Battle.prototype.update;
Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);
    this.updateStateOverlay();
};

Scene_Battle.prototype.updateStateOverlay = function() {
    if (!this._stateOverlaySprite) return;
    
    var statusWindow = this._statusWindow;
    if (!statusWindow) {
        this._stateOverlaySprite.visible = false;
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
        this._messageWasActive = true;
        this._messageGracePeriod = 5;
    }
    
    // Decrement grace period
    if (this._messageGracePeriod > 0) {
        this._messageGracePeriod--;
    }
    
    var textBoxHidden = this._messageWasActive && (messageActive || this._messageGracePeriod > 0);
    
    var shouldHide = skillWindowActive || itemWindowActive || inBattleEnemyStateListActive || inVictoryPhase || battleEnded || sceneChanging || textBoxHidden;
    
    this._stateOverlaySprite.visible = !shouldHide;
    
    // Update state cycle
    this._stateCycleFrame++;
    if (this._stateCycleFrame >= 60) {
        this._stateCycleFrame = 0;
        
        var battleMembers = $gameParty.battleMembers();
        for (var i = 0; i < battleMembers.length; i++) {
            var battler = battleMembers[i];
            if (!battler) continue;
            
            var states = getAlphabeticalStates(battler);
            
            if (this._stateIndex[i] === undefined)
                this._stateIndex[i] = 0;
            
            if (states.length > 0) {
                this._stateIndex[i]++;
                if (this._stateIndex[i] >= states.length)
                    this._stateIndex[i] = 0;
            } else {
                this._stateIndex[i] = 0;
            }
        }
    }
    
    // Clear and redraw all states
    this._stateOverlaySprite.bitmap.clear();
    
    if (!shouldHide) {
        var battleMembers = $gameParty.battleMembers();
        for (var i = 0; i < battleMembers.length; i++) {
            this.drawActorStateOnOverlay(i, statusWindow);
        }
    }
};

Scene_Battle.prototype.drawActorStateOnOverlay = function(index, statusWindow) {
    var actor = $gameParty.battleMembers()[index];
    if (!actor) return;
    
    var states = getAlphabeticalStates(actor);
    if (!states.length) return;
    
    if (this._stateIndex[index] === undefined)
        this._stateIndex[index] = 0;
    
    var state = states[this._stateIndex[index]];
    if (!state) return;
    
    var bitmap = this._stateOverlaySprite.bitmap;
    var itemRect = statusWindow.itemRect(index);
    
    // Get the absolute position of the status window
    var windowX = statusWindow.x;
    var windowY = statusWindow.y;
    
    // Position relative to item rect with offsets
    var screenX = windowX + itemRect.x + stateXOffset;
    var screenY = windowY + itemRect.y + statusWindow.lineHeight() * 2 + stateYOffset;
    
    // Use direct canvas rendering
    var ctx = bitmap._context;
    ctx.save();
    
    ctx.font = stateFont + 'px Jersey10-Regular';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = stateOutlineWidth;
    ctx.fillStyle = '#ffffff';
    
    ctx.strokeText(state.name, screenX + itemRect.width / 2, screenY);
    ctx.fillText(state.name, screenX + itemRect.width / 2, screenY);
    
    ctx.restore();
};

})();