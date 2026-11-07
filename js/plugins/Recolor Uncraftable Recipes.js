/*:
 * @plugindesc Colors crafting menu choices green when craftable, red when the player cannot craft any recipe in that synthesis category.
 * @author ChatGPT (Refined)
 *
 * @param textColorId
 * @type number
 * @default 18
 * @desc Text color index for uncraftable choices (18 = red in default palette). Unused when textColorHex is set.
 *
 * @param textColorHex
 * @type string
 * @default #0ed145
 * @desc Hex color for uncraftable choices, bypassing the windowskin palette (e.g. #0ed145)
 *
 * @param debugMode
 * @type boolean
 * @default false
 * @desc Enable console logging for debugging
 *
 * Place below YEP_ItemSynthesis and any category plugins.
 *
 * This plugin is designed specifically for Common Event 181.
 */

(function() {

"use strict";

var CraftingColor = {};
CraftingColor.data = {};
CraftingColor.canCraftCache = {};
CraftingColor._loaded = false;

// Parse plugin parameters
var parameters = PluginManager.parameters('Recolor_Uncraftable_Recipes');
CraftingColor.textColorId = Number(parameters['textColorId'] || 18);
CraftingColor.textColorHex = String(parameters['textColorHex'] || '#0ed145');
CraftingColor.debugMode = String(parameters['debugMode'] || 'false').toLowerCase() === 'true';

var log = function(message) {
    console.log('[CraftingColor] ' + message);
    if (CraftingColor.debugMode) {
        console.log('[CraftingColor DEBUG] ' + message);
    }
};

//
// Build lookup table from Common Event 181
//
CraftingColor.buildLookup = function() {
    var commonEvent = $dataCommonEvents[181];
    if (!commonEvent) {
        log('Common Event 181 not found');
        return;
    }

    var list = commonEvent.list;
    if (!list || list.length === 0) {
        log('Common Event 181 is empty');
        return;
    }

    for (var i = 0; i < list.length; i++) {
        var cmd = list[i];

        // Look for choice branches (code 402)
        if (cmd.code !== 402) continue;

        var choiceText = cmd.parameters[1];
        var categoryName = null;

        // Scan forward for the OpenSynthesis plugin command at the next indent level
        for (var j = i + 1; j < list.length; j++) {
            var next = list[j];

            // Stop at next choice branch at same indent level
            if (next.code === 402 && next.indent === cmd.indent) {
                break;
            }

            // Plugin Command (code 356) - extract category name from OpenSynthesis
            if (next.code === 356 && next.indent === cmd.indent + 1) {
                var text = String(next.parameters[0] || "");

                if (text.indexOf("OpenSynthesis ") === 0) {
                    categoryName = text.replace("OpenSynthesis ", "").trim();
                    break;
                }
            }
        }

        // Store mapping of choice text to category
        if (categoryName) {
            CraftingColor.data[choiceText] = {
                categoryName: categoryName
            };
            log('Registered choice: "' + choiceText + '" -> Category: ' + categoryName);
        }
    }

    log('Lookup table built with ' + Object.keys(CraftingColor.data).length + ' entries');
};

//
// Database loaded hook
//
var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;

DataManager.isDatabaseLoaded = function() {
    if (!_DataManager_isDatabaseLoaded.call(this)) {
        return false;
    }

    if (!CraftingColor._loaded) {
        console.log('%c[CraftingColor] ===== VERSION MARKER: v3-lock-independent =====', 'background: #222; color: #0f0; font-size: 14px;');
        console.log('[CraftingColor] Plugin loaded. textColorId=' + CraftingColor.textColorId + ', debugMode=' + CraftingColor.debugMode);
        CraftingColor.buildLookup();
        CraftingColor._loaded = true;
    }

    return true;
};

//
// Clear craft cache when party changes and refresh choice window
//
// NOTE: Hooked on gainItem, not addItem/removeItem. RPG Maker MV's core
// item-granting path (the "Change Items" event command, YEP_ItemSynthesis's
// <Custom Synthesis Effect> notetag, shop purchases, loot, etc.) all route
// through Game_Party.prototype.gainItem. loseItem internally calls gainItem
// with a negated amount, so this single hook covers both directions.
//
var _Game_Party_gainItem = Game_Party.prototype.gainItem;

Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
    _Game_Party_gainItem.call(this, item, amount, includeEquip);
    log('Inventory changed (gainItem) - clearing cache');
    CraftingColor.canCraftCache = {};
    if (SceneManager._scene && SceneManager._scene._choiceWindow) {
        SceneManager._scene._choiceWindow.refresh();
    }
};

var _Game_Party_gainGold = Game_Party.prototype.gainGold;

Game_Party.prototype.gainGold = function(amount) {
    _Game_Party_gainGold.call(this, amount);
    log('Gold changed - clearing cache');
    CraftingColor.canCraftCache = {};
    if (SceneManager._scene && SceneManager._scene._choiceWindow) {
        SceneManager._scene._choiceWindow.refresh();
    }
};

//
// Get the lists of items/weapons/armors the player currently holds a
// recipe for, i.e. "unlocked" in the sense the actual synthesis scene
// uses.
//
// NOTE: This intentionally does NOT call Scene_Synthesis.availableItems()/
// availableWeapons()/availableArmors(). Ramza_X_YEP_ItemCore_SynthCategories.js
// overrides the underlying Scene_Synthesis.getAvailableSynthesisItems so
// that, whenever $gameTemp._synthScreenLockType is NOT actively set to a
// specific category string (its normal resting state - e.g. exactly the
// state Common Event 181 sees before any OpenSynthesis call has run), it
// silently excludes every item that has a <Menu Category: ...> tag at all.
// Since every Food/Potion/Soup recipe has such a tag, those three functions
// always report empty regardless of what the player actually owns -
// they're lock-state-dependent, not a reliable "is this unlocked" source.
//
// Scene_Synthesis.availableLibrary() is NOT touched by that override, so we
// read directly from it and replicate the original (pre-Ramza) unconditional
// add logic ourselves. This gives a stable answer regardless of whatever
// $gameTemp._synthScreenLockType happens to be at the moment of the check.
//
CraftingColor.getAvailableLists = function() {
    try {
        var library = Scene_Synthesis.availableLibrary();
        var lists = [[], [], []]; // items, weapons, armors

        for (var s = 0; s < library.length; s++) {
            var set = library[s];
            for (var i = 0; i < set.length; i++) {
                var recipeHolder = set[i];
                if (!recipeHolder) continue;

                if (recipeHolder.recipeItem) {
                    for (var a = 0; a < recipeHolder.recipeItem.length; a++) {
                        var obj = $dataItems[recipeHolder.recipeItem[a]];
                        if (obj && !lists[0].contains(obj)) lists[0].push(obj);
                    }
                }
                if (recipeHolder.recipeWeapon) {
                    for (var b = 0; b < recipeHolder.recipeWeapon.length; b++) {
                        var obj2 = $dataWeapons[recipeHolder.recipeWeapon[b]];
                        if (obj2 && !lists[1].contains(obj2)) lists[1].push(obj2);
                    }
                }
                if (recipeHolder.recipeArmor) {
                    for (var c = 0; c < recipeHolder.recipeArmor.length; c++) {
                        var obj3 = $dataArmors[recipeHolder.recipeArmor[c]];
                        if (obj3 && !lists[2].contains(obj3)) lists[2].push(obj3);
                    }
                }
            }
        }

        log('Available lists (lock-independent) - Items: ' + lists[0].length + ', Weapons: ' + lists[1].length + ', Armors: ' + lists[2].length);
        return lists;
    } catch (e) {
        log('Error building available recipe lists (YEP_ItemSynthesis missing?): ' + e.message);
        return [null, null, null];
    }
};

//
// Check if player can craft ANY item with a given menu category notetag
//
CraftingColor.canCraftMenuCategory = function(menuCategoryName) {
    log('Checking menu category: "' + menuCategoryName + '"');

    // Return cached result if available
    var cacheKey = 'menuCat_' + menuCategoryName;
    if (CraftingColor.canCraftCache.hasOwnProperty(cacheKey)) {
        log('  ^ Cached result: ' + CraftingColor.canCraftCache[cacheKey]);
        return CraftingColor.canCraftCache[cacheKey];
    }

    var groups = [
        { data: $dataItems, name: 'Items' },
        { data: $dataWeapons, name: 'Weapons' },
        { data: $dataArmors, name: 'Armors' }
    ];

    var availableLists = CraftingColor.getAvailableLists();
    var foundCount = 0;
    var craftableCount = 0;

    // Search all items for ones with <Menu Category: menuCategoryName>
    for (var g = 0; g < groups.length; g++) {
        var groupData = groups[g].data;
        var availableList = availableLists[g];

        for (var i = 1; i < groupData.length; i++) {
            var item = groupData[i];
            if (!item) continue;

            // Check if item has synthesis ingredients
            if (!item.synthIngredients || item.synthIngredients.length === 0) continue;

            // Check if item has <Menu Category: menuCategoryName> in notetag
            if (!item.note) continue;

            var menuMatch = item.note.match(/<Menu Category:\s*(.+?)>/i);
            if (!menuMatch) continue;

            var itemMenuCategory = menuMatch[1].trim();
            // Check if menu category matches or ends with the target (e.g., "Bat_Wing_Soups" contains "Soups")
            if (itemMenuCategory !== menuCategoryName && !itemMenuCategory.includes(menuCategoryName)) continue;

            foundCount++;
            log('  Found item: ' + item.name);

            // Must actually be unlocked (player holds a recipe item that lists it),
            // same gate the real synthesis scene uses - canSynthesize alone doesn't check this.
            var recipeUnlocked = availableList ? availableList.contains(item) : true;
            if (!recipeUnlocked) {
                log('    Recipe not unlocked - skipping');
                continue;
            }

            // Found an item with this menu category
            // Check if player can synthesize it
            if ($gameSystem && $gameSystem.canSynthesize && typeof $gameSystem.canSynthesize === 'function') {
                try {
                    var canCraft = $gameSystem.canSynthesize(item);
                    log('    canSynthesize result: ' + canCraft);
                    if (canCraft) {
                        craftableCount++;
                    }
                } catch (e) {
                    log('Error checking canSynthesize for "' + item.name + '": ' + e.message);
                }
            } else {
                log('    $gameSystem.canSynthesize not available');
            }
        }
    }

    log('Menu category "' + menuCategoryName + '" - Found: ' + foundCount + ', Craftable: ' + craftableCount);

    var result = craftableCount > 0;
    CraftingColor.canCraftCache[cacheKey] = result;
    return result;
};

//
// Override drawItem to recolor uncraftable choices
//
var _Window_ChoiceList_drawItem = Window_ChoiceList.prototype.drawItem;

Window_ChoiceList.prototype.drawItem = function(index) {
    var choice = this._list[index];
    if (!choice) {
        _Window_ChoiceList_drawItem.call(this, index);
        return;
    }

    var text = choice.name;
    var isCraftingChoice = false;
    var shouldRecolor = false;

    // Special handling for Soups choices - check Menu Category: Soups
    if (text === "Soups (By Food)" || text === "Soups (By Potion)") {
        isCraftingChoice = true;
        shouldRecolor = !CraftingColor.canCraftMenuCategory("Soups");
    } else if (CraftingColor.data.hasOwnProperty(text)) {
        isCraftingChoice = true;
        // Regular synthesis category choice
        var entry = CraftingColor.data[text];
        log('Checking itemCategory: "' + entry.categoryName + '" (choice: "' + text + '")');

        // Check if category has any craftable items
        var groups = [
            { data: $dataItems },
            { data: $dataWeapons },
            { data: $dataArmors }
        ];

        var hasAnyCraftable = false;
        var foundAnyInCategory = false;
        var availableLists = CraftingColor.getAvailableLists();
        for (var g = 0; g < groups.length; g++) {
            var groupData = groups[g].data;
            var availableList = availableLists[g];
            for (var i = 1; i < groupData.length; i++) {
                var item = groupData[i];
                if (!item || !item.synthIngredients || item.synthIngredients.length === 0) continue;

                var categories = item.itemCategory;
                if (!categories) continue;

                if (typeof categories === "string") {
                    categories = [categories];
                }
                if (!Array.isArray(categories)) continue;

                var inCategory = false;
                for (var c = 0; c < categories.length; c++) {
                    if (categories[c] === entry.categoryName) {
                        inCategory = true;
                        break;
                    }
                }

                if (!inCategory) continue;

                foundAnyInCategory = true;
                log('  Found item (itemCategory match): ' + item.name);

                // Must actually be unlocked (player holds a recipe item that lists it),
                // same gate the real synthesis scene uses - canSynthesize alone doesn't check this.
                var recipeUnlocked = availableList ? availableList.contains(item) : true;
                if (!recipeUnlocked) {
                    log('    Recipe not unlocked - skipping');
                    continue;
                }

                try {
                    if ($gameSystem && $gameSystem.canSynthesize && $gameSystem.canSynthesize(item)) {
                        log('    canSynthesize result: true');
                        hasAnyCraftable = true;
                        break;
                    } else {
                        log('    canSynthesize result: false');
                    }
                } catch (e) {
                    log('    Error checking canSynthesize for "' + item.name + '": ' + e.message);
                }
            }
            if (hasAnyCraftable) break;
        }

        log('itemCategory "' + entry.categoryName + '" - foundAnyInCategory: ' + foundAnyInCategory + ', hasAnyCraftable: ' + hasAnyCraftable);

        // Some categories (e.g. Potions) aren't tagged via item.itemCategory at all -
        // they only carry a <Menu Category: ...> notetag, the same field Soups uses.
        // If the itemCategory scan above found nothing, fall back to that check.
        if (!foundAnyInCategory) {
            hasAnyCraftable = CraftingColor.canCraftMenuCategory(entry.categoryName);
        }

        shouldRecolor = !hasAnyCraftable;
    }

    if (isCraftingChoice) {
        var originalChangeColor = this.changeTextColor;
        var appliedColor = shouldRecolor
            ? this.textColor(CraftingColor.textColorId)  // uncraftable -> red (palette index)
            : CraftingColor.textColorHex;                 // craftable -> green (hex)

        this.changeTextColor = function(color) {
            originalChangeColor.call(this, appliedColor);
        };

        _Window_ChoiceList_drawItem.call(this, index);

        this.changeTextColor = originalChangeColor;
        return;
    }

    _Window_ChoiceList_drawItem.call(this, index);
};

})();