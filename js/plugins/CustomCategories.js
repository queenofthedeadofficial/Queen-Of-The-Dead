const _WS_cat_makeCommandList = Window_SynthesisCategory.prototype.makeCommandList;
Window_SynthesisCategory.prototype.makeCommandList = function() {
    _WS_cat_makeCommandList.call(this); // keep YEP defaults
    this.addCommand("Food", "food");
    this.addCommand("Potion", "potion");
    this.addCommand("Soups", "soups");
};
