/*:
 * @plugindesc Displays battler state names under actor names in the Main Menu status window, cycling every N frames.
 * Standalone companion to Display_States.js (battle version).
 *
 * @param Menu State Font Size
 * @type number
 * @min 1
 * @desc Font size for state names
 * @default 18
 *
 * @param Menu State Y Offset
 * @type number
 * @desc Vertical offset (from directly under the name line)
 * @default 0
 *
 * @param Menu State X Offset
 * @type number
 * @desc Horizontal offset (from centered under the name)
 * @default 0
 *
 * @param Menu State Outline Width
 * @type number
 * @min 0
 * @decimals 1
 * @desc Boldness of the text outline (0 = no outline, higher = thicker)
 * @default 2
 *
 * @param Cycle Frames
 * @type number
 * @min 1
 * @desc How many frames between state cycles
 * @default 60
 *
 * @help
 * ============================================================================
 * Display States - Main Menu
 * ============================================================================
 * Companion to Display_States.js. Adds the same cycling state-name overlay
 * to the main menu's actor status window (Window_MenuStatus), aligned
 * directly underneath each actor's name.
 *
 * HOW ALIGNMENT WORKS:
 * This plugin does NOT hardcode a Window_MenuStatus layout. It aliases
 * Window_Base.prototype.drawActorName and records the exact local (x, y,
 * width) used to draw each actor's name whenever Window_MenuStatus draws it.
 * The overlay then draws state text centered under that recorded position.
 * This means it should stay aligned even if a YEP (or other) plugin moves
 * the name around within the window - as long as drawActorName is still the
 * method used to draw it.
 *
 * If your menu status window draws names some other way (not via
 * drawActorName), the overlay won't find a position and simply won't draw
 * for that actor - use the X/Y Offset params to nudge things, or let me know
 * what draws the name in your setup and I'll hook the right method instead.
 *
 * Load order: below YEP menu plugins, same convention as other Andrew_
 * plugins.
 * ============================================================================
 */

(function() {

"use strict";

var parameters = PluginManager.parameters('Display States Menu');
var menuStateFont = Number(parameters['Menu State Font Size'] || 18);
var menuStateYOffset = Number(parameters['Menu State Y Offset'] || 0);
var menuStateXOffset = Number(parameters['Menu State X Offset'] || 0);
var menuStateOutlineWidth = Number(parameters['Menu State Outline Width'] || 2);
var menuStateCycleFrames = Number(parameters['Cycle Frames'] || 60);

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
// Window_Base - capture actor name draw position whenever Window_MenuStatus
// draws it, regardless of what layout logic decided the position.
//=============================================================================

var _Window_Base_drawActorName = Window_Base.prototype.drawActorName;
Window_Base.prototype.drawActorName = function(actor, x, y, width) {
    _Window_Base_drawActorName.call(this, actor, x, y, width);
    if (actor && this instanceof Window_MenuStatus) {
        this._menuStateNamePos = this._menuStateNamePos || {};
        this._menuStateNamePos[actor.actorId()] = {
            x: x,
            y: y,
            width: width || 168
        };
    }
};

//=============================================================================
// Scene_Menu
//=============================================================================

var _Scene_Menu_create = Scene_Menu.prototype.create;
Scene_Menu.prototype.create = function() {
    _Scene_Menu_create.call(this);
    this._menuStateIndex = {};
    this._menuStateCycleFrame = 0;
    this.createMenuStateOverlaySprite();
};

Scene_Menu.prototype.createMenuStateOverlaySprite = function() {
    this._menuStateOverlaySprite = new Sprite();
    this._menuStateOverlaySprite.bitmap = new Bitmap(Graphics.width, Graphics.height);
    this._menuStateOverlaySprite.z = 10; // Above windows but below popups
    this._menuStateOverlaySprite.visible = true;
    this.addChild(this._menuStateOverlaySprite);
};

var _Scene_Menu_update = Scene_Menu.prototype.update;
Scene_Menu.prototype.update = function() {
    _Scene_Menu_update.call(this);
    this.updateMenuStateOverlay();
};

Scene_Menu.prototype.updateMenuStateOverlay = function() {
    if (!this._menuStateOverlaySprite) return;

    var statusWindow = this._statusWindow;
    if (!statusWindow) {
        this._menuStateOverlaySprite.visible = false;
        return;
    }

    var sceneChanging = SceneManager.isSceneChanging();
    var shouldHide = sceneChanging || !statusWindow.visible;

    this._menuStateOverlaySprite.visible = !shouldHide;

    // Update state cycle, keyed by actorId so order changes don't matter
    this._menuStateCycleFrame++;
    if (this._menuStateCycleFrame >= menuStateCycleFrames) {
        this._menuStateCycleFrame = 0;

        $gameParty.members().forEach(function(actor) {
            if (!actor) return;
            var id = actor.actorId();
            var states = getAlphabeticalStates(actor);

            if (this._menuStateIndex[id] === undefined)
                this._menuStateIndex[id] = 0;

            if (states.length > 0) {
                this._menuStateIndex[id]++;
                if (this._menuStateIndex[id] >= states.length)
                    this._menuStateIndex[id] = 0;
            } else {
                this._menuStateIndex[id] = 0;
            }
        }, this);
    }

    // Clear and redraw all states
    this._menuStateOverlaySprite.bitmap.clear();

    if (!shouldHide) {
        $gameParty.members().forEach(function(actor) {
            this.drawActorStateOnMenuOverlay(actor, statusWindow);
        }, this);
    }
};

Scene_Menu.prototype.drawActorStateOnMenuOverlay = function(actor, statusWindow) {
    if (!actor) return;

    var namePos = statusWindow._menuStateNamePos && statusWindow._menuStateNamePos[actor.actorId()];
    if (!namePos) return; // Name hasn't been drawn yet this session

    var states = getAlphabeticalStates(actor);
    if (!states.length) return;

    var id = actor.actorId();
    if (this._menuStateIndex[id] === undefined)
        this._menuStateIndex[id] = 0;

    var state = states[this._menuStateIndex[id]];
    if (!state) return;

    var bitmap = this._menuStateOverlaySprite.bitmap;

    // Left-aligned under the name, one line height below it, plus manual offsets
    var screenX = statusWindow.x + namePos.x + menuStateXOffset;
    var screenY = statusWindow.y + namePos.y + statusWindow.lineHeight() + menuStateYOffset;

    var ctx = bitmap._context;
    ctx.save();

    ctx.font = menuStateFont + 'px Jersey10-Regular';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = menuStateOutlineWidth;
    ctx.fillStyle = '#ffffff';

    ctx.strokeText(state.name, screenX, screenY);
    ctx.fillText(state.name, screenX, screenY);

    ctx.restore();
};

})();