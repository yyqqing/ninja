/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */

var Montage = require("montage/core/core").Montage,
    viewUtils = require("js/helper-classes/3D/view-utils").ViewUtils,
    vecUtils = require("js/helper-classes/3D/vec-utils").VecUtils,
    toolHandleModule = require("js/stage/tool-handle"),
    ElementsMediator = require("js/mediators/element-mediator").ElementMediator,
    DrawingToolBase = require("js/tools/drawing-tool-base").DrawingToolBase,
    Keyboard = require("js/mediators/keyboard-mediator").Keyboard,
    ModifierToolBase = require("js/tools/modifier-tool-base").ModifierToolBase;

var SelectionTool = exports.SelectionTool = Montage.create(ModifierToolBase, {
    drawingFeedback: { value: { mode: "Draw2D", type: "" } },

    _canOperateOnStage: { value: true},
    _isSelecting: {value: false, writable:true},
    _shiftMove: { value: 10},

    _showTransformHandles: { value: false, enumerable: true },

    _handleToolOptionsChange : {
        value: function (event) {
            this._showTransformHandles = event.detail.inTransformMode;
            this.DrawHandles();
        }
    },

    startDraw: {
        value: function(event) {
            if(!this.application.ninja.selectedElements.length)
            {
                this._isSelecting = true;
                this._canSnap = false;
            }
            else
            {
                this._canSnap = true;
            }

            this.isDrawing = true;
            this.application.ninja.stage.showSelectionBounds = false;

            if(this._canSnap)
            {
                this.initializeSnapping(event);
            }
            else
            {
                this.drawWithoutSnapping(event);
            }
        }
    },

    drawSelectionMarquee: {
        value: function(event) {
            var point = webkitConvertPointFromPageToNode(this.application.ninja.stage.canvas,
                                                        new WebKitPoint(event.pageX, event.pageY));

            if(this._isSpace) {
                this._currentDX = point.x - this._currentX;
                this._currentDY = point.y - this._currentY;

                this.downPoint.x += this._currentDX;
                this.downPoint.y += this._currentDY;
                this.currentX += this._currentDX;
                this.currentY += this._currentDY;

                DrawingToolBase.draw2DRectangle(this.downPoint.x,this.downPoint.y,this.currentX - this.downPoint.x,this.currentY - this.downPoint.y);
            } else {
                this._currentX = point.x;
                this._currentY = point.y;

                DrawingToolBase.draw2DRectangle(this.downPoint.x,this.downPoint.y,point.x - this.downPoint.x,point.y - this.downPoint.y);
            }
        }
    },

    HandleMouseMove: {
        value: function(event) {
            if(this._escape) {
                this._escape = false;
                this.isDrawing = true;
            }

            if(this._isSelecting) {
                // Draw the Selection Marquee
                this.drawSelectionMarquee(event);
            }
            else
            {
                if(this.isDrawing) {
                    this._hasDraw = true;   // Flag for position of element
                    this.doDraw(event);
                } else {
                    this._showFeedbackOnMouseMove(event);
    //                if(this._canSnap)
    //                {
    //                    this.doSnap(event);
    //                }
                }

                this.DrawHandles(this._delta);
                if(this._canSnap && this._isDrawing)
                {
                    this.application.ninja.stage.stageDeps.snapManager.drawLastHit();
                }
            }
        }
    },

    HandleLeftButtonUp: {
        value: function(event) {
            var selectedItems,
                point = webkitConvertPointFromPageToNode(this.application.ninja.stage.canvas,
                                                                    new WebKitPoint(event.pageX, event.pageY));

            this.isDrawing = false;
            this.application.ninja.stage.showSelectionBounds = true;
            if(this._escape) {
                this._escape = false;
                this._isSelecting = false;
                return;
            }


            if(this._isSelecting) {
                this._isSelecting = false;

                // Don't do the marque selection if the mouse has not moved
                if(this.downPoint.x != point.x && this.downPoint.y != point.y) {
                    var box = [];
                    selectedItems = [];

                    box[0] = this.downPoint.x - this.application.ninja.stage.documentOffsetLeft + this.application.ninja.stage.scrollLeft;
                    box[1] = this.downPoint.y - this.application.ninja.stage.documentOffsetTop + this.application.ninja.stage.scrollTop;
                    box[2] = box[0] + (point.x - this.downPoint.x);
                    box[3] = box[1] + (point.y - this.downPoint.y);
                    box = this.absoluteRectangle(box[0], box[1],box[2],box[3]);


                    //selectionManagerModule.selectionManager.marqueeSelection(box);
                    var childNodes = this.application.ninja.currentDocument.documentRoot.childNodes;
                    childNodes = Array.prototype.slice.call(childNodes, 0);
                    childNodes.forEach(function(item) {
                        if(item.nodeType == 1 && SelectionTool._simpleCollisionDetection(item, box)) {
                            selectedItems.push(item);
                        }
                    });

                    this.application.ninja.selectionController.selectElements(selectedItems);

                }

                this.endDraw(event);
                return;
            }



            if(this._hasDraw)
            {
                if(this._activateOriginHandle)
                {
                    this._setTransformOrigin(true);
                }
                else if ( ((this.downPoint.x - point.x) !== 0) ||
                            ((this.downPoint.y - point.y) !== 0) )
                {
                    this._updateTargets(true);
                }

                this._hasDraw = false;
            }
            if(this._handleMode !== null)
            {
                this._handleMode = null;
                this._delta = null;
                this.DrawHandles();
				console.log( "move: (" + dx + ", " + dy + ")" );
            }

            this.endDraw(event);
        }
    },

    HandleDoubleClick: {
            value: function(event) {
                /*
                var selectedObject = stageManagerModule.stageManager.GetObjectFromPoint(event.layerX, event.layerY, this._canOperateOnStage);

                if(selectedObject) {
                    if(selectionManagerModule.selectionManager.findSelectedElement(selectedObject) === -1) {
                        selectionManagerModule.selectionManager.setSingleSelection(selectedObject);
                    }
                }
                */

                // Temporary Code for Breadcrumb
                if(this.application.ninja.selectedElements.length > 0) {
                    this.application.ninja.currentSelectedContainer = this.application.ninja.selectedElements[0]._element;
                } else {
                    console.log(this.application.ninja.currentDocument.documentRoot.uuid);
                    this.application.ninja.currentSelectedContainer = this.application.ninja.currentDocument.documentRoot;
                }

            }
        },

    HandleKeyPress: {
        value: function(event){
            var inc;

            if (!(event.target instanceof HTMLInputElement)) {
                if(this.application.ninja.selectedElements.length !== 0) {
                    inc  = (event.shiftKey) ? this._shiftMove : 1;

                    switch(event.keyCode) {
                        case Keyboard.LEFT:
                            var newLeft = [];
                            var leftArr = this.application.ninja.selectedElements.map(function(item) {
                                newLeft.push( (parseFloat(ElementsMediator.getProperty(item._element, "left")) - inc) + "px"  );
                                return ElementsMediator.getProperty(item._element, "left");
                            });

                            ElementsMediator.setProperty(this.application.ninja.selectedElements, "left", newLeft , "Change", "selectionTool", leftArr);
                            break;
                        case Keyboard.UP:
                            var newTop = [];
                            var topArr = this.application.ninja.selectedElements.map(function(item) {
                                newTop.push( (parseFloat(ElementsMediator.getProperty(item._element, "top")) - inc) + "px"  );
                                return ElementsMediator.getProperty(item._element, "top");
                            });

                            ElementsMediator.setProperty(this.application.ninja.selectedElements, "top", newTop , "Change", "selectionTool", topArr);
                            break;
                        case Keyboard.RIGHT:
                            var newLeft = [];
                            var leftArr = this.application.ninja.selectedElements.map(function(item) {
                                newLeft.push( (parseFloat(ElementsMediator.getProperty(item._element, "left")) + inc) + "px"  );
                                return ElementsMediator.getProperty(item._element, "left");
                            });

                            ElementsMediator.setProperty(this.application.ninja.selectedElements, "left", newLeft , "Change", "selectionTool", leftArr);
                            break;
                        case Keyboard.DOWN:
                            var newTop = [];
                            var topArr = this.application.ninja.selectedElements.map(function(item) {
                                newTop.push( (parseFloat(ElementsMediator.getProperty(item._element, "top")) + inc) + "px"  );
                                return ElementsMediator.getProperty(item._element, "top");
                            });

                            ElementsMediator.setProperty(this.application.ninja.selectedElements, "top", newTop , "Change", "selectionTool", topArr);
                            break;
                        default:
                            return false;
                            break;
                    }


                } else {
                    // Try and capture the delete key so that the browser doesn't attempt an unwelcome history action.
                    if (event.keyCode == Keyboard.BACKSPACE) {
                        event.stopImmediatePropagation();
                        event.preventDefault();
                    }
                }
            }
            // console.log("Unhandled key press:", event.keyCode);

        }
    },

    _updateTargets: {
        value: function(addToUndoStack) {
            var newLeft = [],
                newTop = [],
                newWidth = [],
                newHeight = [],
                previousLeft = [],
                previousTop = [],
                previousWidth = [],
                previousHeight = [];
            var len = this.application.ninja.selectedElements.length;
            this._targets = [];
            for(var i = 0; i < len; i++)
            {
                var elt = this.application.ninja.selectedElements[i]._element;

                var curMat = viewUtils.getMatrixFromElement(elt);
                var curMatInv = glmat4.inverse(curMat, []);

                this._targets.push({elt:elt, mat:curMat, matInv:curMatInv});
                if(addToUndoStack)
                {
                    var previousMat = this._undoArray[i].mat.slice(0);
                    var prevX = this._undoArray[i]._x;
                    var prevY = this._undoArray[i]._y;
                    var prevW = this._undoArray[i]._w;
                    var prevH = this._undoArray[i]._h;
                    var _x = parseFloat(ElementsMediator.getProperty(elt, "left")) + curMat[12] - previousMat[12];
                    var _y = parseFloat(ElementsMediator.getProperty(elt, "top")) + curMat[13] - previousMat[13];
                    var _w = parseFloat(ElementsMediator.getProperty(elt, "width"));
                    var _h = parseFloat(ElementsMediator.getProperty(elt, "height"));

                    previousLeft.push(prevX + "px");
                    previousTop.push(prevY + "px");
                    previousWidth.push(prevW + "px");
                    previousHeight.push(prevH + "px");
                    newLeft.push(_x + "px");
                    newTop.push(_y + "px");
                    newWidth.push(_w + "px");
                    newHeight.push(_h + "px");

                    viewUtils.setMatrixForElement(elt, previousMat);
                }
            }
            if(addToUndoStack)
            {
                ElementsMediator.setProperties(this.application.ninja.selectedElements,
                                                { "left": newLeft, "top": newTop, "width": newWidth, "height": newHeight },
                                                "Change",
                                                "selectionTool",
                                                { "left" : previousLeft, "top" : previousTop, "width": previousWidth, "height": previousHeight}
                                              );
            }
            // Save previous value for undo/redo
            this._undoArray = [];
            for(i = 0, len = this._targets.length; i < len; i++)
            {
                var item = this._targets[i];
                var _x = parseFloat(ElementsMediator.getProperty(item.elt, "left"));
                var _y = parseFloat(ElementsMediator.getProperty(item.elt, "top"));
                var _w = parseFloat(ElementsMediator.getProperty(item.elt, "width"));
                var _h = parseFloat(ElementsMediator.getProperty(item.elt, "height"));
                var _mat = viewUtils.getMatrixFromElement(item.elt);
                this._undoArray.push({_x:_x, _y:_y, _w:_w, _h:_h, mat:_mat});
            }

        }
    },

    _moveElements: {
		value: function (transMat) {
			var len = this._targets.length,
				i,
				item,
				elt,
				curMat;

			var matInv = glmat4.inverse(this._startMat, []);
			var nMat = glmat4.multiply(transMat, this._startMat, [] );
			var qMat = glmat4.multiply(matInv, nMat, []);

            this._startMat = nMat;

			for(i = 0; i < len; i++)
			{
				item = this._targets[i];
				elt = item.elt;
				curMat = item.mat;

//                curMat = curMat.multiply(qMat);
				glmat4.multiply(curMat, qMat, curMat);

				viewUtils.setMatrixForElement( elt, curMat, true);

                this._targets[i].mat = curMat;
			}
            NJevent("elementChanging", {type : "Changing", redraw: false});
		}
	},

    //-------------------------------------------------------------------------
    //Routines to modify the selected objects
    modifyElements : {
        value : function(data, event)
        {
            var delta,
                deltaH,
                deltaW,
                deltaL,
                deltaT;
            if(this._handleMode !== null)
            {
                // 0  7  6
                // 1     5
                // 2  3  4
                switch(this._handleMode)
                {
                    case 0:
                        // Resize North-West
                        delta = ~~(data.pt1[0] - data.pt0[0]);
                        deltaW = this._undoArray.map(function(item) { return item._w + delta + "px"});
                        deltaL = this._undoArray.map(function(item) { return item._x + delta + "px"});
                        delta = ~~(data.pt1[1] - data.pt0[1]);
                        deltaH = this._undoArray.map(function(item) { return item._h - delta + "px"});
                        deltaT = this._undoArray.map(function(item) { return item._y + delta + "px"});
                        ElementsMediator.setProperties(this.application.ninja.selectedElements,
                                                        { "left": deltaL, "top": deltaT, "width": deltaW, "height": deltaH }, "Changing", "SelectionTool" );
                        break;
                    case 1:
                        // Resize West
                        delta = ~~(data.pt1[0] - data.pt0[0]);
                        deltaW = this._undoArray.map(function(item) { return item._w - delta + "px"});
                        deltaL = this._undoArray.map(function(item) { return item._x + delta + "px"});
                        ElementsMediator.setProperties(this.application.ninja.selectedElements,
                                                        { "left": deltaL, "width": deltaW }, "Changing", "SelectionTool" );
                        break;
                    case 2:
                        // Resize South-West
                        delta = ~~(data.pt1[0] - data.pt0[0]);
                        deltaW = this._undoArray.map(function(item) { return item._w - delta + "px"});
                        deltaL = this._undoArray.map(function(item) { return item._x + delta + "px"});
                        delta = ~~(data.pt1[1] - data.pt0[1]);
                        deltaH = this._undoArray.map(function(item) { return item._h + delta + "px"});
                        ElementsMediator.setProperties(this.application.ninja.selectedElements,
                                                        { "left": deltaL, "width": deltaW, "height": deltaH }, "Changing", "SelectionTool" );
                        break;
                    case 3:
                        // Resize South
                        delta = ~~(data.pt1[1] - data.pt0[1]);
                        deltaH = this._undoArray.map(function(item) { return item._h + delta + "px"});
                        ElementsMediator.setProperty(this.application.ninja.selectedElements, "height", deltaH, "Changing", "SelectionTool" );
                        break;
                    case 4:
                        // Resize South-East
                        delta = ~~(data.pt1[0] - data.pt0[0]);
                        deltaW = this._undoArray.map(function(item) { return item._w + delta + "px"});
                        delta = ~~(data.pt1[1] - data.pt0[1]);
                        deltaH = this._undoArray.map(function(item) { return item._h + delta + "px"});
                        ElementsMediator.setProperties(this.application.ninja.selectedElements, { "width": deltaW, "height": deltaH }, "Changing", "SelectionTool" );
                        break;
                    case 5:
                        // Resize East
                        delta = ~~(data.pt1[0] - data.pt0[0]);
                        deltaW = this._undoArray.map(function(item) { return item._w + delta + "px"});
                        ElementsMediator.setProperty(this.application.ninja.selectedElements, "width", deltaW, "Changing", "SelectionTool" );
                        break;
                    case 6:
                        // Resize North-East
                        delta = ~~(data.pt1[0] - data.pt0[0]);
                        deltaW = this._undoArray.map(function(item) { return item._w + delta + "px"});
                        delta = ~~(data.pt1[1] - data.pt0[1]);
                        deltaH = this._undoArray.map(function(item) { return item._h - delta + "px"});
                        deltaT = this._undoArray.map(function(item) { return item._y + delta + "px"});
                        ElementsMediator.setProperties(this.application.ninja.selectedElements,
                                                        { "top": deltaT, "width": deltaW, "height": deltaH }, "Changing", "SelectionTool" );
                        break;
                    case 7:
                        // Resize North
                        delta = ~~(data.pt1[1] - data.pt0[1]);
                        deltaH = this._undoArray.map(function(item) { return item._h - delta + "px"});
                        deltaT = this._undoArray.map(function(item) { return item._y + delta + "px"});
                        ElementsMediator.setProperties(this.application.ninja.selectedElements,
                                                        { "top": deltaT, "height": deltaH }, "Changing", "SelectionTool" );
                        break;
                    default:
                        break;
                }

                this._delta = delta;
            }
            else
            {
                // form the translation vector and post translate the matrix by it.
                delta = vecUtils.vecSubtract( 3, data.pt1, data.pt0 );
                var transMat = Matrix.Translation( delta );
                this._moveElements(transMat);
            }
        }
    },

    updateUsingSnappingData: {
        value: function(event) {
            var data;

            if(this._handleMode === null)
            {
                this.getUpdatedSnapPoint(event);
                if (this._mouseDownHitRec && this._mouseUpHitRec)
                {
                    data = this.getMousePoints();
                    if(data)
                    {
                        this.modifyElements(data, event);
                    }
                }
            }
            else
            {
                var point = webkitConvertPointFromPageToNode(this.application.ninja.stage.canvas,
                                                                new WebKitPoint(event.pageX, event.pageY));
                var do3DSnap = false;
                do3DSnap = event.ctrlKey || event.metaKey;

                this.mouseUpHitRec = DrawingToolBase.getUpdatedSnapPoint(point.x, point.y, do3DSnap, this.mouseDownHitRec);
                if (this._mouseDownHitRec && this._mouseUpHitRec)
                {
                    data = this.getDrawingData(event);
                    if(data)
                    {
                        this.modifyElements({pt0:data.mouseDownPos, pt1:data.mouseUpPos}, event);
                    }
                }
            }
        }
    },

    /*
 	 *  The parameterization is based on the position of the
 	 *  snap point in pre-transformed element screen space
 	 */
 	parameterizeSnap:
 	{
 		value: function( hitRec )
 		{
 			var paramPt = [0,0,0];
             var elt = this._getObjectBeingTracked(hitRec);
 			if (elt)
 			{
                this.clickedObject = elt;
                if(this._handleMode === null)
                {
                    var worldPt = hitRec.calculateStageWorldPoint();
                    MathUtils.makeDimension4( worldPt );
                    var mat = viewUtils.getObjToStageWorldMatrix( elt, true );
                    if(mat)
                    {
                        var invMat = glmat4.inverse(mat, []);
                        var scrPt = MathUtils.transformHomogeneousPoint( worldPt, invMat );
                        scrPt = MathUtils.applyHomogeneousCoordinate( scrPt );

                        var bounds = viewUtils.getElementViewBounds3D( elt );
                        var x0 = bounds[0][0],  x1 = bounds[3][0],
                            y0 = bounds[0][1],  y1 = bounds[1][1];
                        var dx = x1 - x0,   dy = y1 - y0;
                        var u = 0, v = 0;
                        if (MathUtils.fpSign(dx) != 0)
                            u = (scrPt[0] - x0) / dx;
                        if (MathUtils.fpSign(dy) != 0)
                            v = (scrPt[1] - y0) / dy;

                        paramPt[0] = u;
                        paramPt[1] = v;
                        paramPt[2] = scrPt[2];
                    }
                }
                else
                {
                    // 0  7  6
                    // 1     5
                    // 2  3  4
                    switch(this._handleMode)
                    {
                        case 0:
                            paramPt = [0,0,0];
                            break;
                        case 1:
                            paramPt = [0,0.5,0];
                            break;
                        case 2:
                            paramPt = [0,1,0];
                            break;
                        case 3:
                            paramPt = [0.5,1,0];
                            break;
                        case 4:
                            paramPt = [1,1,0];
                            break;
                        case 5:
                            paramPt = [1,0.5,0];
                            break;
                        case 6:
                            paramPt = [1,0,0];
                            break;
                        case 7:
                            paramPt = [0.5,0,0];
                            break;
                    }
                }
 			}

 			return paramPt;
 		}
 	},

    /**
     * This function is for specifying custom feedback routine
     * upon mouse over.
     * For example, the drawing tools will add a glow when mousing
     * over existing canvas elements to signal to the user that
     * the drawing operation will act on the targeted canvas.
     */
    _showFeedbackOnMouseMove : {
        value: function (event) {
            if(this._target && this._handles)
            {
                var len = this._handles.length;
                var i = 0,
                    toolHandle,
                    c,
                    point = webkitConvertPointFromPageToNode(this.application.ninja.stage.canvas,
                                                            new WebKitPoint(event.pageX, event.pageY));
                for (i=0; i<len; i++)
                {
                    toolHandle = this._handles[i];
                    c = toolHandle.collidesWithPoint(point.x, point.y);
                    if(c)
                    {
                        this.application.ninja.stage.drawingCanvas.style.cursor = toolHandle._cursor;
                        this._handleMode = i;
                        return;
                    }
                }
            }

            this._handleMode = null;
   //            this.application.ninja.stage.drawingCanvas.style.cursor = this._cursor;
            this.application.ninja.stage.drawingCanvas.style.cursor = "auto";
        }
    },

    // TODO - This tool-specific customization should be somewhere else
    _initializeToolHandles: {
        value: function() {
            this.application.ninja.stage.stageDeps.snapManager.enableSnapAlign( false );
            this.application.ninja.stage.stageDeps.snapManager.enableElementSnap( false );
            this.application.ninja.stage.stageDeps.snapManager.enableGridSnap( false );
        }
    },

    // Should be an array of handles for each tool.
    // The array should contain ToolHandle objects that define
    // dimensions, cursor, functionality
    // For example, the Selection Tool holds the 8 resize handles in this order because this
    // is the order we retrieve a rectangle's points using viewUtils:
    // 0  7  6
    // 1     5
    // 2  3  4
    // Draw handles.  For now, we are setting up the selection/transform tool's handles in this base class
    // But it should probably be moved to the selection tool
    DrawHandles: {
        value: function (delta) {
            this.application.ninja.stage.clearDrawingCanvas();

            var item = this._target;
            if(!item || !this._showTransformHandles)
            {
                return;
            }

            if(!this._handles)
            {
                this._handles = [];

                // NorthWest
                var nw = toolHandleModule.ToolHandle.create();
                nw.init("NW-resize");
                this._handles.push(nw);

                // West
                var w = toolHandleModule.ToolHandle.create();
                w.init("W-resize");
                this._handles.push(w);

                // SouthWest
                var sw = toolHandleModule.ToolHandle.create();
                sw.init("SW-resize");
                this._handles.push(sw);

                // South
                var s = toolHandleModule.ToolHandle.create();
                s.init("S-resize");
                this._handles.push(s);

                // SouthEast
                var se = toolHandleModule.ToolHandle.create();
                se.init("SE-resize");
                this._handles.push(se);

                // East
                var e = toolHandleModule.ToolHandle.create();
                e.init("E-resize");
                this._handles.push(e);

                // NorthEast
                var ne = toolHandleModule.ToolHandle.create();
                ne.init("NE-resize");
                this._handles.push(ne);

                // North
                var n = toolHandleModule.ToolHandle.create();
                n.init("N-resize");
                this._handles.push(n);

            }


            viewUtils.setViewportObj( item );
            var bounds3D = viewUtils.getElementViewBounds3D( item );

            var zoomFactor = 1;
            var viewPort = this.application.ninja.stage._viewport;
            if (viewPort.style && viewPort.style.zoom)
            {
                zoomFactor = Number(viewPort.style.zoom);
            }
            var tmpMat = viewUtils.getLocalToGlobalMatrix( item );
            for (var j=0;  j<4;  j++)
            {
                var localPt = bounds3D[j];
                var tmpPt = viewUtils.localToGlobal2(localPt, tmpMat);

                if(zoomFactor !== 1)
                {
                    tmpPt = vecUtils.vecScale(3, tmpPt, zoomFactor);

                    tmpPt[0] += this.application.ninja.stage._scrollLeft*(zoomFactor - 1);
                    tmpPt[1] += this.application.ninja.stage._scrollTop*(zoomFactor - 1);
                }
                bounds3D[j] = tmpPt;
            }

            // Draw tool handles
            var context = this.application.ninja.stage.drawingContext;
            context.beginPath();

            // NW
            var x = bounds3D[0][0];
            var y = bounds3D[0][1];
            context.moveTo(x, y);
            this._handles[0].draw(x, y);

            var left = x;
            var top = y;

            if(delta)
            {
                context.font = "10px sans-serif";
                context.textAlign = "right";

                context.fillText("( " + (left - this.application.ninja.stage.userContentLeft) + " , " +
                                       (top - this.application.ninja.stage.userContentTop) + " )", x-10, y-4);
            }

            // W
            var pt = MathUtils.interpolateLine3D(bounds3D[0], bounds3D[1], 0.5);
            x = pt[0];
            y = pt[1];
            context.moveTo( x, y );
            this._handles[1].draw(x, y);

            // SW
            x = bounds3D[1][0];
            y = bounds3D[1][1];
            context.moveTo( x, y );
            this._handles[2].draw(x, y);

            // S
            pt = MathUtils.interpolateLine3D(bounds3D[1], bounds3D[2], 0.5);
            x = pt[0];
            y = pt[1];
            context.moveTo( x, y );
            this._handles[3].draw(x, y);

            // SE
            x = bounds3D[2][0];
            y = bounds3D[2][1];
            context.moveTo( x, y );
            this._handles[4].draw(x, y);

            if(delta)
            {
                context.fillText("H: " + (y - top), x+38, y - 4);
                context.fillText("W: " + (x - left), x-5, y + 12);
            }

            // E
            pt = MathUtils.interpolateLine3D(bounds3D[2], bounds3D[3], 0.5);
            x = pt[0];
            y = pt[1];
            context.moveTo( x, y );
            this._handles[5].draw(x, y);

            // NW
            x = bounds3D[3][0];
            y = bounds3D[3][1];
            context.moveTo( x, y );
            this._handles[6].draw(x, y);

            // N
            pt = MathUtils.interpolateLine3D(bounds3D[0], bounds3D[3], 0.5);
            x = pt[0];
            y = pt[1];
            context.moveTo( x, y );
            this._handles[7].draw(x, y);

            context.closePath();
        }
    },

    // TODO : Use the new element mediator to get element offsets
    _simpleCollisionDetection: {
        value: function(ele, box){
            var left1, left2, right1, right2, top1, top2, bottom1, bottom2;

            left1 = ele.offsetLeft;
            left2 = box[0];
            right1 = ele.offsetLeft + ele.offsetWidth;
            right2 = box[2];
            top1 = ele.offsetTop;
            top2 = box[1];
            bottom1 = ele.offsetTop + ele.offsetHeight;
            bottom2 = box[3];

            if (bottom1 < top2) return false;
            if (top1 > bottom2) return false;
            if (right1 < left2) return false;
            if (left1 > right2) return false;

            return true;
        }
    }

});