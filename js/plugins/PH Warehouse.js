/*:

 PH - Warehouse/Storage
 @plugindesc This plugin allows the creation of warehouses where you can store items in the game.
 @author PrimeHover (patched)
 @version 1.2.1-patched
 @date 12/19/2025

 ---------------------------------------------------------------------------------------
 This work is licensed under the Creative Commons Attribution 4.0 International License.
 To view a copy of this license, visit http://creativecommons.org/licenses/by/4.0/
 ---------------------------------------------------------------------------------------

 @param ---Options---
 @desc Use the spaces below to customize the options of the plugin
 @default

 @param All Together
 @desc Defines whether or not you want to show the items in separated categories (0: false, 1: true)
 @default 0

 @param Stack Item Quantity
 @desc Defines whether or not you want to consider stacked items as a single space in the capacity (0: false, 1: true)
 @default 0

 @param ---Vocabulary---
 @desc Use the spaces below to personalize the vocabulary of the plugin
 @default

 @param Withdraw Text
 @desc Text shown in option "Withdraw"
 @default Withdraw

 @param Deposit Text
 @desc Text shown in option "Deposit"
 @default Deposit

 @param All Text
 @desc Text shown in option "All" if the parameter "All Together" is set as true.
 @default All

 @param Available Space Text
 @desc Text shown in the information window
 @default Available Space:

 @help

 Warehouse/Storage Plugin (patched)
 created by PrimeHover, patched to support ID-based CE keys and robust wrapper id resolution.

 ----------------------------------------------------------------------------------------------------------------------------------

 Plugin Commands:

 - PHWarehouse create <Title of the Warehouse>                      # Creates a warehouse
 - PHWarehouse create <Title of the Warehouse:50>                   # Creates a warehouse and sets its maximum capacity to 50
 - PHWarehouse create <Title of the Warehouse:50:rule>              # Creates a warehouse, sets its maximum capacity to 50 and sets a rule

 - PHWarehouse show <Title of the Warehouse>                        # Shows a warehouse
 - PHWarehouse remove <Title of the Warehouse>                      # Removes a warehouse

 - PHWarehouse loot item <Title of the Warehouse:id:quantity>       # Add an item for loot bonus inside a created warehouse
 - PHWarehouse loot weapon <Title of the Warehouse:id:quantity>     # Add a weapon for loot bonus inside a created warehouse
 - PHWarehouse loot armor <Title of the Warehouse:id:quantity>      # Add an armor for loot bonus inside a created warehouse
 - PHWarehouse loot keyItem <Title of the Warehouse:id:quantity>    # Add a key item for loot bonus inside a created warehouse

 - PHWarehouse add item <Title of the Warehouse:id:quantity>        # Add an item immediately inside a created warehouse
 - PHWarehouse add weapon <Title of the Warehouse:id:quantity>      # Add a weapon immediately inside a created warehouse
 - PHWarehouse add armor <Title of the Warehouse:id:quantity>       # Add an armor immediately inside a created warehouse
 - PHWarehouse add keyItem <Title of the Warehouse:id:quantity>     # Add a key item immediately inside a created warehouse

 - PHWarehouse capacity set <Title of the Warehouse:quantity>       # Set a new maximum capacity for a warehouse already created
 - PHWarehouse capacity increase <Title of the Warehouse:quantity>  # Increase the maximum capacity for a warehouse already created
 - PHWarehouse capacity decrease <Title of the Warehouse:quantity>  # Decrease the maximum capacity for a warehouse already created

----------------------------------------------------------------------------------------------------------------------------------

Script Commands:

 - PHPlugins.PHWarehouse.prototype.exist("Title of the Warehouse");                                # Verifies if a warehouse exists

 - PHPlugins.PHWarehouse.prototype.getMaxCapacity("Title of the Warehouse");                       # Gets the maximum capacity of a warehouse
 - PHPlugins.PHWarehouse.prototype.getCurrentCapacity("Title of the Warehouse");                   # Gets the current capacity of a warehouse

 - PHPlugins.PHWarehouse.prototype.hasItem("Title of the Warehouse", id);                          # Verifies if a warehouse has a particular item and returns the quantity of this item inside the warehouse
 - PHPlugins.PHWarehouse.prototype.hasWeapon("Title of the Warehouse", id);                        # Verifies if a warehouse has a particular weapon and returns the quantity of this item inside the warehouse
 - PHPlugins.PHWarehouse.prototype.hasArmor("Title of the Warehouse", id);                         # Verifies if a warehouse has a particular armor and returns the quantity of this item inside the warehouse
 - PHPlugins.PHWarehouse.prototype.hasKeyItem("Title of the Warehouse", id);                       # Verifies if a warehouse has a particular key item and returns the quantity of this item inside the warehouse

 ----------------------------------------------------------------------------------------------------------------------------------

Rule Commands:

    Rules are a simple way to manage which items you can store in a specific warehouse.
    In order to create a rule for your warehouse, you have to create a Common Event in the database called "PHWarehouse".
    Inside of that Common Event, you will create some comments in order to populate the rules for warehouses.
    These comments must have the following format:

    {Title of the Rule}
    [commands]

    The [commands] you can specify are as follow:

    item: 1 (Just allow the storage of the item with id 1)
    item: 1, 2, 3, 4 (Allows the storage of items with id 1, 2, 3 and 4)
    item: no (Does not allow the storage of items)
    item-n: 1 (Allows the storage of any item except the one with id 1)
    (If you don't specify the command "item" in the rule, all items will be allowed to be stored)

    weapon: 1 (Just allow the storage of the weapon with id 1)
    weapon: 1, 2, 3, 4 (Allows the storage of weapons with id 1, 2, 3 and 4)
    weapon: no (Does not allow the storage of weapons)
    weapon-n: 1 (Allows the storage of any weapon except the one with id 1)
    (If you don't specify the command "weapon" in the rule, all weapons will be allowed to be stored)

    armor: 1 (Just allow the storage of the armor with id 1)
    armor: 1, 2, 3, 4 (Allows the storage of armors with id 1, 2, 3 and 4)
    armor: no (Does not allow the storage of armors)
    armor-n: 1 (Allows the storage of any armor except the one with id 1)
    (If you don't specify the command "armor" in the rule, all armors will be allowed to be stored)

    keyItem: 1 (Just allow the storage of the key item with id 1)
    keyItem: 1, 2, 3, 4 (Allows the storage of key items with id 1, 2, 3 and 4)
    keyItem: no (Does not allow the storage of key items)
    keyItem-n: 1 (Allows the storage of any key item except the one with id 1)
    (If you don't specify the command "keyItem" in the rule, all key items will be allowed to be stored)

    New supported keys (ID-based):
    itemID: 1,2,3
    weaponID: 10,11
    armorID: 3009,3010
    keyItemID: 50,51

    Negation supported:
    armorID-n: 3009

 */

/* Global variable for PH Plugins */
var PHPlugins = PHPlugins || {};
PHPlugins.Parameters = PluginManager.parameters('PH_Warehouse');
PHPlugins.Params = PHPlugins.Params || {};

/* Global variable for the list of quests */
PHPlugins.PHWarehouse = null;

/* Getting the parameters */
PHPlugins.Params.PHWarehouseWithdrawText = String(PHPlugins.Parameters['Withdraw Text']);
PHPlugins.Params.PHWarehouseDepositText = String(PHPlugins.Parameters['Deposit Text']);
PHPlugins.Params.PHWarehouseAvailableSpaceText = String(PHPlugins.Parameters['Available Space Text']);
PHPlugins.Params.PHWarehouseAllText = String(PHPlugins.Parameters['All Text']);
PHPlugins.Params.PHWarehouseAllTogether = Number(PHPlugins.Parameters['All Together']) || 0;
PHPlugins.Params.PHWarehouseStackItemQuantity = Number(PHPlugins.Parameters['Stack Item Quantity']) || 0;
PHPlugins.Params.PHWarehouseAllTogether = Boolean(PHPlugins.Params.PHWarehouseAllTogether);
PHPlugins.Params.PHWarehouseStackItemQuantity = Boolean(PHPlugins.Params.PHWarehouseStackItemQuantity);

(function() {

    /* ---------------------------------------------------------- *
     *                      WAREHOUSE MANAGER                     *
     * ---------------------------------------------------------- */

    function PHWarehouseManager() {
        this._rules = {};
        this._warehouses = {};
        this._lastActive = "";
        this._lastOption = 0; // 0 = Withdraw, 1 = Deposit
        this._lastCategory = "item";
    }

    /* ---- BASIC OPERATIONS ---- */

    /* Creates a warehouse if it does not exist */
    PHWarehouseManager.prototype.createWarehouse = function(_sentence) {

        var matches = this.checkSentence(_sentence);
        var results;
        var title;
        var rule = null;
        var capacity = 50;

        if (matches != null) {
            results = matches.split(":");
            title = results[0];

            if (!this._warehouses.hasOwnProperty(title)) {

                if (results.length >= 2) {
                    capacity = parseInt(results[1]);
                    if (isNaN(capacity) || capacity <= 0) {
                        capacity = 50;
                    }
                    if (typeof results[2] !== "undefined" && this._rules.hasOwnProperty(results[2])) {
                        rule = results[2];
                    }
                }

                this._warehouses[title] = {
                    title: title,
                    maxCapacity: capacity,
                    currentCapacity: 0,
                    rule: rule,
                    lootBonus: true,
                    items: {
                        item: [],
                        weapon: [],
                        armor: [],
                        keyItem: []
                    },
                    qtty: {
                        item: {},
                        weapon: {},
                        armor: {},
                        keyItem: {}
                    }
                };
            }

            this._lastActive = title;
        }

    };

    /* Opens a warehouse */
    PHWarehouseManager.prototype.openWarehouse = function(_sentence) {
        var matches = this.checkSentence(_sentence);
        if (matches != null) {
            this._lastActive = matches;
            this._warehouses[this._lastActive].lootBonus = false;
        }
    };

    /* Remove a warehouse */
    PHWarehouseManager.prototype.removeWarehouse = function(_sentence) {

        var matches = this.checkSentence(_sentence);

        if (matches != null) {
            if (this._warehouses.hasOwnProperty(matches)) {
                delete this._warehouses[matches];
            }
        }

    };

    /* Add a loot bonus */
    PHWarehouseManager.prototype.addLoot = function(_sentence, category) {

        var matches = this.checkSentence(_sentence);
        var results;

        if (matches != null) {
            results = matches.split(":");
            if (this._warehouses.hasOwnProperty(results[0]) && this._warehouses[results[0]].lootBonus && typeof results[1] !== "undefined" && typeof results[2] !== "undefined") {
                results[1] = parseInt(results[1]);
                results[2] = parseInt(results[2]);
                if (results[2] > this._warehouses[results[0]].maxCapacity - this._warehouses[results[0]].currentCapacity) {
                    results[2] = this._warehouses[results[0]].maxCapacity - this._warehouses[results[0]].currentCapacity;
                }

                if (this._warehouses[results[0]].items[category].indexOf(results[1]) > -1) {
                    this._warehouses[results[0]].qtty[category][results[1]] += results[2];
                } else {
                    this._warehouses[results[0]].items[category].push(results[1]);
                    this._warehouses[results[0]].qtty[category][results[1]] = results[2];
                }
                this._warehouses[results[0]].currentCapacity += results[2];
            }
        }

    };

    /* Add item to a warehouse */
    PHWarehouseManager.prototype.addItems = function(_sentence, category) {

        var matches = this.checkSentence(_sentence);
        var results;

        if (matches != null) {
            results = matches.split(":");
            if (this._warehouses.hasOwnProperty(results[0]) && typeof results[1] !== "undefined" && typeof results[2] !== "undefined") {
                results[1] = parseInt(results[1]);
                results[2] = parseInt(results[2]);

                if (results[2] > this._warehouses[results[0]].maxCapacity - this._warehouses[results[0]].currentCapacity) {
                    results[2] = this._warehouses[results[0]].maxCapacity - this._warehouses[results[0]].currentCapacity;
                }

                if (this._warehouses[results[0]].items[category].indexOf(results[1]) > -1) {
                    this._warehouses[results[0]].qtty[category][results[1]] += results[2];
                } else {
                    this._warehouses[results[0]].items[category].push(results[1]);
                    this._warehouses[results[0]].qtty[category][results[1]] = results[2];
                }
                this._warehouses[results[0]].currentCapacity += results[2];
            }
        }

    };



    /* ---- RULE METHODS ---- */

    /* Load rules */
    /* Replace the existing loadRules with this version that also attaches _meta from CE */
PHWarehouseManager.prototype.loadRules = function() {
    var warehouseVar = null;

    if ($dataCommonEvents) {
        for (var i = 0; i < $dataCommonEvents.length; i++) {
            if ($dataCommonEvents[i] instanceof Object && $dataCommonEvents[i].name == "PHWarehouse") {
                warehouseVar = $dataCommonEvents[i].list;
                i = $dataCommonEvents.length;
            }
        }
    }

    if (warehouseVar != null) {
        // call original populateRules to build enabled/disabled arrays
        this.populateRules(warehouseVar);

        // Now parse CE comment blocks for "meta: Key: Value" lines and attach to this._rules[RuleName]._meta
        try {
            var currentRule = null;
            for (var j = 0; j < warehouseVar.length; j++) {
                var cmd = warehouseVar[j];
                if (!cmd || !cmd.parameters) continue;
                var text = String(cmd.parameters[0] || '').trim();
                // Title block {RuleName}
                if (text.charAt(0) === '{' && text.charAt(text.length - 1) === '}') {
                    currentRule = text.slice(1, text.length - 1);
                    if (this._rules && this._rules[currentRule] && !this._rules[currentRule]._meta) {
                        this._rules[currentRule]._meta = [];
                    }
                } else if (currentRule && this._rules && this._rules[currentRule]) {
                    // meta: Key: Value  (case-insensitive)
                    if (text.toLowerCase().indexOf('meta:') === 0) {
                        var token = text.slice(5).trim();
                        // support "Key: Value" or "Key=Value"
                        var sep = (token.indexOf(':') > -1) ? ':' : (token.indexOf('=') > -1 ? '=' : null);
                        if (!sep) continue;
                        var parts = token.split(sep);
                        var key = parts[0] ? parts[0].trim().toLowerCase() : '';
                        var value = parts.slice(1).join(sep).trim().toLowerCase();
                        if (!key || !value) continue;
                        this._rules[currentRule]._meta = this._rules[currentRule]._meta || [];
                        var exists = this._rules[currentRule]._meta.some(function(m){ return m.key === key && m.value === value; });
                        if (!exists) this._rules[currentRule]._meta.push({ key: key, value: value });
                    }
                }
            }
        } catch (e) {
            console.warn('PH_Warehouse: loadRules meta attach failed', e);
        }
    }
};


   PHWarehouseManager.prototype.populateRules = function(warehouseVar) {
    var str = '';
    var index = -1;
    var rule;

    for (var i = 0; i < warehouseVar.length; i++) {
        if (warehouseVar[i].parameters[0]) {
            str = warehouseVar[i].parameters[0].trim();
            if (this.checkTitle(str)) {
                str = str.slice(1, str.length - 1);
                this._rules[str] = {
                    enabledItems: { item: [], weapon: [], armor: [], keyItem: [] },
                    disabledItems: { item: [], weapon: [], armor: [], keyItem: [] },
                    _meta: []
                };
                index = str;
            } else if (this._rules[index]) {
                var firstColon = str.indexOf(':');
                if (firstColon === -1) continue;
                var head = str.slice(0, firstColon).trim();
                var tail = str.slice(firstColon + 1).trim();
                var cmd = head;
                var arg = tail;

                if (cmd.toLowerCase() === 'meta') {
                    var token = arg;
                    if (token) {
                        var sep = (token.indexOf(':') > -1) ? ':' : (token.indexOf('=') > -1 ? '=' : null);
                        if (sep) {
                            var parts = token.split(sep);
                            var key = parts[0] ? parts[0].trim().toLowerCase() : '';
                            var value = parts.slice(1).join(sep).trim().toLowerCase();
                            if (key && value) {
                                this._rules[index]._meta = this._rules[index]._meta || [];
                                var exists = this._rules[index]._meta.some(function(m){ return m.key === key && m.value === value; });
                                if (!exists) this._rules[index]._meta.push({ key: key, value: value });
                            }
                        }
                    }
                    continue;
                }

                if (cmd.indexOf('-n') > -1) {
                    var baseCmd = cmd.replace("-n", "");
                    if (this._rules[index].disabledItems.hasOwnProperty(baseCmd)) {
                        this._rules[index].disabledItems[baseCmd] = this.getItemsId(arg);
                    }
                } else {
                    if (this._rules[index].enabledItems.hasOwnProperty(cmd)) {
                        if (arg.toLowerCase().indexOf("no") > -1) {
                            this._rules[index].enabledItems[cmd] = false;
                        } else {
                            this._rules[index].enabledItems[cmd] = this.getItemsId(arg);
                        }
                    }
                }
            }
        }
    }
};








    /* Checks if the string is a title or a description */
    PHWarehouseManager.prototype.checkTitle = function(str) {
        if (str.charAt(0) == "{" && str.charAt(str.length - 1) == "}") {
            return true;
        }
        return false;
    };

    /* Separate ids and make it an array (robust and tolerant) */
    PHWarehouseManager.prototype.getItemsId = function(str) {
        if (str === undefined || str === null) return [];
        // allow passing arrays already
        if (Array.isArray(str)) {
            return str.map(function(x){ var n = parseInt(x,10); return isNaN(n) ? null : n; }).filter(function(n){ return n !== null; });
        }
        // trim and handle 'no' or 'all' tokens upstream; here parse numbers
        var arr = String(str).split(',');
        var out = [];
        for (var i = 0; i < arr.length; i++) {
            var s = String(arr[i]).trim();
            if (s.length === 0) continue;
            var n = parseInt(s, 10);
            if (!isNaN(n)) out.push(n);
        }
        return out;
    };

    /* Checks if items are enabled */
    PHWarehouseManager.prototype.isItemEnabled = function() {
        if (this._warehouses[this._lastActive].rule == null || (this._rules.hasOwnProperty(this._warehouses[this._lastActive].rule) && Array.isArray(this._rules[this._warehouses[this._lastActive].rule].enabledItems.item))) {
            return true;
        }
        return false;
    };

    /* Checks if weapons are enabled */
    PHWarehouseManager.prototype.isWeaponEnabled = function() {
        if (this._warehouses[this._lastActive].rule == null || (this._rules.hasOwnProperty(this._warehouses[this._lastActive].rule) && Array.isArray(this._rules[this._warehouses[this._lastActive].rule].enabledItems.weapon))) {
            return true;
        }
        return false;
    };

    /* Checks if armors are enabled */
    PHWarehouseManager.prototype.isArmorEnabled = function() {
        if (this._warehouses[this._lastActive].rule == null || (this._rules.hasOwnProperty(this._warehouses[this._lastActive].rule) && Array.isArray(this._rules[this._warehouses[this._lastActive].rule].enabledItems.armor))) {
            return true;
        }
        return false;
    };

    /* Checks if key items are enabled */
    PHWarehouseManager.prototype.isKeyItemEnabled = function() {
        if (this._warehouses[this._lastActive].rule == null || (this._rules.hasOwnProperty(this._warehouses[this._lastActive].rule) && Array.isArray(this._rules[this._warehouses[this._lastActive].rule].enabledItems.keyItem))) {
            return true;
        }
        return false;
    };

    /* Verifies if an item is allowed to be withdrawn or deposited — normalized id extraction */
    PHWarehouseManager.prototype.verifyItem = function(item) {
        if (item == undefined) return false;

        // helper: extract numeric id from wrapper or DB object
        function extractId(obj) {
            if (obj === undefined || obj === null) return null;
            // if it's a number
            if (typeof obj === 'number' && !isNaN(obj)) return obj;
            // common direct id fields
            var cand = (obj.id !== undefined ? obj.id : (obj.itemId !== undefined ? obj.itemId : (obj.armorId !== undefined ? obj.armorId : (obj.weaponId !== undefined ? obj.weaponId : (obj.dataId !== undefined ? obj.dataId : null)))));
            if (cand !== null && cand !== undefined && !isNaN(Number(cand))) return Number(cand);
            // nested shapes
            if (obj.item && obj.item.id !== undefined && !isNaN(Number(obj.item.id))) return Number(obj.item.id);
            if (obj.object && obj.object.id !== undefined && !isNaN(Number(obj.object.id))) return Number(obj.object.id);
            if (obj._item && obj._item.id !== undefined && !isNaN(Number(obj._item.id))) return Number(obj._item.id);
            // fallback: if it's a DB object with .id
            if (obj.id !== undefined && !isNaN(Number(obj.id))) return Number(obj.id);
            return null;
        }

        // Determine category (respect All Together setting)
        this.verifyAllTogether(item);

        // Normalize candidate and id
        var candidate = item;
        if (candidate && candidate.item) candidate = candidate.item;
        if (candidate && candidate.object) candidate = candidate.object;
        if (candidate && candidate._item) candidate = candidate._item;

        var id = extractId(candidate);

        // If no id found, fall back to original behavior (use item.id if present)
        if (id === null && candidate && candidate.id !== undefined) id = Number(candidate.id);

        // If still no id, return false
        if (id === null || isNaN(id)) {
            // undo AllTogether change
            this.undoAllTogetherVerification();
            return false;
        }

        var ruleName = this._warehouses[this._lastActive] ? this._warehouses[this._lastActive].rule : null;

        // If no rule assigned, allow by default
        if (ruleName == null) {
            // check disabledItems if present (none)
            this.undoAllTogetherVerification();
            return true;
        }

        var ruleObj = this._rules[ruleName];
        if (!ruleObj) {
            this.undoAllTogetherVerification();
            return true;
        }

        var cat = this._lastCategory;

        // If enabledItems[cat] is false => category explicitly disabled
        var enabledArr = ruleObj.enabledItems && ruleObj.enabledItems[cat];
        if (enabledArr === false) {
            this.undoAllTogetherVerification();
            return false;
        }

        // If enabledArr is an array and non-empty, id must be present; if empty array => all allowed
        if (Array.isArray(enabledArr) && enabledArr.length > 0) {
            if (enabledArr.indexOf(id) === -1) {
                this.undoAllTogetherVerification();
                return false;
            }
        }

        // Check disabledItems
        var disabledArr = ruleObj.disabledItems && ruleObj.disabledItems[cat];
        if (Array.isArray(disabledArr) && disabledArr.indexOf(id) > -1) {
            this.undoAllTogetherVerification();
            return false;
        }

        this.undoAllTogetherVerification();
        return true;
    };

    /* Changes the last category if "all together" are set as true */
    PHWarehouseManager.prototype.verifyAllTogether = function(item) {
        if (PHPlugins.Params.PHWarehouseAllTogether == true) {
            if (DataManager.isItem(item) && item.itypeId === 1) {
                this._lastCategory = 'item';
            } else if (DataManager.isArmor(item)) {
                this._lastCategory = 'armor';
            } else if (DataManager.isWeapon(item)) {
                this._lastCategory = 'weapon';
            } else if (DataManager.isItem(item) && item.itypeId === 2) {
                this._lastCategory = 'keyItem';
            }
        }
    };

    /* Undo what the previous function has done */
    PHWarehouseManager.prototype.undoAllTogetherVerification = function() {
        if (PHPlugins.Params.PHWarehouseAllTogether == true) {
            this._lastCategory = 'all';
        }
    };

    /* Changes the maximum capacity of the warehouse for the given title */
    PHWarehouseManager.prototype.setMaxCapacity = function(_sentence) {
        var matches = this.checkSentence(_sentence);
        if (matches != null) {
            var results = matches.split(":");
            if (results.length == 2) {
                var title = results[0];
                var capacity = parseInt(results[1]);
                if (this._warehouses.hasOwnProperty(title) && !isNaN(capacity) && capacity >= this.getCurrentCapacity(title)) {
                    this._warehouses[title].maxCapacity = capacity;
                    if (this._warehouses[title].maxCapacity < 0) {
                        this._warehouses[title].maxCapacity = 0;
                    }
                }
            }
        }
    };

    /* Increases the maximum capacity of the warehouse for the given title */
    PHWarehouseManager.prototype.increaseMaxCapacity = function(_sentence) {
        var matches = this.checkSentence(_sentence);
        if (matches != null) {
            var results = matches.split(":");
            if (results.length == 2) {
                var title = results[0];
                var capacity = parseInt(results[1]);
                if (this._warehouses.hasOwnProperty(title) && !isNaN(capacity) && (this._warehouses[title].maxCapacity + capacity) >= this.getCurrentCapacity(title)) {
                    this._warehouses[title].maxCapacity += capacity;
                    if (this._warehouses[title].maxCapacity < 0) {
                        this._warehouses[title].maxCapacity = 0;
                    }
                }
            }
        }
    };

    /* Decreases the maximum capacity of the warehouse for the given title */
    PHWarehouseManager.prototype.decreaseMaxCapacity = function(_sentence) {
        var matches = this.checkSentence(_sentence);
        if (matches != null) {
            var results = matches.split(":");
            if (results.length == 2) {
                var title = results[0];
                var capacity = parseInt(results[1]);
                if (this._warehouses.hasOwnProperty(title) && !isNaN(capacity) && (this._warehouses[title].maxCapacity - capacity) >= this.getCurrentCapacity(title)) {
                    this._warehouses[title].maxCapacity -= capacity;
                    if (this._warehouses[title].maxCapacity < 0) {
                        this._warehouses[title].maxCapacity = 0;
                    }
                }
            }
        }
    };

    /* ---- MANAGEMENT METHODS ---- */

    /* Get all the items from the current warehouse */
    PHWarehouseManager.prototype.getItems = function() {
        var totalItems = this.getCommonItems();
        totalItems = totalItems.concat(this.getArmors());
        totalItems = totalItems.concat(this.getKeyItems());
        totalItems = totalItems.concat(this.getWeapons());
        return totalItems;
    };

    /* Get weapon items */
    PHWarehouseManager.prototype.getWeapons = function() {
        var totalItems = [];
        for (var i = 0; i < this._warehouses[this._lastActive].items.weapon.length; i++) {
            for (var j = 0; j < $dataWeapons.length; j++) {
                if ($dataWeapons[j] != null && this._warehouses[this._lastActive].items.weapon[i] == $dataWeapons[j].id) {
                    totalItems.push($dataWeapons[j]);
                }
            }
        }
        return totalItems;
    };

    /* Get common items */
    PHWarehouseManager.prototype.getCommonItems = function() {
        var totalItems = [];
        for (var i = 0; i < this._warehouses[this._lastActive].items.item.length; i++) {
            for (var j = 0; j < $dataItems.length; j++) {
                if ($dataItems[j] != null && this._warehouses[this._lastActive].items.item[i] == $dataItems[j].id) {
                    totalItems.push($dataItems[j]);
                }
            }
        }
        return totalItems;
    };

    /* Get armor items */
    PHWarehouseManager.prototype.getArmors = function() {
        var totalItems = [];
        for (var i = 0; i < this._warehouses[this._lastActive].items.armor.length; i++) {
            for (var j = 0; j < $dataArmors.length; j++) {
                if ($dataArmors[j] != null && this._warehouses[this._lastActive].items.armor[i] == $dataArmors[j].id) {
                    totalItems.push($dataArmors[j]);
                }
            }
        }
        return totalItems;
    };

    /* Get key items */
    PHWarehouseManager.prototype.getKeyItems = function() {
        var totalItems = [];
        for (var i = 0; i < this._warehouses[this._lastActive].items.keyItem.length; i++) {
            for (var j = 0; j < $dataItems.length; j++) {
                if ($dataItems[j] != null && this._warehouses[this._lastActive].items.keyItem[i] == $dataItems[j].id) {
                    totalItems.push($dataItems[j]);
                }
            }
        }
        return totalItems;
    };

    /* Get the quantity for the corresponding item */
    PHWarehouseManager.prototype.getQuantity = function(item) {
        this.verifyAllTogether(item);
        var qtty = this._warehouses[this._lastActive].qtty[this._lastCategory][item.id];
        this.undoAllTogetherVerification();
        return qtty;
    };

    /* Checks whether or not the warehouse is already full */
    PHWarehouseManager.prototype.checkCapacity = function() {
        var capacity = this.getCurrentCapacity(this._lastActive);
        if (capacity < this._warehouses[this._lastActive].maxCapacity) {
            return true;
        }
        return false;
    };

    /* ---- OPERATION METHODS ---- */

    /* Deposit on warehouse */
    PHWarehouseManager.prototype.deposit = function(item) {
        if (this.checkCapacity()) {

            this.verifyAllTogether(item);
            if (this._lastCategory != 'all') {
                var hasItem = false;
                if (this._warehouses[this._lastActive].items[this._lastCategory].indexOf(item.id) > -1) {
                    hasItem = true;
                }

                if (hasItem) {
                    this._warehouses[this._lastActive].qtty[this._lastCategory][item.id]++;
                } else {
                    this._warehouses[this._lastActive].items[this._lastCategory].push(item.id);
                    this._warehouses[this._lastActive].qtty[this._lastCategory][item.id] = 1;
                }
                this._warehouses[this._lastActive].currentCapacity++;
            }
            this.undoAllTogetherVerification();

        }

    };

    /* Withdraw from a warehouse */
    PHWarehouseManager.prototype.withdraw = function(item) {

        this.verifyAllTogether(item);

        if (this._lastCategory != 'all') {
            var hasItem = false;
            var index = this._warehouses[this._lastActive].items[this._lastCategory].indexOf(item.id);
            if (index > -1) {
                hasItem = true;
            }

            if (hasItem) {
                this._warehouses[this._lastActive].qtty[this._lastCategory][item.id]--;
                if (this._warehouses[this._lastActive].qtty[this._lastCategory][item.id] == 0) {
                    this._warehouses[this._lastActive].items[this._lastCategory].splice(index, 1);
                    delete this._warehouses[this._lastActive].qtty[this._lastCategory][item.id];
                }
                this._warehouses[this._lastActive].currentCapacity--;
            }
        }

        this.undoAllTogetherVerification();

    };

    /* ---- INTERNAL METHODS ---- */

    /* Check sentences coming from the arguments */
    PHWarehouseManager.prototype.checkSentence = function(_sentence) {
        var regExp = /\<([^)]+)\>/;
        var matches = regExp.exec(_sentence);
        if (matches != null) {
            return matches[1];
        } else {
            return null;
        }
    };

    /* Main method for checking items inside warehouses */
    PHWarehouseManager.prototype.hasItems = function(title, id, category) {
        if (this._warehouses.hasOwnProperty(title) && this._warehouses[title].items[category].indexOf(id) > -1) {
            return this._warehouses[title].qtty[category][id];
        }
        return 0;
    };

    /* ---- ACCESSOR METHODS ---- */

    /* Return the value of the maximum capacity of the warehouse for the given title */
    PHWarehouseManager.prototype.getMaxCapacity = function(title) {
        if (this._warehouses.hasOwnProperty(title)) {
            return this._warehouses[title].maxCapacity;
        }
        return 0;
    };

    /* Return the value of the quantity of items in the warehouse for the given title */
    PHWarehouseManager.prototype.getCurrentCapacity = function(title) {
        if (this._warehouses.hasOwnProperty(title)) {
            if (PHPlugins.Params.PHWarehouseStackItemQuantity == true) {
                return (this._warehouses[title].items.item.length + this._warehouses[title].items.weapon.length + this._warehouses[title].items.keyItem.length + this._warehouses[title].items.armor.length);
            } else {
                return this._warehouses[title].currentCapacity;
            }
        }
        return 0;
    };

    /* Return whether or not the warehouse for the given title exists */
    PHWarehouseManager.prototype.exist = function(title) {
        if (this._warehouses.hasOwnProperty(title) && this._warehouses[title]) {
            return true;
        }
        return false;
    };

    /* ---- END OF MANAGER DEFINITION ---- */

    /* Expose the manager on PHPlugins */
    PHPlugins.PHWarehouse = new PHWarehouseManager();

})();
 
/* ---------- INIT: safe non-blocking rebuild hook ---------- */
/* Ensures rules are parsed after load without blocking create/show */
(function(){
    function safeRebuild() {
        try {
            if (window.PHPlugins && PHPlugins.PHWarehouse) {
                try { PHPlugins.PHWarehouse.loadRules && PHPlugins.PHWarehouse.loadRules(); } catch(e){}
            }
        } catch(e) {
            console.warn('PH_Warehouse safeRebuild error', e);
        }
    }
    setTimeout(safeRebuild, 200);
    setTimeout(safeRebuild, 1000);
})();
