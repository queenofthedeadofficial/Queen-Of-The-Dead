//=============================================================================
// Andrew_ISLabelColor.js
//=============================================================================

/*:
 * @plugindesc v1.00 Recolors the "Ingredients" and "Quantity" labels in
 * YEP_ItemSynthesis to a custom hex color.
 * @author Andrew
 *
 * @param Label Color
 * @desc Hex color used for the "Ingredients" and "Quantity" labels.
 * @default #fff200
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * This plugin overrides the two label-drawing methods in YEP_ItemSynthesis
 * so the "Ingredients" header (Window_SynthesisIngredients) and the
 * "Quantity" header (Window_SynthesisNumber) draw in a custom color instead
 * of the default systemColor().
 *
 * Place this plugin BELOW YEP_ItemSynthesis in the plugin list.
 *
 * ============================================================================
 */
//=============================================================================

var Andrew = Andrew || {};
Andrew.ISLabelColor = Andrew.ISLabelColor || {};
Andrew.Parameters = PluginManager.parameters(document.currentScript.src
  .split('/').pop().replace(/\.js$/, ''));

Andrew.ISLabelColor.Color = String(Andrew.Parameters['Label Color'] || '#fff200');

//=============================================================================
// Window_SynthesisIngredients
//=============================================================================

Window_SynthesisIngredients.prototype.drawItemIngredients = function(item, wy) {
    var ww = this.contents.width;
    this.changeTextColor(Andrew.ISLabelColor.Color);
    this.drawText(Yanfly.Param.ISIngredientsList, 0, 0, ww, 'center');
    this.changeTextColor(this.normalColor());
    for (var i = 0; i < item.synthIngredients.length; ++i) {
      wy = this.drawItemDetails(i, wy);
      if (wy + this.lineheight > this.contents.height) break;
    }
    this.drawItemSynthCost(item, wy);
};

//=============================================================================
// Window_SynthesisNumber
//=============================================================================

Window_SynthesisNumber.prototype.drawAmountText = function() {
    this.resetFontSettings();
    this.changeTextColor(Andrew.ISLabelColor.Color);
    this.drawText(Yanfly.Param.ISAmountText, 0, 0, this.contents.width);
    this.resetTextColor();
};