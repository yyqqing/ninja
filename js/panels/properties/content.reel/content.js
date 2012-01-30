/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

var Montage         = require("montage/core/core").Montage,
    Component       = require("montage/ui/component").Component,
    PiData          = require("js/data/pi/pi-data").PiData,
    CustomSection   = require("js/panels/properties/sections/custom.reel").CustomSection;

var ElementsMediator = require("js/mediators/element-mediator").ElementMediator;

exports.Content = Montage.create(Component, {

    elementName: {
        value: null
    },

    elementID: {
        value: null
    },

    elementClassName: {
        value: null
    },

    customSections: {
        value: []
    },

    _customPi: {
        value: null
    },

    customPi: {
        get: function() {
            return this._customPi;
        },
        set: function(value) {
            if(this._customPi !== value) {
                this._customPi = value;
            }
        }
    },

    prepareForDraw: {
        value : function() {

            this.eventManager.addEventListener("selectionChange", this, false);

            // This will be a toggle option
            if(this.application.ninja.appData.PILiveUpdate) {
                this.eventManager.addEventListener( "elementChanging", this, false);
            }

            this.eventManager.addEventListener( "elementChange", this, false);

            if(this.application.ninja.selectedElements.length === 0) {
                this.displayStageProperties();
            }

            this.elementId.element.addEventListener("blur", this, false);
            this.elementId.element.addEventListener("keyup", this, false);
        }
    },

    /**
     * Blur and Key up to handle change in the Element ID field.
     */
    handleBlur: {
        value: function(event) {
            if(this.application.ninja.selectedElements.length) {
                ElementsMediator.setAttribute(this.application.ninja.selectedElements[0], "id", this.elementId.value, "Change", "pi");
            } else {
                ElementsMediator.setAttribute(this.application.ninja.currentDocument.documentRoot, "id", this.elementId.value, "Change", "pi", this.application.ninja.currentDocument.documentRoot.elementModel.id);
            }
        }
    },
    
    handleKeyup: {
        value: function(event) {
            if(event.keyCode === 13) {
                this.elementId.element.blur();
            }      
        }
    },

    handleElementChanging: {
        value: function(event) {
//            this.positionSize.leftPosition = parseFloat(ElementsMediator.getProperty(this.application.ninja.selectedElements[0]._element, "left"));
//            this.positionSize.topPosition = parseFloat(ElementsMediator.getProperty(this.application.ninja.selectedElements[0]._element, "top"));
        }
    },

    handleElementChange: {
        value: function(event) {
//            console.log("Element Change PI ", event.detail.source); // If the event comes from the pi don't need to update
            if(event.detail.source && event.detail.source !== "pi") {
                this.positionSize.leftPosition = parseFloat(ElementsMediator.getProperty(this.application.ninja.selectedElements[0]._element, "left"));
                this.positionSize.topPosition = parseFloat(ElementsMediator.getProperty(this.application.ninja.selectedElements[0]._element, "top"));
            }
        }
    },

    handleSelectionChange: {
        value: function(event) {
            if(event.detail.isDocument) {
                this.displayStageProperties();
            } else {
                if(this.application.ninja.selectedElements.length === 1) {
                    this.displayElementProperties(this.application.ninja.selectedElements[0]._element);
                } else {
                    this.displayGroupProperties(this.application.ninja.selectedElements);
                }

            }
        }
    },

    displayStageProperties: {
        value: function() {
            var stage = this.application.ninja.currentDocument.documentRoot;
            //this is test code please remove
            this.elementName = "Stage";
            this.elementId.value = stage.elementModel.id;
            this.elementClassName = "";

            this.positionSize.disablePosition = true;
            this.threeD.disableTranslation = true;

            this.positionSize.heightSize = parseFloat(ElementsMediator.getProperty(stage, "height"));
            this.positionSize.widthSize = parseFloat(ElementsMediator.getProperty(stage, "width"));

            if(this.customPi !== stage.elementModel.pi) {
                this.customPi = stage.elementModel.pi;
                this.displayCustomProperties(stage, stage.elementModel.pi);
            }
        }
    },

    displayElementProperties: {
        value: function (el) {
            var customPI;

            this.elementName = el.elementModel.selection;
            this.elementId.value = el.getAttribute("id") || "";
            this.elementClassName = el.getAttribute("class");

            this.positionSize.disablePosition = false;
            this.threeD.disableTranslation = false;

            this.positionSize.leftPosition = parseFloat(ElementsMediator.getProperty(el, "left"));
            this.positionSize.topPosition = parseFloat(ElementsMediator.getProperty(el, "top"));
            this.positionSize.heightSize = parseFloat(ElementsMediator.getProperty(el, "height"));
            this.positionSize.widthSize = parseFloat(ElementsMediator.getProperty(el, "width"));


            if(this.threeD.inGlobalMode)
            {
                this.threeD.x3D = ElementsMediator.get3DProperty(el, "x3D");
                this.threeD.y3D = ElementsMediator.get3DProperty(el, "y3D");
                this.threeD.z3D = ElementsMediator.get3DProperty(el, "z3D");
                this.threeD.xAngle = ElementsMediator.get3DProperty(el, "xAngle");
                this.threeD.yAngle = ElementsMediator.get3DProperty(el, "yAngle");
                this.threeD.zAngle = ElementsMediator.get3DProperty(el, "zAngle");
            }

            // Custom Section
            if(this.customPi !== el.elementModel.pi) {
                this.customPi = el.elementModel.pi;
                this.displayCustomProperties(el, el.elementModel.pi);
            }

            customPI = PiData[this.customPi];
            // Get all the custom section for the custom PI
            for(var i = 0, customSec; customSec = customPI[i]; i++) {

                // Now set the Fields for the custom PI
                for(var j = 0, fields; fields = customSec.Section[j]; j++) {
                    for(var k = 0, control; control = fields[k]; k++) {

                        if(control.prop !== "border-color" && control.prop !== "background-color") {
                            var currentValue = ElementsMediator.getProperty(el, control.prop, control.valueMutator);
                            currentValue ? currentValue = currentValue : currentValue = control.defaultValue;
                            this.customSections[0].content.controls[control.id] = currentValue;
                        }
                    }
                }
            }

            
            //TODO: Once logic for color and gradient is established, this needs to be revised

            var color, background, backgroundImage, borderColor = ElementsMediator.getProperty(el, "border-color"), borderImage = ElementsMediator.getProperty(el, "border-image");
            this.application.ninja.colorController.colorModel.input = "stroke";
            if(borderColor || borderImage) {
            	if (borderImage && borderImage !== 'none' && borderImage.indexOf('-webkit') >= 0) {
            		//Gradient
            		color = this.application.ninja.colorController.getColorObjFromCss(borderImage);
            		if (color && color.value) {
    		        	this.application.ninja.colorController.colorModel[color.mode] = {value: color.value, wasSetByCode: true, type: 'change'};
    	        	} else {
    	        		this.application.ninja.colorController.colorModel.alpha = {value: 1, wasSetByCode: true, type: 'change'};
	            		this.application.ninja.colorController.colorModel.applyNoColor();
            		}
            	} else {
            		//Solid
            		color = this.application.ninja.colorController.getColorObjFromCss(borderColor);
            		if (color && color.value) {
        	    		color.value.wasSetByCode = true;
						color.value.type = 'change';
	    	        	if (color.value.a) {
	    	        		this.application.ninja.colorController.colorModel.alpha = {value: color.value.a, wasSetByCode: true, type: 'change'};
	    	        	}
	    	        	this.application.ninja.colorController.colorModel[color.mode] = color.value;
	            	} else {
	            		this.application.ninja.colorController.colorModel.alpha = {value: 1, wasSetByCode: true, type: 'change'};
            			this.application.ninja.colorController.colorModel.applyNoColor();
            		}
            	}
            } else {
            	this.application.ninja.colorController.colorModel.alpha = {value: 1, wasSetByCode: true, type: 'change'};
                this.application.ninja.colorController.colorModel.applyNoColor();
            }
			//
            background = ElementsMediator.getProperty(el, "background-color");
            backgroundImage = ElementsMediator.getProperty(el, "background-image");
            this.application.ninja.colorController.colorModel.input = "fill";
            if(background || backgroundImage) {
            	if (backgroundImage && backgroundImage !== 'none' && backgroundImage.indexOf('-webkit') >= 0) {
            		//Gradient
            		color = this.application.ninja.colorController.getColorObjFromCss(backgroundImage);
            		if (color && color.value) {
    		        	this.application.ninja.colorController.colorModel[color.mode] = {value: color.value, wasSetByCode: true, type: 'change'};
    	        	} else {
    	        		this.application.ninja.colorController.colorModel.alpha = {value: 1, wasSetByCode: true, type: 'change'};
	            		this.application.ninja.colorController.colorModel.applyNoColor();
            		}
            	} else {
            		//Solid
            		color = this.application.ninja.colorController.getColorObjFromCss(background);
            		if (color && color.value) {
        	    		color.value.wasSetByCode = true;
						color.value.type = 'change';
	    	        	if (color.value.a) {
	    	        		this.application.ninja.colorController.colorModel.alpha = {value: color.value.a, wasSetByCode: true, type: 'change'};
	    	        	}
	    	        	this.application.ninja.colorController.colorModel[color.mode] = color.value;
	            	} else {
	            		this.application.ninja.colorController.colorModel.alpha = {value: 1, wasSetByCode: true, type: 'change'};
            			this.application.ninja.colorController.colorModel.applyNoColor();
            		}
            	}
            } else {
            	this.application.ninja.colorController.colorModel.alpha = {value: 1, wasSetByCode: true, type: 'change'};
                this.application.ninja.colorController.colorModel.applyNoColor();
            }





        }
    },

    displayGroupProperties: {
        value: function (els) {
            this.elementName = "Multiple Elements";
        }
    },

    displayCustomProperties: {
        value: function() {
            var customPI;

            this.customSections = [];

            customPI = PiData[this.customPi];

            if(customPI) {
                //Get all the custom sections for the custom PI
                for(var i = 0, customSec; customSec = customPI[i]; i++) {
                    var customUI = CustomSection.create();
                    customUI.fields = customSec.Section;
                    this.customSections.push({
                        name: customSec.label,
                        content: customUI
                    });
                }
            }

            for(var j = 0, customSections; customSections = this.customSections[j]; j++) {
                customSections.content.addEventListener("propertyChange", this, false);
                customSections.content.addEventListener("propertyChanging", this, false);
            }

        }
    },

    handlePropertyChange: {
        value: function(e) {
            var newValue;

            e.units ? newValue = e.value + e.units : newValue = e.value;

            if(e.prop === "border-width") {// || e.prop === "border-style") {
                ElementsMediator.setProperty(this.application.ninja.selectedElements, "border-style", [this.customSections[0].content.controls.borderStyle], "Change", "pi");
            } else if(e.prop === "border-style") {
                ElementsMediator.setProperty(this.application.ninja.selectedElements, "border-width", [this.customSections[0].content.controls.borderWidth + "px"], "Change", "pi");
            }

            ElementsMediator.setProperty(this.application.ninja.selectedElements, e.prop, [newValue], "Change", "pi");

        }
    },

    handlePropertyChanging: {
        value: function(e) {

//            ElementsMediator.setProperty(this.application.ninja.selectedElements, "border-style", [this.customSections[0].content.controls.borderStyle], "Changing", "pi");
            ElementsMediator.setProperty(this.application.ninja.selectedElements, e.prop, [e.value + "px"], "Changing", "pi");


        }
    }

});