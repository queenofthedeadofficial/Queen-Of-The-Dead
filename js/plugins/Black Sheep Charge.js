//=============================================================================
// Andrew_PartySlotNumbers.js
//=============================================================================

/*:
 * @plugindesc v1.00 Displays a number (using the white digit graphics from
 * img/system/Damage.png) above specific actor battle sprite slots, driven
 * by switches 549 and 550.
 * @author Andrew
 *
 * @help
 * ============================================================================
 * Andrew_PartySlotNumbers.js
 * ============================================================================
 *
 * While Switch 549 is ON, the following numbers are displayed above the
 * actor sprite in each party slot (battle member index, 0-based):
 *
 *   Slot 0 -> 4
 *   Slot 1 -> 3
 *   Slot 2 -> 2
 *   Slot 3 -> 1
 *
 * While Switch 550 is ON, the following numbers are displayed instead:
 *
 *   Slot 0 -> 1
 *   Slot 1 -> 2
 *   Slot 2 -> 3
 *   Slot 3 -> 4
 *
 * If both switches are ON at the same time, Switch 549's mapping takes
 * priority. If neither switch is ON, no numbers are shown.
 *
 * The numbers are drawn using the white digit row (row 0) of
 * img/system/Damage.png -- the same graphic used for normal, non-critical,
 * non-heal damage pop-ups -- so they automatically match whatever custom
 * Damage.png you're using, with no separate image required.
 *
 * NOTE ON SLOT NUMBERING: the original request listed "slot 4" for the
 * Switch 549 mapping but "slot 3" for the equivalent position in the
 * Switch 550 mapping. A standard party only has slots 0-3, so this plugin
 * assumes that was a typo and uses slot 3 in both mappings, producing a
 * clean mirrored 4-3-2-1 / 1-2-3-4 pattern. If a 5th slot (index 4) is
 * really needed, or slot 3 should genuinely be skipped for switch 549,
 * edit SWITCH_549_MAP / SWITCH_550_MAP below -- they're plain objects
 * keyed by slot index.
 *
 * NOTE ON POSITIONING (v1.01): this version positions numbers using the
 * battle status window's per-actor item rects (STATUS_WINDOW_PROPERTY,
 * default '_statusWindow'), NOT the default Sprite_Actor battler sprite
 * positions. In front-view battle with a custom face/portrait status
 * window (e.g. YEP_X_InBattleStatus), the actual battler sprites are
 * invisible and sit at MV's default stacked "attack lunge" home
 * positions near the top-right of the screen -- nowhere near the
 * portraits the player actually sees. If your status window is stored
 * under a different property name on Scene_Battle, change
 * STATUS_WINDOW_PROPERTY below to match (open the console during battle
 * and inspect SceneManager._scene to find it).
 *
 * ============================================================================
 */

(function() {

    var SWITCH_549_ID = 549;
    var SWITCH_550_ID = 550;
    var SWITCH_549_MAP = { 0: 4, 1: 3, 2: 2, 3: 1 };
    var SWITCH_550_MAP = { 0: 1, 1: 2, 2: 3, 3: 4 };
    var Y_OFFSET = 24; // gap above the top of the status window, in pixels
    var STATUS_WINDOW_PROPERTY = '_statusWindow'; // Scene_Battle's party status window

    //-------------------------------------------------------------------
    // Sprite_AndrewSlotNumber
    // Renders a single digit (0-9) using the white digit row of
    // img/system/Damage.png.
    //-------------------------------------------------------------------

    function Sprite_AndrewSlotNumber() {
        this.initialize.apply(this, arguments);
    }

    Sprite_AndrewSlotNumber.prototype = Object.create(Sprite.prototype);
    Sprite_AndrewSlotNumber.prototype.constructor = Sprite_AndrewSlotNumber;

    Sprite_AndrewSlotNumber.prototype.initialize = function() {
        Sprite.prototype.initialize.call(this);
        this.bitmap = ImageManager.loadSystem('Damage');
        this.anchor.x = 0.5;
        this.anchor.y = 1;
        this._digit = null;
        this.visible = false;
    };

    Sprite_AndrewSlotNumber.prototype.digitWidth = function() {
        return this.bitmap ? Math.floor(this.bitmap.width / 10) : 0;
    };

    Sprite_AndrewSlotNumber.prototype.digitHeight = function() {
        return this.bitmap ? Math.floor(this.bitmap.height / 5) : 0;
    };

    Sprite_AndrewSlotNumber.prototype.setDigit = function(digit) {
        if (this._digit === digit) return;
        this._digit = digit;
        if (digit === null) {
            this.visible = false;
            return;
        }
        var w = this.digitWidth();
        var h = this.digitHeight();
        if (w <= 0 || h <= 0) {
            // Bitmap not finished loading yet -- retry once it is.
            var self = this;
            this.bitmap.addLoadListener(function() {
                self._digit = null;
                self.setDigit(digit);
            });
            return;
        }
        this.setFrame(digit * w, 0, w, h);
        this.visible = true;
    };

    //-------------------------------------------------------------------
    // Spriteset_Battle
    //-------------------------------------------------------------------

    var _Spriteset_Battle_createLowerLayer = Spriteset_Battle.prototype.createLowerLayer;
    Spriteset_Battle.prototype.createLowerLayer = function() {
        _Spriteset_Battle_createLowerLayer.call(this);
        this.createAndrewSlotNumbers();
    };

    Spriteset_Battle.prototype.createAndrewSlotNumbers = function() {
        this._andrewSlotNumberSprites = [];
        var maxSlots = $gameParty.maxBattleMembers();
        for (var i = 0; i < maxSlots; i++) {
            var sprite = new Sprite_AndrewSlotNumber();
            this._andrewSlotNumberSprites.push(sprite);
            this._battleField.addChild(sprite);
        }
    };

    var _Spriteset_Battle_update = Spriteset_Battle.prototype.update;
    Spriteset_Battle.prototype.update = function() {
        _Spriteset_Battle_update.call(this);
        this.updateAndrewSlotNumbers();
    };

    Spriteset_Battle.prototype.andrewCurrentSlotMap = function() {
        if ($gameSwitches.value(SWITCH_549_ID)) return SWITCH_549_MAP;
        if ($gameSwitches.value(SWITCH_550_ID)) return SWITCH_550_MAP;
        return null;
    };

    Spriteset_Battle.prototype.andrewStatusWindow = function() {
        var scene = SceneManager._scene;
        return scene ? scene[STATUS_WINDOW_PROPERTY] : null;
    };

    Spriteset_Battle.prototype.updateAndrewSlotNumbers = function() {
        if (!this._andrewSlotNumberSprites) return;
        var map = this.andrewCurrentSlotMap();
        var statusWindow = this.andrewStatusWindow();
        for (var i = 0; i < this._andrewSlotNumberSprites.length; i++) {
            var numberSprite = this._andrewSlotNumberSprites[i];
            var members = $gameParty.battleMembers();
            var digit = (map && statusWindow && members[i]) ? map[i] : undefined;
            if (digit === undefined) {
                numberSprite.setDigit(null);
                continue;
            }
            var rect = statusWindow.itemRect(i);
            var padding = statusWindow.standardPadding ? statusWindow.standardPadding() : statusWindow.padding;
            numberSprite.x = statusWindow.x + padding + rect.x + rect.width / 2;
            numberSprite.y = statusWindow.y - Y_OFFSET;
            numberSprite.setDigit(digit);
        }
    };

})();