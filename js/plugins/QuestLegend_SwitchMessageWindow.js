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
 * The window is 180 pixels tall and positioned at the bottom of the screen.
 *
 * Each line of text is horizontally centered.
 *
 * Escape codes are preserved when drawing text and excluded from the width
 * calculation used for centering.
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
    // Text Positioning
    //--------------------------------------------------------------------------

    var QUEST_LEGEND_TEXT_OFFSET_X = 72;

    var QUEST_LEGEND_TEXT_OFFSET_Y = -7;

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
            0,
            0,
            816,
            180
        );

        // Set the window geometry once during initialization.
        this.width =
            Graphics.boxWidth;

        this.height =
            180;

        this.x =
            0;

        this.y =
            Graphics.boxHeight - 180;

        this.refresh();

        this.visible =
            false;
    };

    //--------------------------------------------------------------------------
    // Refresh
    //--------------------------------------------------------------------------

    Window_QuestLegendSwitchMessage.prototype.refresh =
        function() {

        this.contents.clear();

        var lineHeight =
            this.lineHeight();

        var totalTextHeight =
            lineHeight * 3;

        var startY =
            (this.contents.height - totalTextHeight) / 2;

        startY +=
            QUEST_LEGEND_TEXT_OFFSET_Y;

        this.drawQuestLegendCenteredText(
            QUEST_LEGEND_LINE_1,
            startY
        );

        this.drawQuestLegendCenteredText(
            QUEST_LEGEND_LINE_2,
            startY + lineHeight
        );

        this.drawQuestLegendCenteredText(
            QUEST_LEGEND_LINE_3,
            startY + lineHeight * 2
        );
    };

    //--------------------------------------------------------------------------
    // Draw Centered Text
    //--------------------------------------------------------------------------

    Window_QuestLegendSwitchMessage.prototype
        .drawQuestLegendCenteredText =
        function(text, y) {

        var convertedText =
            this.convertEscapeCharacters(text);

        /*
         * Remove escape codes for the width calculation only.
         *
         * The original text is still passed to drawTextEx(), so escape codes
         * remain functional when the text is displayed.
         */

        var widthText =
            convertedText.replace(
                /\\[A-Z]+\[[0-9]+\]/gi,
                ''
            );

        widthText =
            widthText.replace(
                /\\[{}]/g,
                ''
            );

        widthText =
            widthText.replace(
                /\\[A-Z]+/gi,
                ''
            );

        var textWidth =
            this.textWidth(widthText);

        var x =
            (this.contents.width - textWidth) / 2;

        x +=
            QUEST_LEGEND_TEXT_OFFSET_X;

        this.drawTextEx(
            text,
            x,
            y
        );
    };

    //--------------------------------------------------------------------------
    // Update
    //--------------------------------------------------------------------------

    Window_QuestLegendSwitchMessage.prototype.update =
        function() {

        Window_Base.prototype.update.call(
            this
        );

        /*
         * Only update visibility here.
         *
         * Window dimensions and position are intentionally not changed every
         * frame to avoid unnecessary PIXI/WebGL rendering work.
         */

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