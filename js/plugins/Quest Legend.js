/*:
 * @plugindesc Quest Legend - Displays a non-blocking RPG Maker-style message window while a switch is ON.
 * @author VA
 *
 * @param Switch ID
 * @type number
 * @default 566
 *
 * @param Line 1
 * @type string
 * @default
 *
 * @param Line 2
 * @type string
 * @default
 *
 * @param Line 3
 * @type string
 * @default
 *
 * @help
 * ============================================================================
 * Quest Legend Switch Message Window
 * ============================================================================
 *
 * Displays a non-blocking RPG Maker-style message window while the specified
 * switch is ON.
 *
 * This window does not pause the game or event interpreters.
 *
 * The window is automatically:
 *
 *     Width:  Full game screen width
 *     Height: 144 pixels
 *     X:       0
 *     Y:       Bottom of the screen
 *
 * ============================================================================
 * Parameters
 * ============================================================================
 *
 * Switch ID:
 *     The switch that controls the window.
 *
 * Line 1:
 *     The first line of text.
 *
 * Line 2:
 *     The second line of text.
 *
 * Line 3:
 *     The third line of text.
 *
 * ============================================================================
 */

(function() {

    'use strict';

    console.log(
        'Quest Legend Switch Message Window loaded'
    );

    var parameters = PluginManager.parameters(
        'QuestLegend_SwitchMessageWindow'
    );

    //--------------------------------------------------------------------------
    // Plugin Parameters
    //--------------------------------------------------------------------------

    var QUEST_LEGEND_SWITCH_ID = Number(
        parameters['Switch ID'] || 566
    );

    var QUEST_LEGEND_LINE_1 = String(
        parameters['Line 1'] || ''
    );

    var QUEST_LEGEND_LINE_2 = String(
        parameters['Line 2'] || ''
    );

    var QUEST_LEGEND_LINE_3 = String(
        parameters['Line 3'] || ''
    );

    //--------------------------------------------------------------------------
    // Window Dimensions and Position
    //--------------------------------------------------------------------------

    var QUEST_LEGEND_WINDOW_WIDTH =
        Graphics.boxWidth;

    var QUEST_LEGEND_WINDOW_HEIGHT =
        144;

    var QUEST_LEGEND_WINDOW_X =
        0;

    var QUEST_LEGEND_WINDOW_Y =
        Graphics.boxHeight -
        QUEST_LEGEND_WINDOW_HEIGHT;

    //--------------------------------------------------------------------------
    // Window_QuestLegendSwitchMessage
    //--------------------------------------------------------------------------

    function Window_QuestLegendSwitchMessage() {
        this.initialize.apply(this, arguments);
    }

    Window_QuestLegendSwitchMessage.prototype =
        Object.create(Window_Base.prototype);

    Window_QuestLegendSwitchMessage.prototype.constructor =
        Window_QuestLegendSwitchMessage;

    Window_QuestLegendSwitchMessage.prototype.initialize =
        function() {

        Window_Base.prototype.initialize.call(
            this,
            QUEST_LEGEND_WINDOW_X,
            QUEST_LEGEND_WINDOW_Y,
            QUEST_LEGEND_WINDOW_WIDTH,
            QUEST_LEGEND_WINDOW_HEIGHT
        );

        this.refresh();

        this.visible = false;
    };

    Window_QuestLegendSwitchMessage.prototype.refresh =
        function() {

        this.contents.clear();

        var lineHeight = this.lineHeight();

        this.drawTextEx(
            QUEST_LEGEND_LINE_1,
            0,
            lineHeight * 0
        );

        this.drawTextEx(
            QUEST_LEGEND_LINE_2,
            0,
            lineHeight * 1
        );

        this.drawTextEx(
            QUEST_LEGEND_LINE_3,
            0,
            lineHeight * 2
        );
    };

    Window_QuestLegendSwitchMessage.prototype.update =
        function() {

        Window_Base.prototype.update.call(this);

        this.visible =
            $gameSwitches.value(
                QUEST_LEGEND_SWITCH_ID
            );
    };

    //--------------------------------------------------------------------------
    // Scene_Map
    //--------------------------------------------------------------------------

    var _QuestLegend_Scene_Map_createDisplayObjects =
        Scene_Map.prototype.createDisplayObjects;

    Scene_Map.prototype.createDisplayObjects =
        function() {

        _QuestLegend_Scene_Map_createDisplayObjects.call(
            this
        );

        this.createQuestLegendSwitchMessageWindow();
    };

    Scene_Map.prototype.createQuestLegendSwitchMessageWindow =
        function() {

        this._questLegendSwitchMessageWindow =
            new Window_QuestLegendSwitchMessage();

        this.addWindow(
            this._questLegendSwitchMessageWindow
        );

        console.log(
            'Quest Legend Switch Message Window: window created'
        );
    };

})();