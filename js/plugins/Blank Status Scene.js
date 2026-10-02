/*:
 * @plugindesc Blank YEP Status Layout Scene with Unlockable Creature List
 * @author ChatGPT
 *
 * @help
 * Script Call:
 * SceneManager.push(Scene_BlankStatusLayout);
 */

(function() {


//=============================================================================
// Window_BlankOptions
//=============================================================================

function Window_BlankOptions() {
    this.initialize.apply(this, arguments);
}

Window_BlankOptions.prototype =
    Object.create(Window_Selectable.prototype);

Window_BlankOptions.prototype.constructor =
    Window_BlankOptions;


Window_BlankOptions.prototype.initialize = function(x, y, width, height) {

    this._entries = [
        {name:"Bat",     skill:120, actor:3},
        {name:"Calcite", skill:121, actor:3},
        {name:"Cirrus",  skill:140, actor:3},
        {name:"Firefly", skill:141, actor:4},
        {name:"Ghost",   skill:137, actor:3},
        {name:"Goblin",  skill:279, actor:3},
        {name:"Hyena",   skill:136, actor:3},
        {name:"Lasher",  skill:null, actor:null, learnsetActor:16},
        {name:"Rat",     skill:null, actor:null, learnsetActor:15},
        {name:"Slime",   skill:17,  actor:3,     learnsetActor:9},
        {name:"Wisp",    skill:241, actor:3},
        {name:"Back",    skill:null, actor:null}
    ];


    this._onIndexChange = null;


    this.refreshData();


    Window_Selectable.prototype.initialize.call(
        this,
        x,
        y,
        width,
        height
    );


    this.refresh();
    this.select(0);

};



Window_BlankOptions.prototype.isEntryLocked = function(entry) {

    if (entry.skill && entry.actor) {

        var actor = $gameActors.actor(entry.actor);


        if (!actor ||
            !actor.isLearnedSkill(entry.skill)) {

            return true;

        }

    }


    return false;

};



Window_BlankOptions.prototype.refreshData = function() {

    this._data = [];


    for (var i = 0; i < this._entries.length; i++) {

        var entry = this._entries[i];


        if (this.isEntryLocked(entry)) {

            this._data.push("???");
            continue;

        }


        this._data.push(entry.name);

    }

};



Window_BlankOptions.prototype.maxItems = function() {

    return this._data ? this._data.length : 0;

};



Window_BlankOptions.prototype.select = function(index) {

    Window_Selectable.prototype.select.call(this, index);


    if (this._onIndexChange) {

        this._onIndexChange(this._entries[index]);

    }

};



Window_BlankOptions.prototype.drawItem = function(index) {

    var rect = this.itemRectForText(index);

    var entry = this._entries[index];

    var locked = this.isEntryLocked(entry);


    if (locked) {

        this.changeTextColor(
            this.textColor(7)
        );

    }


    this.drawText(
        this._data[index],
        rect.x,
        rect.y,
        rect.width,
        "center"
    );


    this.resetTextColor();

};



//=============================================================================
// Scene_BlankStatusLayout
//=============================================================================

function Scene_BlankStatusLayout() {
    this.initialize.apply(this, arguments);
}


Scene_BlankStatusLayout.prototype =
    Object.create(Scene_MenuBase.prototype);


Scene_BlankStatusLayout.prototype.constructor =
    Scene_BlankStatusLayout;



Scene_BlankStatusLayout.prototype.create = function() {

    Scene_MenuBase.prototype.create.call(this);


    this.createHelpBox();
    this.createCommandBox();
    this.createSkillBox();
    this.createInfoBox();
    this.createLearnsetBox();
    this.createLearnsetDetailBox();


    this._commandWindow._onIndexChange =
        this.onCommandIndexChange.bind(this);


    // Sync initial display to whatever entry is selected on scene open
    // (defaults to index 0, "Bat", so this just hides the learnset boxes).
    this.onCommandIndexChange(
        this._commandWindow._entries[this._commandWindow.index()]
    );

};



//=============================================================================
// Windows
//=============================================================================

Scene_BlankStatusLayout.prototype.createHelpBox = function() {

    // Window_Help(2) sizes itself to Graphics.boxWidth x 108 (2 lines +
    // standard padding) - same footprint as the old plain Window_Base, but
    // with setText() support (word-wrap, icon/color codes) like the help
    // window Level_Up_Learnset.js writes skill descriptions into.
    this._helpWindow = new Window_Help(2);

    this.addWindow(this._helpWindow);

};



Scene_BlankStatusLayout.prototype.createCommandBox = function() {

    this._commandWindow = new Window_BlankOptions(
        0,
        108,
        240,
        180
    );


    this.addWindow(this._commandWindow);


    this._commandWindow.setHandler(
        "ok",
        this.commandCreatureOk.bind(this)
    );


    this._commandWindow.activate();

};



Scene_BlankStatusLayout.prototype.createSkillBox = function() {

    // Window_SkillStatus is a stock RPG Maker MV core class (rpg_windows.js)
    // - the same class YEP_StatusMenuCore.js uses for its actor portrait
    // box. Using it directly here reproduces its face/name/level/HP/MP/TP
    // layout exactly.
    this._skillWindow = new Window_SkillStatus(
        240,
        108,
        576,
        180
    );

    this.addWindow(this._skillWindow);

};



Scene_BlankStatusLayout.prototype.refreshSkillBoxStatus = function(actorId) {

    var actor = $gameActors.actor(actorId) || null;


    this._skillWindow.setActor(actor);


    if (actor) {

        // Window_SkillStatus draws the face bitmap synchronously
        // (contents.blt) without waiting for it to finish loading. The
        // very first time a given actor's face sheet is drawn this game
        // session, it may not be loaded yet, leaving the face blank with
        // nothing to trigger a retry. Force one redraw once it's ready.
        var bitmap = ImageManager.loadFace(actor.faceName());

        bitmap.addLoadListener(function() {

            if (this._skillWindow &&
                this._skillWindow._actor === actor) {

                this._skillWindow.refresh();

            }

        }.bind(this));

    }

};



Scene_BlankStatusLayout.prototype.createInfoBox = function() {

    this._infoWindow = new Window_Base(
        0,
        288,
        816,
        336
    );

    this.addWindow(this._infoWindow);

};



Scene_BlankStatusLayout.prototype.createLearnsetBox = function() {

    // Window_Learnset is defined in Level_Up_Learnset.js and exported
    // globally from there. This plugin must load AFTER Level_Up_Learnset.js
    // in the Plugin Manager list.
    this._learnsetWindow = new Window_Learnset(
        0,
        288,
        816,
        216
    );

    this._learnsetWindow._onIndexChange =
        this.onLearnsetIndexChange.bind(this);

    this._learnsetWindow.setHandler(
        "ok",
        this.onLearnsetOk.bind(this)
    );

    this._learnsetWindow.setHandler(
        "cancel",
        this.onLearnsetCancel.bind(this)
    );

    this.addWindow(this._learnsetWindow);

};



Scene_BlankStatusLayout.prototype.createLearnsetDetailBox = function() {

    // Window_LearnsetDetail is also defined/exported in Level_Up_Learnset.js
    this._learnsetDetailWindow = new Window_LearnsetDetail(
        0,
        504,
        816,
        120
    );

    this.addWindow(this._learnsetDetailWindow);

};



//=============================================================================
// Rat Learnset Display
//=============================================================================

Scene_BlankStatusLayout.prototype.onCommandIndexChange = function(entry) {

    // learnsetActor is a separate actor from skill/actor (which drive the
    // "???" unlock-gate check in refreshData/drawItem above) - but a locked
    // entry (like Slime, until actor 3 learns skill 17) should still hide
    // its learnset data even though it has one configured.
    if (entry &&
        entry.learnsetActor &&
        !this._commandWindow.isEntryLocked(entry)) {

        this.showRatLearnset(entry.learnsetActor);

    } else {

        this.hideRatLearnset();

    }

};



Scene_BlankStatusLayout.prototype.showRatLearnset = function(actorId) {

    var actor = $gameActors.actor(actorId);


    this._infoWindow.hide();


    this._learnsetWindow.setActor(actor);
    this._learnsetWindow.show();
    this._learnsetWindow.select(0);


    this._learnsetDetailWindow.show();


    this.refreshSkillBoxStatus(actorId);

};



Scene_BlankStatusLayout.prototype.hideRatLearnset = function() {

    this._learnsetWindow.hide();
    this._learnsetDetailWindow.hide();
    this._skillWindow.setActor(null);

    this.drawLearnsetSkillInHelpWindow(null);


    this._infoWindow.show();

};



Scene_BlankStatusLayout.prototype.onLearnsetIndexChange = function(item) {

    var actor = this._learnsetWindow._actor;


    if (this._learnsetDetailWindow) {

        this._learnsetDetailWindow.setLearnsetItem(actor, item);

    }


    // Only draw into the help box while actually inside the Rat submenu
    // (learnset window focused/active) - not during the hover-preview state
    // in the top-level creature list.
    if (this._learnsetWindow.active) {

        var skill = item ? $dataSkills[item.skillId] : null;

        this.drawLearnsetSkillInHelpWindow(skill);

    }

};



// Mirrors Level_Up_Learnset.js's Scene_Status.prototype.drawLearnsetSkillInHelpWindow
Scene_BlankStatusLayout.prototype.drawLearnsetSkillInHelpWindow = function(skill) {

    var win = this._helpWindow;

    if (!win) return;


    if (!skill) {

        win.setText("");

        return;

    }


    win.setText(skill.description || "");

};



//=============================================================================
// Command Handling
//=============================================================================

Scene_BlankStatusLayout.prototype.commandCreatureOk = function() {

    var index = this._commandWindow.index();

    var entry = this._commandWindow._entries[index];


    if (entry.name === "Back") {

        $gameTemp._returnToLearnsets = true;

        SceneManager.goto(Scene_Menu);

        return;

    }


    if (entry.learnsetActor &&
        !this._commandWindow.isEntryLocked(entry)) {

        this.enterRatLearnset();

        return;

    }


    // Placeholder for creature selection behavior

    this._commandWindow.activate();

};



Scene_BlankStatusLayout.prototype.enterRatLearnset = function() {

    this._commandWindow.deactivate();


    this._learnsetWindow.activate();
    this._learnsetWindow.select(0);

};



Scene_BlankStatusLayout.prototype.onLearnsetOk = function() {

    // OK doesn't do anything further beyond the detail box already updating
    // as the cursor moves - just keep the list active instead of freezing,
    // since Window_Selectable.processOk() deactivates the window before
    // calling the handler regardless of whether one is registered.
    this._learnsetWindow.activate();

};



Scene_BlankStatusLayout.prototype.onLearnsetCancel = function() {

    SoundManager.playCancel();


    this._learnsetWindow.deactivate();


    this.drawLearnsetSkillInHelpWindow(null);


    // The learnset/detail/portrait boxes stay visible (cursor is still on
    // Rat in the command list) - only input focus returns to the list.
    this._commandWindow.activate();

};



//=============================================================================
// Return To Main Menu
//=============================================================================

Scene_BlankStatusLayout.prototype.update = function() {

    Scene_MenuBase.prototype.update.call(this);


    if (this._learnsetWindow &&
        this._learnsetWindow.active) {

        // Cancel here is already handled by the learnset window's own
        // "cancel" handler (returns to the creature list) - don't also
        // pop the whole scene on the same keypress.
        return;

    }


    if (Input.isTriggered("cancel") ||
        TouchInput.isCancelled()) {

        this.returnToMenu();

    }

};



Scene_BlankStatusLayout.prototype.returnToMenu = function() {

    $gameTemp._returnToLearnsets = true;

    SceneManager.goto(Scene_Menu);

};



//=============================================================================
// Restore Learnsets Cursor
//=============================================================================

var _Scene_Menu_createCommandWindow =
    Scene_Menu.prototype.createCommandWindow;


Scene_Menu.prototype.createCommandWindow = function() {

    _Scene_Menu_createCommandWindow.call(this);


    if ($gameTemp._returnToLearnsets) {


        $gameTemp._returnToLearnsets = false;


        var list = this._commandWindow._list;


        for (var i = 0; i < list.length; i++) {


            if (
                list[i].symbol === "common event" &&
                list[i].ext === 10
            ) {

                this._commandWindow.select(i);
                break;

            }

        }

    }

};



//=============================================================================
// Export
//=============================================================================

window.Scene_BlankStatusLayout =
    Scene_BlankStatusLayout;


})();