//=============================================================================
// TurnOrderDisplayVertical.js
//=============================================================================

/*:
 * @plugindesc v1.0 Add-on for YEP_X_TurnOrderDisplay: shows the turn order
 * vertically as well as horizontally.
 * @author Andrew
 *
 * @param Orientation
 * @type select
 * @option horizontal
 * @option vertical
 * @desc Default layout of the turn order display.
 * @default vertical
 *
 * @param Vertical Switch ID
 * @type switch
 * @desc 0 = not used. If set, the layout is vertical while this switch is ON
 * and horizontal while it is OFF (overrides Orientation and commands).
 * @default 0
 *
 * @param Vertical Side
 * @type select
 * @option left
 * @option right
 * @desc Which side of the screen the vertical column sits on.
 * @default right
 *
 * @param Vertical Align
 * @type select
 * @option top
 * @option center
 * @option bottom
 * @desc Where the column sits vertically on the screen.
 * @default top
 *
 * @param Vertical Direction
 * @type select
 * @option down
 * @option up
 * @desc down = next battler at the top, later ones below.
 * up = next battler at the bottom, later ones above.
 * @default down
 *
 * @param Vertical Margin X
 * @type number
 * @min 0
 * @desc Gap in pixels between the column and the screen edge.
 * @default 8
 *
 * @param Use Yanfly Position Y
 * @type boolean
 * @on YES
 * @off NO
 * @desc YES = Vertical Offset Y below is ignored and the Position Y setting
 * of YEP_X_TurnOrderDisplay is used instead.
 * @default true
 *
 * @param Vertical Offset Y
 * @type number
 * @min -9999
 * @desc Top align: distance from the top. Bottom align: distance from the
 * bottom. Center align: shifts the column down (negative = up).
 * Only used when Use Yanfly Position Y is NO.
 * @default 54
 *
 * @help
 * This is an add-on for YEP_X_TurnOrderDisplay. It does not replace it.
 * Place it BELOW YEP_X_TurnOrderDisplay in the Plugin Manager.
 *
 * Everything else (icons, colors, notetags, Icon Size, the Performed Spacing
 * option, hiding during large windows, etc.) still comes from the Yanfly
 * plugin. This plugin only changes how the icons are laid out:
 *
 *   horizontal - the normal Yanfly row (its own Position X / Y / Direction
 *                settings apply).
 *   vertical   - a single column. Use the Vertical parameters above.
 *
 * Vertical height: with Use Yanfly Position Y = YES, the Position Y setting of
 * YEP_X_TurnOrderDisplay moves the column. Set it to NO to use Vertical
 * Offset Y instead. (Both only matter for Vertical Align = top, bottom
 * or center as described on each parameter.)
 *
 * Choosing the layout:
 *   - The Orientation parameter sets the starting layout.
 *   - Plugin commands change it during the game (saved with the game):
 *       TurnOrderVertical
 *       TurnOrderHorizontal
 *   - Or set Vertical Switch ID: vertical while ON, horizontal while OFF.
 *     This overrides the parameter and the commands.
 *
 * The layout can be changed in the middle of a battle; the icons slide to
 * their new places. In vertical mode the battler whose target is being
 * selected shifts a little toward the middle of the screen instead of up.
 */

(function() {
    'use strict';

    if (typeof Window_TurnOrderIcon === 'undefined') {
        console.warn('TurnOrderDisplayVertical: YEP_X_TurnOrderDisplay was ' +
            'not found. Place this plugin below it in the Plugin Manager.');
        return;
    }

    //-------------------------------------------------------------------------
    // Parameters
    //-------------------------------------------------------------------------

    function num(value, fallback) {
        var n = Number(value);
        return (value === undefined || value === '' || isNaN(n)) ? fallback : n;
    }

    // Use this file's real name so the parameters still load if it is renamed.
    var pluginName = 'TurnOrderDisplayVertical';
    if (document.currentScript && document.currentScript.src) {
        var match = decodeURIComponent(document.currentScript.src)
            .match(/([^\/\\]+)\.js(?:\?.*)?$/);
        if (match) pluginName = match[1];
    }
    var params = PluginManager.parameters(pluginName);
    var defaultVertical =
        String(params['Orientation'] || 'vertical').toLowerCase() === 'vertical';
    var switchId = num(params['Vertical Switch ID'], 0);
    var side = String(params['Vertical Side'] || 'right').toLowerCase();
    var align = String(params['Vertical Align'] || 'top').toLowerCase();
    var direction = String(params['Vertical Direction'] || 'down').toLowerCase();
    var marginX = num(params['Vertical Margin X'], 8);
    var useYanflyY = String(params['Use Yanfly Position Y'] || 'true') === 'true';
    var customOffsetY = num(params['Vertical Offset Y'], 54);

    function verticalOffsetY() {
        if (useYanflyY && Yanfly && Yanfly.Param &&
            !isNaN(Yanfly.Param.TODPositionY)) {
            return Yanfly.Param.TODPositionY;
        }
        return customOffsetY;
    }

    //-------------------------------------------------------------------------
    // Game_System: remembers the layout chosen by plugin command
    //-------------------------------------------------------------------------

    Game_System.prototype.isTurnOrderVertical = function() {
        if (this._turnOrderVertical === undefined) {
            this._turnOrderVertical = defaultVertical;
        }
        return this._turnOrderVertical;
    };

    Game_System.prototype.setTurnOrderVertical = function(value) {
        this._turnOrderVertical = !!value;
    };

    function isVerticalLayout() {
        if (switchId > 0 && $gameSwitches) return $gameSwitches.value(switchId);
        return $gameSystem ? $gameSystem.isTurnOrderVertical() : defaultVertical;
    }

    //-------------------------------------------------------------------------
    // Plugin commands
    //-------------------------------------------------------------------------

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'TurnOrderVertical') {
            $gameSystem.setTurnOrderVertical(true);
        } else if (command === 'TurnOrderHorizontal') {
            $gameSystem.setTurnOrderVertical(false);
        }
    };

    //-------------------------------------------------------------------------
    // Window_TurnOrderIcon
    //-------------------------------------------------------------------------

    function approach(current, goal) {
        if (current === goal) return current;
        var step = Math.max(1, Math.abs(goal - current) / 4);
        return current < goal ? Math.min(current + step, goal) :
                                Math.max(current - step, goal);
    }

    var _update = Window_TurnOrderIcon.prototype.update;
    Window_TurnOrderIcon.prototype.update = function() {
        // Re-plan the slots whenever the layout is switched.
        var vertical = isVerticalLayout();
        if (this._lastVerticalLayout !== vertical) {
            this._lastVerticalLayout = vertical;
            this.updateDestinationX();
        }
        _update.call(this);
    };

    var _updateDestinationX = Window_TurnOrderIcon.prototype.updateDestinationX;
    Window_TurnOrderIcon.prototype.updateDestinationX = function() {
        if (!isVerticalLayout()) return _updateDestinationX.call(this);
        if (!this.battler()) return;
        if (this.battler().isDead()) return;
        this._destinationX = this.verticalColumnX();
        this._verticalCount = this.aliveMembersSize();
        this._verticalIndex = this.turnOrderDisplayIndex();
    };

    Window_TurnOrderIcon.prototype.verticalColumnX = function() {
        if (side === 'left') return marginX;
        return Graphics.boxWidth - this.width - marginX;
    };

    // +1 = toward the right (column on the left), -1 = toward the left.
    Window_TurnOrderIcon.prototype.verticalInward = function() {
        return side === 'left' ? 1 : -1;
    };

    Window_TurnOrderIcon.prototype.verticalDestinationX = function() {
        var x = this.verticalColumnX();
        var battler = this.battler();
        if (battler && battler.isSelected()) {
            x += this.verticalInward() * Math.round(this.contents.width / 4);
        }
        return x;
    };

    Window_TurnOrderIcon.prototype.verticalDestinationY = function() {
        var count = this._verticalCount || 1;
        var index = this._verticalIndex === undefined ? 0 : this._verticalIndex;
        var size = this.height;
        var offsetY = verticalOffsetY();
        var total = count * size;
        var start;
        if (align === 'center') {
            start = Math.floor((Graphics.boxHeight - total) / 2) + offsetY;
        } else if (align === 'bottom') {
            start = Graphics.boxHeight - total - offsetY;
        } else {
            start = offsetY;
            if (this._helpWindow && this._helpWindow.visible) {
                start = Math.max(start, this._helpWindow.height);
            }
        }
        if (direction === 'up') index = count - 1 - index;
        return start + index * size;
    };

    var _destinationY = Window_TurnOrderIcon.prototype.destinationY;
    Window_TurnOrderIcon.prototype.destinationY = function() {
        if (isVerticalLayout()) return this.verticalDestinationY();
        return _destinationY.call(this);
    };

    var _updatePosition = Window_TurnOrderIcon.prototype.updatePosition;
    Window_TurnOrderIcon.prototype.updatePosition = function() {
        if (!isVerticalLayout()) return _updatePosition.call(this);
        if (BattleManager._escaped) return;
        var desX = this.verticalDestinationX();
        var desY = this.verticalDestinationY();
        if (this.y !== desY) {
            // Sliding: icons moving up swing out toward the middle of the
            // screen so they pass the icons moving down.
            var goalX = desX;
            if (this.y > desY) {
                goalX += this.verticalInward() * Math.round(this.width / 2);
            }
            this.x = approach(this.x, goalX);
            this.y = approach(this.y, desY);
        } else {
            this.x = approach(this.x, desX);
        }
    };

})();