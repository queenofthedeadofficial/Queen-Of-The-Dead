//=============================================================================
// DifficultyInfoBox.js
//=============================================================================

/*:
 * @plugindesc v1.0 Shows a text box at the top of the screen describing the
 * highlighted Easy/Hard choice while a switch is ON.
 * @author Andrew
 *
 * @param Switch ID
 * @type switch
 * @desc The switch that enables the info box.
 * @default 607
 *
 * @param Window Rows
 * @type number
 * @min 1
 * @desc Height of the box in text rows. 4 matches the standard message window.
 * @default 4
 *
 * @help
 * While the chosen switch is ON and a "Show Choices" window is active, an
 * info box appears at the top of the screen (full width, standard message
 * window height). Its text depends on which choice the cursor is on:
 *
 *   Choice "Easy":
 *     Boss Agility will be capped at 5.
 *     Bosses will not gain attributes.
 *
 *   Choice "Hard":
 *     Boss Agility will be uncapped.
 *     Bosses will gain attributes for each boss defeated.
 *
 * Choice names are matched ignoring case, surrounding spaces and text codes
 * (so "\C[3]Easy" still counts as "Easy"). Each line is centered.
 * Works on the map and in battle. No plugin commands.
 */

(function() {
    'use strict';

    var pluginName = 'DifficultyInfoBox';
    var params = PluginManager.parameters(pluginName);
    var switchId = Number(params['Switch ID'] || 607);
    var windowRows = Number(params['Window Rows'] || 4);

    // Edit these if you ever want to change the wording.
    var TEXTS = {
        'easy': [
            'Boss Agility will be capped at 5.',
            'Bosses will not gain attributes.'
        ],
        'hard': [
            'Boss Agility will be uncapped.',
            'Bosses will gain attributes for each boss defeated.'
        ]
    };

    //-------------------------------------------------------------------------
    // Window_DifficultyInfo
    //-------------------------------------------------------------------------

    function Window_DifficultyInfo() {
        this.initialize.apply(this, arguments);
    }

    Window_DifficultyInfo.prototype = Object.create(Window_Base.prototype);
    Window_DifficultyInfo.prototype.constructor = Window_DifficultyInfo;

    Window_DifficultyInfo.prototype.initialize = function() {
        var height = this.fittingHeight(windowRows);
        Window_Base.prototype.initialize.call(this, 0, 0, Graphics.boxWidth, height);
        this._lines = [];
        this._key = '';
        this.visible = false;
    };

    Window_DifficultyInfo.prototype.update = function() {
        Window_Base.prototype.update.call(this);
        var lines = this.currentLines();
        var key = lines ? lines.join('\n') : '';
        if (key !== this._key) {
            this._key = key;
            this._lines = lines || [];
            this.refresh();
        }
        this.visible = !!lines;
    };

    Window_DifficultyInfo.prototype.currentLines = function() {
        if (!$gameSwitches.value(switchId)) return null;
        var scene = SceneManager._scene;
        var messageWindow = scene && scene._messageWindow;
        var choiceWindow = messageWindow && messageWindow._choiceWindow;
        if (!choiceWindow || !choiceWindow.active || choiceWindow.index() < 0) {
            return null;
        }
        var name = choiceWindow.commandName(choiceWindow.index());
        name = this.convertEscapeCharacters(String(name))
            .replace(/\x1b[A-Z]+\[\d+\]/gi, '')
            .replace(/\x1b[.|!><^{}$]/g, '')
            .trim()
            .toLowerCase();
        return TEXTS[name] || null;
    };

    Window_DifficultyInfo.prototype.refresh = function() {
        this.contents.clear();
        var width = this.contentsWidth();
        for (var i = 0; i < this._lines.length; i++) {
            this.drawText(this._lines[i], 0, this.lineHeight() * i, width, 'center');
        }
    };

    //-------------------------------------------------------------------------
    // Scene hooks (map and battle)
    //-------------------------------------------------------------------------

    function addInfoWindow(sceneClass) {
        var _createAllWindows = sceneClass.prototype.createAllWindows;
        sceneClass.prototype.createAllWindows = function() {
            _createAllWindows.call(this);
            this._difficultyInfoWindow = new Window_DifficultyInfo();
            this.addWindow(this._difficultyInfoWindow);
        };
    }

    addInfoWindow(Scene_Map);
    addInfoWindow(Scene_Battle);

})();