//============================================================================
// EliMZ_GlobalText.js
//============================================================================

/*:
@target MZ
@base EliMZ_Book
@orderAfter EliMZ_MessageActions

@plugindesc ♦1.1.0♦ You can use escape codes in every window!
@author Hakuen Studio
@url https://docs.google.com/document/d/1ukZpD4sqzb5gR98Uef6yAP44rm34ncgIflit2pqbBpU/edit?usp=sharing

@help
↑↑↑ HOW TO USE / HELP FILE ABOVE ↑↑↑

★★★★★ → Rate the plugin! Please, is very important to me ^^
https://hakuenstudio.itch.io/eli-super-text/rate?source=game

♦ TERMS OF USE
https://www.hakuenstudio.com/terms-of-use-5-0-0

♦ DOWNLOAD
https://hakuenstudio.itch.io/eli-super-text

♦ SUPPORT
https://hakuenstudio.itch.io/eli-super-text/community

♦ FEATURES

● Activate escape codes to be used in any window!
● Can exclude specific window classes from global text processing.

@param auto
@text Automatic Mode
@type boolean
@desc If you set to false, you will have to put a tag on the first letter of any text.
@default false

@param tag
@text Tag
@type string
@desc The tag used to detect if the text has escape codes. Must be used as first letter(Only for Manual mode).
@default §

@param excludedWindows
@text Excluded Windows
@type combo[]
@option Window_ActorCommand @option Window_BattleActor @option Window_BattleEnemy @option Window_BattleItem @option Window_BattleLog @option Window_BattleSkill @option Window_BattleStatus @option Window_ChoiceList @option Window_CommandInfo @option Window_DebugEdit @option Window_DebugRange @option Window_DescriptionInfo @option Window_EquipCommand @option Window_EquipItem @option Window_EquipSlot @option Window_EquipStatus @option Window_EventItem @option Window_FaceMessage @option Window_GameEnd @option Window_Gold @option Window_Help @option Window_HelpActorCommand @option Window_HelpChoice @option Window_HelpNumberInput @option Window_HelpPartyCommand @option Window_HelpSelectItem @option Window_HelpTitle @option Window_ItemCategory @option Window_ItemList @option Window_LoadPoint @option Window_MapName @option Window_MapSelectCommand @option Window_MenuActor @option Window_MenuCommand @option Window_MenuStatus @option Window_Message @option Window_Minimap @option Window_NameBox @option Window_NameEdit @option Window_NameInput @option Window_NumberInput @option Window_Options @option Window_PartyCommand @option Window_Preview @option Window_SavefileList @option Window_SavePoint @option Window_ScrollText @option Window_ShopBuy @option Window_ShopCommand @option Window_ShopNumber @option Window_ShopSell @option Window_ShopStatus @option Window_SkillList @option Window_SkillStatus @option Window_SkillType @option Window_SoundList @option Window_SoundMainCategory @option Window_SoundPlaying @option Window_SoundSceneTitle @option Window_SoundSubCategory @option Window_Status @option Window_StatusEquip @option Window_StatusParam @option Window_TitleCommand @option Window_TitleInfo @option Window_ToastInfo @option Window_GameFilterHelp @option Window_Options_GameFilter
@desc Window class names that should not process global text.
@default ["Window_ShopStatus","Window_NumberInput","Window_ItemList","Window_SkillList","Window_NameInput"]

*/

"use strict"

/**
 * The Eli Namespace that holds all Eli plugins.
 * @namespace Eli
 */
var Eli = Eli || {}
/**
 * The Imported object used by plugins to check loaded dependencies.
 * @type {Object}
 */
var Imported = Imported || {}
/**
 * Indicates that EliMZ_GlobalText is loaded.
 * @type {boolean}
 */
Imported.Eli_GlobalText = true

if(!Imported.Eli_Book && !window.eliErrorTriggered){
	window.eliErrorTriggered = true
	if(confirm("All EliMZ plugins need the core plugin EliMZ_Book. Click OK to download it and install somewhere above all other EliMZ plugins.")){
		window.location.href = "https://hakuenstudio.itch.io/eli-book-rpg-maker-mv-mz"
	}
	SceneManager.exit()
}

/**
 * @typedef {Object} Eli.GlobalText.ParsedParameters
 * @property {boolean} auto - Whether automatic escape code detection is enabled.
 * @property {string} tag - The manual mode tag used to mark global text.
 * @property {string[]} excludedWindows - The window class names excluded from global text processing.
 */

/**
 * The global plugin object.
 * @namespace Eli.GlobalText
 */
Eli.GlobalText = {

    /**
     * Stores the regular expression used to remove the configured global text tag.
     * @type {RegExp|null}
     */
	regGlobalEscape: null,
    /**
     * Detects RPG Maker escape codes in plain text.
     * @type {RegExp}
     */
	regEscapeCode: /(?:\\|\x1b)(?:[$.|^!><{}\\]|[A-Z]+(?:\[[^\]]*\])?)/i,

    /**
     * @class
     * @memberof Eli.GlobalText
     * @classdesc Parses and stores all global text plugin parameters.
     */
    Parameters: class Parameters{

        /**
         * Creates the parsed parameter container.
         * @param {Object.<string, string>} parameters - The raw plugin parameter object.
         */
        constructor(parameters){
            const defaultExcludedWindows = [
                "Window_ShopStatus",
                "Window_NumberInput",
                "Window_ItemList",
                "Window_SkillList",
                "Window_NameInput",
            ]
            /**
             * Stores whether automatic escape code detection is enabled.
             * @type {boolean}
             */
            this.auto = parameters.auto === "true"
            /**
             * Stores the manual mode tag used to mark global text.
             * @type {string}
             */
            this.tag = parameters.tag || "§"
            /**
             * Stores the window class names excluded from global text processing.
             * @type {string[]}
             */
            this.excludedWindows = parameters.excludedWindows ? JSON.parse(parameters.excludedWindows) : defaultExcludedWindows
        }
    },

    /**
     * Initializes the plugin runtime state.
     */
	initialize(){
		Eli.VersionManager.register("EliMZ_GlobalText", "1.1.0")
		this.initParameters()
		this.regGlobalEscape = this.createTagRegExp()
	},

    /**
     * Parses all plugin parameters.
     */
	initParameters(){
		const parameters = PluginManager.parameters("EliMZ_GlobalText")
        /**
         * Stores the parsed parameter container.
         * @type {Eli.GlobalText.ParsedParameters}
         */
        this.parameters = new this.Parameters(parameters)
	},

    /**
     * Registers all plugin commands.
     */
    initPluginCommands(){
        const commands = []
        Eli.PluginManager.registerCommands(this, commands, "EliMZ_GlobalText")
    },

    /**
     * Returns the parsed parameter container.
     * @returns {Eli.GlobalText.ParsedParameters} The parsed parameter container.
     */
    getParam(){
        return this.parameters
    },

    /**
     * Creates the regular expression used to remove the configured global tag.
     * @returns {RegExp|null} The global tag regular expression, or null when no tag exists.
     */
	createTagRegExp(){
		if(this.getParam().tag){
			return new RegExp(this.escapeRegExpText(this.getParam().tag), "g")
		}else{
            return null
        }
	},

    /**
     * Escapes regular expression special characters from a text value.
     * @param {string} text - The text to escape.
     * @returns {string} The escaped text.
     */
    escapeRegExpText(text){
		return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	},

    /**
     * Checks whether a text starts with the configured global tag.
     * @param {string} text - The text to check.
     * @returns {boolean} True when the text starts with the global tag.
     */
	hasGlobalTag(text){
		if(this.getParam().tag){
			return String(text).startsWith(this.getParam().tag)
		}else{
            return false
        }
	},

    /**
     * Checks whether a text contains an RPG Maker escape code.
     * @param {string} text - The text to check.
     * @returns {boolean} True when the text contains an escape code.
     */
	hasEscapeCode(text){
		return this.regEscapeCode.test(String(text))
	},

    /**
     * Checks whether a text should be processed as global text.
     * @param {string} text - The text to check.
     * @returns {boolean} True when the text should use global text processing.
     */
	canUseGlobalText(text){
		const stringText = String(text)

		if(stringText.length > 0){
			const isManualText = this.hasGlobalTag(stringText)
			const isAutoText = this.getParam().auto && this.hasEscapeCode(stringText)

			return isManualText || isAutoText
		}else{
            return false
        }
	},

    /**
     * Removes the configured global tag from the start of a text.
     * @param {string} text - The text to process.
     * @returns {string} The text without the leading global tag.
     */
	removeGlobalTag(text){
		const result = String(text)
		const tag = this.getParam().tag

		if(tag && result.startsWith(tag)){
			return result.slice(tag.length)
		}else{
            return result
        }
	},

    /**
     * Prepares a text for global escape code rendering.
     * @param {string} text - The text to process.
     * @returns {string} The prepared global text.
     */
	prepareGlobalText(text){
		let txt = String(text)

		txt = this.removeGlobalTag(txt)
		txt = Eli.Utils.convertEscapeVariablesOnly(txt)

		return txt
	},

    /**
     * Checks whether a window is excluded from global text processing.
     * @param {Window_Base} windowObject - The window instance to check.
     * @returns {boolean} True when the window is excluded.
     */
    isExcludedWindow(windowObject){
        let result = false
        const excludedWindows = this.getExcludedWindowList()

        for(const winName of excludedWindows){
            if(this.isExcludedWindowClass(windowObject, winName)){
                result = true
                break
            }
        }

        return result
    },

    /**
     * Returns the configured excluded window class names.
     * @returns {string[]} The excluded window class names.
     */
    getExcludedWindowList(){
        return this.getParam().excludedWindows
    },

    /**
     * Checks whether a window object matches an excluded window class name.
     * @param {Window_Base} windowObject - The window instance to check.
     * @param {string} className - The configured window class name.
     * @returns {boolean} True when the window matches the class name.
     */
    isExcludedWindowClass(windowObject, className){
        const windowClass = window[className]
    
        if(typeof windowClass === "function"){
            return windowObject instanceof windowClass
        }else if(windowObject.constructor){
            return windowObject.constructor.name === className
        }

        return false
    },

}

{

const Plugin = Eli.GlobalText
const Alias = {}

Plugin.initialize()

/* ------------------------------ GAME MESSAGE ------------------------------ */
// Hook into Game_Message.add to prepare message text before it enters the message queue.
Alias.Game_Message_add = Game_Message.prototype.add
Game_Message.prototype.add = function(text) {
	const globalText = Plugin.prepareGlobalText(text)
	Alias.Game_Message_add.call(this, globalText)
}

/* ------------------------------- WINDOW BASE ------------------------------ */
// Hook into Window_Base.initialize to store the configured global tag on each window instance.
Alias.Window_Base_initialize = Window_Base.prototype.initialize
Window_Base.prototype.initialize = function(rect){
	Alias.Window_Base_initialize.call(this, rect)
	this._globalTag = Plugin.getParam().tag
}

// Hook into Window_Base.drawText to redirect eligible text through global text drawing.
Alias.Window_Base_drawText = Window_Base.prototype.drawText
Window_Base.prototype.drawText = function(text, x, y, maxWidth, align) {
	if(this.canDrawGlobalText(text)){
		this.drawGlobalText(text, x, y, maxWidth, align || "left")
	}else{
		Alias.Window_Base_drawText.call(this, text, x, y, maxWidth, align)
	}
}

// Hook into Window_Base.drawTextEx to prepare global text before escape code rendering.
Alias.Window_Base_drawTextEx = Window_Base.prototype.drawTextEx
Window_Base.prototype.drawTextEx = function(text, x, y, width) {
	let globalText = text

	if(text !== null && text !== undefined){
		globalText = Plugin.prepareGlobalText(text)

		if(Imported.Eli_MessageActions){
			const align = arguments[4] || this.currentAlign

			if(align){
				globalText = `\x1bAlign[${align}]${globalText}`
			}
		}
	}

	return Alias.Window_Base_drawTextEx.call(this, globalText, x, y, width)
}

/**
 * Draws text using global escape code processing.
 * @param {string} text - The text to draw.
 * @param {number} x - The x coordinate.
 * @param {number} y - The y coordinate.
 * @param {number} maxWidth - The maximum text width.
 * @param {string} align - The text alignment.
 */
Window_Base.prototype.drawGlobalText = function(text, x, y, maxWidth, align){
	const globalText = Plugin.prepareGlobalText(text)
	const drawAlign = align || "left"
	let drawX = x

	if(Imported.Eli_MessageActions){
		this.drawTextEx(globalText, drawX, y, maxWidth, drawAlign)
	}else{
		if((drawAlign === "center" || drawAlign === "right") && maxWidth > 0){
			const textSize = this.textSizeEx(globalText)

			if(drawAlign === "center"){
				drawX = x + Math.max((maxWidth - textSize.width) / 2, 0)
			}else if(drawAlign === "right"){
				drawX = x + Math.max(maxWidth - textSize.width, 0)
			}
		}

		this.drawTextEx(globalText, drawX, y, maxWidth)
	}
}

/**
 * Checks whether this window can process global text.
 * @returns {boolean} True when this window can process global text.
 */
Window_Base.prototype.isValidGlobalTextWindow = function(){
	return !Plugin.isExcludedWindow(this)
}

/**
 * Checks whether a text can be drawn using global text processing in this window.
 * @param {string} text - The text to check.
 * @returns {boolean} True when the text can use global text drawing.
 */
Window_Base.prototype.canDrawGlobalText = function(text){
	let result = false

	if(text !== null && text !== undefined){
		const stringText = String(text)
		result = Plugin.canUseGlobalText(stringText) && this.isValidGlobalTextWindow()
	}

	return result
}

if(Imported.Eli_MessageActions){

    // Hook into Window_Base.drawCurrencyValue to support escape codes in the currency unit.
    Alias.Window_Base_drawCurrencyValue = Window_Base.prototype.drawCurrencyValue
	Window_Base.prototype.drawCurrencyValue = function(value, unit, x, y, width) {
		if(Plugin.canUseGlobalText(String(unit)) && this.isValidGlobalTextWindow()){
			this.drawCurrencyValueWithGlobalText(value, unit, x, y, width)
		}else{
			Alias.Window_Base_drawCurrencyValue.call(this, value, unit, x, y, width)
		}
	}

    /**
     * Draws a currency value using global text processing.
     * @param {number|string} value - The currency value.
     * @param {string} unit - The currency unit text.
     * @param {number} x - The x coordinate.
     * @param {number} y - The y coordinate.
     * @param {number} width - The maximum drawing width.
     */
	Window_Base.prototype.drawCurrencyValueWithGlobalText = function(value, unit, x, y, width) {
		const codes = Eli.MessageActions.parameters.txt
		const valueColor = `\x1b${codes.color}[${ColorManager.normalColor()}]`
		const unitColor = `\x1b${codes.color}[${ColorManager.systemColor()}]`
		const text = `${valueColor}${value} ${unitColor}${unit}`

		this.drawTextEx(text, x, y, width, "right")
	}

}

}