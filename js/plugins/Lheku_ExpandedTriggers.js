//=============================================================================
// Lheku - Expanded Triggers
// Lheku_ExpandedTriggers.js
//=============================================================================

var Imported = Imported || {};
Imported.Lheku_ExpandedTriggers = true;

var Lheku = Lheku || {};
Lheku.ExpandedTriggers = Lheku.ExpandedTriggers || {}
Lheku.ExpandedTriggers.version = 2.03;

//=============================================================================
/*:
 * @plugindesc v2.03 Allows you to change switches, variables and call common 
 * events in more ways
 *
 * @author Lheku Qhukyaru
 * 
 * @help
 *
 *============================================================================
 * Description
 *============================================================================
 *
 * Simple plugin that allows you to change switches, variables and call 
 * common events in the following scenarios:
 *  > Equiping/unequiping a weapon/armor
 *  > Buying/selling an item
 *  > Using an item/skill
 *
 * Note: for items and skills you could simply use common events.
 *
 *============================================================================
 * Introduction
 *============================================================================
 *
 * I wanted to have more control about how to increase a variable or change
 * a switch state, etc.
 *
 * So I did a simple plugin that handles that with notetags. Each time I
 * got a new idea for this I added it.
 *
 *============================================================================
 * Weapon, armor, item and skill notetags
 *============================================================================
 *
 * Every tag can have the following modes:
 *
 *   > Use: will trigger when the item/skill is used, equipped, unequipped,
 *          bought or sold.
 *   > Buy: will trigger when the item is bought.
 *   > Sell: will trigger when the item is sold.
 *   > Equip: will trigger when the item is equipped.
 *   > Unequip: will trigger when the item is unequipped.
 *
 * _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
 *
 * <Use switch: x-y>
 * <Buy switch: x-y>
 * <Sell switch: x-y>
 * <Equip switch: x-y>
 * <Unequip switch: x-y>
 *
 * Where x is the switch id you want to change.
 * Where y is "ON" or "OFF".
 *
 * Alternatively, you can use this other notetags:
 *
 * <Use switch: x>
 * <Buy switch: x>
 * <Sell switch: x>
 * <Equip switch: x>
 * <Unequip switch: x>
 *
 * Where x is the switch id you want to change.
 * In this notetag, the switch will simply change states. If it is "ON"
 * it will change to "OFF" and viceversa.
 *
 *
 * Examples:
 *
 * <Equip switch: 1-OFF>
 * <Use switch: 1>
 *
 * _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
 *
 * <Use variable v: +-x>
 * <Buy variable v: +-x>
 * <Sell variable v: +-x>
 * <Equip variable v: +-x>
 * <Unequip variable v: +-x>
 *
 * Where v is the variable id you want to change.
 * Where x is the amount you want it to be changed.
 * Use + or - before x.
 *
 * Examples:
 *
 * <Use variable 7: +5>
 * <Buy variable 4: +1>
 *
 * _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _
 *
 * <Use common event: x>
 * <Buy common event: x>
 * <Sell common event: x>
 * <Equip common event: x>
 * <Unequip common event: x>
 *
 * Where x is the common event id you want to queue.
 *
 * Note: do know that common events work with a queue and depending of what
 * it executes it will not do it right at the moment.
 * For example, if you use "<Buy common event: 1>" it will execute after you
 * exit the shop scene.
 *
 * Examples:
 *
 * <Buy common event: 4>
 *
 *============================================================================
 * Compatibility
 *============================================================================
 *
 * Tested and made for Rpg Maker MV 1.6.2
 * This plugin may not work in older versions
 *
 *============================================================================
 * Terms of use
 *============================================================================
 *
 * -These plugins may be used in free or commercial games.
 * -‘Lheku Qhukyaru’ must be given credit in your games.
 * -You must link this website "https://lhekussanctuary.wordpress.com/".
 * -Do NOT change the filename, parameters, and information of the plugin.
 * -You are NOT allowed to redistribute these plugins.
 * -You may NOT take code for your own released plugins without credit.
 * -You are allowed to edit the code as long as it’s for your own project.
 * -You CANNOT use any of these resources for NFT or any related or similar 
 * type of games.
 *
 * You can also check them at:
 * https://lhekussanctuary.wordpress.com/tos
 *
 *============================================================================
 * Changelog
 *============================================================================
 *
 * V2.03 (17/07/2023) -> Fixed undefined variable
 * V2.02 (09/10/2021) -> Fixed unequip mode
 * V2.01 (02/10/2021) -> Bug fixes
 * V2.00 (01/10/2021) -> Rewritten almost from scratch
 *                       Added a lot of things
 * V1.00 (12/07/2021) -> Basic version
 *
 *============================================================================
 */
//=============================================================================

//=============================================================================
// Don't touch things below this unless you know what you are doing!!!!
//
// If you read past this I am not responsible of the headaches it may make
//=============================================================================

(function() {

//=============================================================================
// DataManager
//=============================================================================

//-----------------------------------------------------------------------------
// Aliased: Handles loading notetags to database
//-----------------------------------------------------------------------------
Lheku.ExpandedTriggers.DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
DataManager.isDatabaseLoaded = function() {
  if (!Lheku.ExpandedTriggers.DataManager_isDatabaseLoaded.call(this)) return false;
  if (!Lheku._loaded_Lheku_ExpandedTriggers) {
    this.processNotetags_Lheku_ExpandedTriggers($dataWeapons);
    this.processNotetags_Lheku_ExpandedTriggers($dataArmors);
    this.processNotetags_Lheku_ExpandedTriggers($dataItems);
    this.processNotetags_Lheku_ExpandedTriggers($dataSkills);
    Lheku._loaded_Lheku_ExpandedTriggers = true;
  }
  return true;
};

//-----------------------------------------------------------------------------
// Handles notetags
//-----------------------------------------------------------------------------
DataManager.processNotetags_Lheku_ExpandedTriggers = function(group) {
  var matchStrSwitch = /<(.*) SWITCH:[ ]*(\d+)-(.*)[ ]*>/i;
  var matchStrVariable = /<(.*) VARIABLE[ ]*(\d+)[ ]*:[ ]*([\+\-]\d+)[ ]*>/i;
  var matchStrCommonEvent = /<(.*) COMMON EVENT:[ ]*(\d+)[ ]*>/i;

  for (var n = 1; n < group.length; n++) {
    var obj = group[n];
    var notedata = obj.note.split(/[\r\n]+/);

    obj.triggerInUse = false;

        for (var i = 0; i < notedata.length; i++) {
            var line = notedata[i];
            if (line.match(matchStrSwitch)) {
                var aux = [undefined, undefined, undefined, undefined];
                var mode = RegExp.$1.toLowerCase();
                var id = parseInt(RegExp.$2);
                var state = RegExp.$3.toLowerCase();
                if(mode === '') continue;
                if(!Number.isInteger(id)) continue;
                switch(mode){
                    case "use": aux[0] = mode; break;
                    case "buy": aux[0] = mode; break;
                    case "sell": aux[0] = mode; break;
                    case "equip": aux[0] = mode; break;
                    case "unequip": aux[0] = mode; break;
                    default: continue; break;
                }
                aux[1] = "switch";
                aux[2] = id;
                if(state === undefined || state === '') { aux[3] = false; } else { aux[3] = state; }
                obj.triggerInUse = obj.triggerInUse || [];
                obj.triggerInUse.push(aux);
            }else if (line.match(matchStrVariable)) {
                var aux = [undefined, undefined, undefined, undefined];
                var mode = RegExp.$1.toLowerCase();
                var id = parseInt(RegExp.$2);
                var state = parseInt(RegExp.$3);
                if(mode === '') continue;
                if(!Number.isInteger(id)) continue;
                if(!Number.isInteger(state)) continue;
                switch(mode){
                    case "use": aux[0] = mode; break;
                    case "buy": aux[0] = mode; break;
                    case "sell": aux[0] = mode; break;
                    case "equip": aux[0] = mode; break;
                    case "unequip": aux[0] = mode; break;
                    default: continue; break;
                }
                aux[1] = "variable";
                aux[2] = id;
                aux[3] = state;
                obj.triggerInUse = obj.triggerInUse || [];
                obj.triggerInUse.push(aux);
            }else if (line.match(matchStrCommonEvent)) {
                var aux = [undefined, undefined, undefined, undefined];
                var mode = RegExp.$1.toLowerCase();
                var id = parseInt(RegExp.$2);
                if(mode === '') continue;
                if(!Number.isInteger(id)) continue;
                switch(mode){
                    case "use": aux[0] = mode; break;
                    case "buy": aux[0] = mode; break;
                    case "sell": aux[0] = mode; break;
                    case "equip": aux[0] = mode; break;
                    case "unequip": aux[0] = mode; break;
                    default: continue; break;
                }
                aux[1] = "common event";
                aux[2] = id;
                obj.triggerInUse = obj.triggerInUse || [];
                obj.triggerInUse.push(aux);
            }
        }
    }
};

//=============================================================================
// Game_Battler
//=============================================================================
Lheku.ExpandedTriggers.Game_Battler_useItem = Game_Battler.prototype.useItem;
Game_Battler.prototype.useItem = function(item) {
    Lheku.ExpandedTriggers.Game_Battler_useItem.call(this, item);
    if(Lheku.ExpandedTriggers.trigger(item, "use")){
        if(SceneManager._scene.constructor.name == "Scene_Item"){
            SceneManager._scene.createCategoryWindow();
        }else if(SceneManager._scene.constructor.name == "Scene_Skill"){
            SceneManager._scene.createSkillTypeWindow();
        }
        
    }
};

//=============================================================================
// Game_Actor
//=============================================================================
Lheku.ExpandedTriggers.Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
Game_Actor.prototype.changeEquip = function(slotId, item) {
    Lheku.ExpandedTriggers.Game_Actor_changeEquip.call(this, slotId, item);
    if(this.equips()[slotId] == null){
        if(SceneManager._scene._LET_auxUnequippedItem != undefined)
            var auxItem = SceneManager._scene._LET_auxUnequippedItem;
        if(Lheku.ExpandedTriggers.trigger(auxItem, "unequip")){
            SceneManager._scene.createCommandWindow();
        }
    }else{
        if(Lheku.ExpandedTriggers.trigger(item, "equip")){
            SceneManager._scene.createCommandWindow();
        }
    }
};

Lheku.ExpandedTriggers.Scene_Equip_create = Scene_Equip.prototype.create;
Scene_Equip.prototype.create = function() {
    Lheku.ExpandedTriggers.Scene_Equip_create.call(this);
    this._LET_auxUnequippedItem = null;
};

Lheku.ExpandedTriggers.Scene_Equip_onItemOk = Scene_Equip.prototype.onItemOk;
Scene_Equip.prototype.onItemOk = function() {
    this._LET_auxUnequippedItem = this._slotWindow.item();
    Lheku.ExpandedTriggers.Scene_Equip_onItemOk.call(this);
};

//=============================================================================
// Scene_Shop
//=============================================================================
Lheku.ExpandedTriggers.Scene_Shop_doBuy = Scene_Shop.prototype.doBuy;
Scene_Shop.prototype.doBuy = function(number) {
    Lheku.ExpandedTriggers.Scene_Shop_doBuy.call(this, number);
    if(Lheku.ExpandedTriggers.trigger(this._item, "buy")) { this.createCommandWindow(); }
};

Lheku.ExpandedTriggers.Scene_Shop_doSell = Scene_Shop.prototype.doSell;
Scene_Shop.prototype.doSell = function(number) {
    Lheku.ExpandedTriggers.Scene_Shop_doSell.call(this, number);
    if(Lheku.ExpandedTriggers.trigger(this._item, "sell")) { this.createCommandWindow(); }
};

//=============================================================================
// Lheku things
//=============================================================================

Lheku.ExpandedTriggers.trigger = function(item, modeToCheck){
    if(item == undefined || item.triggerInUse == undefined || item.triggerInUse == false){ return false; }
    var triggers = item.triggerInUse;
    var b = false;
    for(var i = 0; i < triggers.length; i++){
        var mode = triggers[i][0];
        if(mode === modeToCheck){
            var trigger = triggers[i][1];
            var id = triggers[i][2];
            var state = triggers[i][3];
            Lheku.ExpandedTriggers.activate(trigger, id, state);
            b = true;
        }
    }
    return b;
}

Lheku.ExpandedTriggers.activate = function(trigger, id, state){
    switch(trigger){
        case "switch": 
            if(state === false){
                $gameSwitches.setValue(id, !$gameSwitches.value(id));
            }else{
                if(state === "on") { state = true; } else { state = false; }
                $gameSwitches.setValue(id, state);
            }
        break;

        case "variable": 
            $gameVariables.setValue(id, $gameVariables.value(id) + state);
        break;

        case "common event": 
            $gameTemp.reserveCommonEvent(id);
        break;

        default: 
        break;
    }
}

})();
//=============================================================================
// End of File
//=============================================================================