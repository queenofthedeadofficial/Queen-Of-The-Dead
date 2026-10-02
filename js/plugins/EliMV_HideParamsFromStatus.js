//==========================================================================
// EliMV_HideParamsFromStatus.js
//==========================================================================

/*:
@plugindesc ♦1.0.0♦ Removes specific parameters from the status and equip screens.
@author Hakuen Studio
@url https://forums.rpgmakerweb.com/threads/how-to-remove-parameters.182742/

@help
♦ FEATURES
- Removes specific parameters from the status screen and equip screen.

♦ HOW TO USE
Set a list of parameter ids you want to hide on the plugin parameters.

Parameter ids:
0: MHP
1: MMP
2: ATK
3: DEF
4: MAT
5: MDF
6: AGI
7: LUK

Separate each id with a comma.
For example, to hide MDF and LUK, write:
5,7

The default status and equip parameter blocks only draw
parameters 2 through 7. Therefore, ids 0 and 1 are accepted by the parser but
have no visible effect on the status and equip screens.

Overwrites:
- Window_EquipStatus.prototype.refresh
- Window_Status.prototype.drawParameters

@param hideParams
@text Param Ids to Hide
@type text
@desc List the parameter ids you want to hide from the status and equip screens.
@default 7

*/

"use strict"

var Eli = Eli || {}
var Imported = Imported || {}
Imported.Eli_HideParamsFromStatus = true

Eli.HideParamsFromStatus = {

	parameters: {},

	initialize(){
		this.initParameters()
	},

	initParameters(){
		const parameters = PluginManager.parameters("EliMV_HideParamsFromStatus")
		this.parameters.hideParams = this.parseHideParams(parameters.hideParams)
	},

	parseHideParams(value){
		const result = []
		const list = value.split(",")

		for(let i = 0; i < list.length; i++){
			const item = list[i].trim()

			if(item !== ""){
				result.push(Number(item))
			}
		}

		return result
	},

	isParamHidden(paramId){
		return this.parameters.hideParams.indexOf(paramId) >= 0
	}
}

Eli.HideParamsFromStatus.initialize()

/* --------------------------- WINDOW EQUIP STATUS -------------------------- */

Window_EquipStatus.prototype.refresh = function(){
	this.contents.clear()

	if(this._actor){
		let drawIndex = 0

		this.drawActorName(this._actor, this.textPadding(), 0)

		for(let i = 0; i < 6; i++){
			const paramId = i + 2

			if(Eli.HideParamsFromStatus.isParamHidden(paramId)){
				continue
			}

			this.drawItem(0, this.lineHeight() * (1 + drawIndex), paramId)
			drawIndex++
		}
	}
}

/* ------------------------------- WINDOW STATUS ---------------------------- */

Window_Status.prototype.drawParameters = function(x, y){
	const lineHeight = this.lineHeight()
	let drawIndex = 0

	for(let i = 0; i < 6; i++){
		const paramId = i + 2

		if(Eli.HideParamsFromStatus.isParamHidden(paramId)){
			continue
		}

		const y2 = y + lineHeight * drawIndex

		this.changeTextColor(this.systemColor())
		this.drawText(TextManager.param(paramId), x, y2, 160)
		this.resetTextColor()
		this.drawText(this._actor.param(paramId), x + 160, y2, 60, "right")

		drawIndex++
	}
}