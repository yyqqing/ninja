/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

var Montage = require("montage/core/core").Montage;
var Component = require("montage/ui/component").Component;

exports.DocumentBar = Montage.create(Component, {

    designView: { value: null, enumerable: false},
    codeView: { value: null, enumerable: false},
    zoomControl: { value: null, enumerable: false },
    _type: { enumerable: false, value: null },

    type: {
        enumerable: false,
        get: function() { return this._type; },
        set: function(value) {
            if (this._type === value) {
                return;
            }

            this._type = value;
            this.needsDraw = true;

        }
    },

    _currentView: { value: null, enumerable: false },

    currentView: {
        get: function() { return this._currentView},
        set: function(value) {
            if (this._currentView === value) {
                return;
            }

            this._currentView = value;
            this.needsDraw = true;
        }
    },

    _zoomFactor: { value: 100, enumerable: false },

	zoomFactor: {
		get: function()	{ return this._zoomFactor; },

		set: function(value)
		{
			if(value !== this._zoomFactor)
			{
				this._zoomFactor = value;
				if (!this._firstDraw)
				{
					var viewUtils = this.application.ninja.stage.viewUtils;
					this.application.ninja.stage.setZoom(value);
				}
			}
		}
	},

    draw: {
        value: function() {
            if(this.type === "htm" || this.type === "html") {
                this.designView.classList.add("active");
                this.codeView.classList.add("active");

                if(this.currentView === "design") {
                    this.designView.classList.add("selected");
                    if(this.codeView.classList.contains("selected")) this.codeView.classList.toggle("selected");
                } else {
                    this.codeView.classList.add("selected");
                    if(this.designView.classList.contains("selected")) this.designView.classList.toggle("selected");
                }
                
            } else if(this.type) {
                this.designView.classList.remove("active");
            }

        }
    },

    prepareForDraw: {
        value: function() {
            this.designView.addEventListener("click", this, false);
            this.codeView.addEventListener("click", this, false);
         
        }
    },

    handleClick: {
        value: function(event) {
            if(event._event.target.id === this.currentView) return;

            this.currentView = event._event.target.id;
            documentManagerModule.DocumentManager.switchViews();
        }
    }
});