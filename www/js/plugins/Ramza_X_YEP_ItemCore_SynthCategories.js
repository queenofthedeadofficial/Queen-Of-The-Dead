//=============================================================================
// Ramza Extensions - YEP_ItemCore State Categories Add-on
// Ramza_X_YEP_ItemCore_SynthCategories.js
// v1.10
//=============================================================================

var Ramza = Ramza || {};
Ramza.YEPX = Ramza.YEPX || {};
Ramza.YEPX.SC = Ramza.YEPX.SC || {};
Ramza.YEPX.SC.version = 1.10

//=============================================================================
 /*:
 * @plugindesc v1.10 Modification to YEP_ItemSynthesis to allow for only one category of items to be shown
 * @author Ramza
 *
 * @param CraftCategoryText
 * @text Craft Category Text
 * @desc The text that prefaces the category name on the synthesis menu command window.
 * @default Craft 
 *
 * @help
 * ============================================================================
 * Description:
 * ============================================================================
 *
 * This plugin is a modification of the YEP_ItemSynthesis plugin which allows 
 * for a plugin command to only call a synthesis category. Doing so will call 
 * the regular synthesis menu scene, but foregoes the part where it builds the 
 * recipe lists for the other categories, effectively hiding them from the menu.
 *
 * ============================================================================
 * Required Plugins:
 * ============================================================================
 *
 * YEP_ItemSynthesis
 * http://yanfly.moe/2016/01/15/yep-58-item-synthesis/
 * Place this addon below this plugin on your load order.
 *
 *
 * ============================================================================
 * Known compatibility issues:
 *
 * None
 *
 * ============================================================================
 * Usage:
 * ============================================================================
 * When calling the plugin command to show the synthesis menu, you can now 
 * optionally use the item category of the sythesis menu you want to call.
 * 
 * Plugin Command:
 *  OpenSynthesis            This will open the unmodified synthesis scene.
 *  OpenSynthesis item      Hides the weapon and armor categories from the scene.
 *  OpenSynthesis weapon    Hides the item and armor categories from the scene.
 *  OpenSynthesis armor     Hides the item and weapon categories from the scene.
 *  OpenSynthesis CATEGORY	Opens an item category specific synthesis window.
 *
 * Note that the default synthesis scene accessed from the menu will always be 
 * unchanged. 
 * New in v1.10:
 * The OpenSynthesis plugin command can now be used to specify an item category
 * from YEP_X_ItemCategories. Only items that match the category can be 
 * synthesized on this scene. Weapons and armors cannot be called in this way, 
 * only items. Do not call this plugin command if you do nto use the plugin.
 *
 * The main command window will not show extra crafting categories, only the 
 * default item, armor, and weapon.
 *
 * Any items that have an item category set via YEP_X_ItemCategories will be 
 * hidden from the item crafting list automatically, and must be accessed via
 * the plugin command.
 * 
 * ============================================================================
 * Terms of Use:
 * ============================================================================
 * -You may use this plugin in your commercial or non-commercial games, with 
 *  credit to me, Ramza.
 * -You may make changes to the plugin, to add features, or compatibility with
 *  other plugins, for your own personal use.
 * -You may share these changes as their own plugin extension to this one.
 * -You may not directly share modified versions of this plugin publicly.
 * -You may not claim ownership of this plugin.
 * -You must also abide by the terms of use of all dependency plugins.
 * ============================================================================
 * Changelog
 * ============================================================================
 * v1.10
 * -Added support for calling crafting of categories from YEP_X_ItemCategories
 * -Added a plugin parameter for the name to show on the synthesis command 
 *  window when a specific item category craft is called.
 * v1.00
 * -Initial release
 * ============================================================================
 * end of helpfile
 */

var Param = PluginManager.parameters('Ramza_X_YEP_ItemCore_SynthCategories')
Ramza.YEPX.SC.Params = Ramza.YEPX.SC.Params || {};
Ramza.YEPX.SC.Params.CraftCategoryText = String(Param['CraftCategoryText'])


Game_Interpreter.prototype.gotoSceneSynthesis = function(args) {
    if ($gameParty.inBattle()) return;
	if (args && args.length == 1){
		var text = args[0].toUpperCase();
		if (text === 'ITEM'){
			$gameTemp._synthScreenLockType = 1
		} else if (text === 'WEAPON'){
			$gameTemp._synthScreenLockType = 2
		} else if (text === 'ARMOR') {
			$gameTemp._synthScreenLockType = 3
		} else {
			//call yep_x_category function
			$gameTemp._synthScreenLockType = args[0]//.toLowerCase()
		}
	}
    if (args && args.length >= 2) {
      var text = args[0].toUpperCase();
      var id = parseInt(args[1]);
      if (text === 'ITEM') {
        $gameTemp._synthRecipe = $dataItems[id];
      } else if (text === 'WEAPON') {
        $gameTemp._synthRecipe = $dataWeapons[id];
      } else if (text === 'ARMOR') {
        $gameTemp._synthRecipe = $dataArmors[id];
      }
    }
    SceneManager.push(Scene_Synthesis);
};

Scene_Synthesis.prototype.onCancelOk = function() {
    $gameTemp._synthRecipe = undefined;
	$gameTemp._synthScreenLockType = undefined;
    this.popScene();
};

Scene_Synthesis.availableItems = function() {
	var list = (!$gameTemp._synthScreenLockType || ($gameTemp._synthScreenLockType && (typeof $gameTemp._synthScreenLockType == 'string')) || ($gameTemp._synthScreenLockType && $gameTemp._synthScreenLockType == 1)) ? this.getAvailableItems(0) :  [];
    return this.sortList(list);
};

Ramza.YEPX.SC.Window_Synthesis_Command_addItemCommands = 
Window_SynthesisCommand.prototype.addItemCommands

Window_SynthesisCommand.prototype.addItemCommands = function() {
	if ($gameTemp._synthScreenLockType && typeof $gameTemp._synthScreenLockType == 'string'){
		var text = Ramza.YEPX.SC.Params.CraftCategoryText + ' ' + $gameTemp._synthScreenLockType.charAt(0).toUpperCase() + $gameTemp._synthScreenLockType.slice(1)
		this.addCommand(text, $gameTemp._synthScreenLockType, true);
	} else {
		Ramza.YEPX.SC.Window_Synthesis_Command_addItemCommands.call(this)
	}
};

Ramza.YEPX.SC.Window_SynthesisList_makeItemList = 
Window_SynthesisList.prototype.makeItemList
Window_SynthesisList.prototype.makeItemList = function() {
    this._data = [];
	if (this._commandWindow.currentSymbol() != 'item' && this._commandWindow.currentSymbol() != 'armor' && this._commandWindow.currentSymbol() != 'weapon') {
		this._data = Scene_Synthesis.availableItems();
	} else {
		Ramza.YEPX.SC.Window_SynthesisList_makeItemList.call(this)
	}
};

Scene_Synthesis.availableWeapons = function() {
    var list = (!$gameTemp._synthScreenLockType || ($gameTemp._synthScreenLockType && $gameTemp._synthScreenLockType == 2)) ? this.getAvailableItems(1) :  [];
    return this.sortList(list);
};

Scene_Synthesis.availableArmors = function() {
    var list = (!$gameTemp._synthScreenLockType || ($gameTemp._synthScreenLockType && $gameTemp._synthScreenLockType == 3)) ? this.getAvailableItems(2) :  [];
    return this.sortList(list);
};

Scene_Synthesis.getAvailableSynthesisItems = function(array, type, list) {
    var length = array.length;
    for (var i = 0; i < length; ++i) {
      if (type === 0) var obj = $dataItems[array[i]];
      if (type === 1) var obj = $dataWeapons[array[i]];
      if (type === 2) var obj = $dataArmors[array[i]];
	  if ($gameTemp._synthScreenLockType && (typeof $gameTemp._synthScreenLockType == 'string')) {
		  if (obj.itemCategory.includes($gameTemp._synthScreenLockType)) this.addSynthesisItem(obj, list);
	  } else if (Imported.YEP_X_ItemCategories && obj.itemCategory[0] == undefined){
		this.addSynthesisItem(obj, list);  
	  } else if (!Imported.YEP_X_ItemCategories){
		  this.addSynthesisItem(obj, list);  
	  }
    }
};
