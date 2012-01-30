/* <copyright>
This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
(c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
</copyright> */


var Montage = require("montage/core/core").Montage,
    pickerNavigatorReel = require("js/components/ui/FilePicker/pickerNavigator.reel").PickerNavigator,
    filePickerModelModule = require("js/components/ui/FilePicker/file-picker-model"),
    fileSystem = require("js/io/system/filesystem").FileSystem,
    Popup = require("montage/ui/popup/popup.reel").Popup;

//singleton with functions to create a new file picker instance and utilities to format or filter the model data
var FilePickerController = exports.FilePickerController = Montage.create(require("montage/ui/component").Component, {
    /**
     * Register a listener for file open event
     */
    deserializedFromTemplate:{
        writable:false,
        enumerable:true,
        value:function(){
            var that = this;
            this.eventManager.addEventListener("executeFileOpen", function(evt){

                var callback, pickerMode, currentFilter, allFileFilters,inFileMode, allowNewFileCreation, allowMultipleSelections;

                if(!!evt.callback){
                    callback = evt.callback;
                }
                if(!!evt.pickerMode){
                    pickerMode = evt.pickerMode;
                }
                if(!!evt.currentFilter){
                    currentFilter = evt.currentFilter;
                }
                if(!!evt.inFileMode){
                    inFileMode = evt.inFileMode;
                }
                if(!!evt.allFileFilters){
                    allFileFilters = evt.allFileFilters;
                }
                if(!!evt.allowNewFileCreation){
                    allowNewFileCreation = evt.allowNewFileCreation;
                }
                if(!!evt.allowMultipleSelections){
                    allowMultipleSelections = evt.allowMultipleSelections;
                }

                that.showFilePicker(callback, pickerMode, currentFilter, allFileFilters,inFileMode, allowNewFileCreation, allowMultipleSelections);

            }, false);
        }
    },

    /**
     * this will be stored in the local storage and in the cloud may be, for the cloud one.
     */
    _lastOpenedFolderURI:{
        writable:true,
        enumerable:true,
        value:{
            lastFolderUri_local:null,
            lastFolderUri_cloud:null
        }
    },

    /**
     * this will be stored in the local storage and in the cloud may be, for the cloud one.
     */
    _lastSavedFolderURI:{
        writable:true,
        enumerable:true,
        value:{
            lastSavedFolderUri_local:null,
            lastSavedFolderUri_cloud:null
        }
    },

    /**
     *this function is used to create an instance of a file picker
     *
     * parameters:
     * callback: the call back function which will be used to send the selected URIs back
     * pickerMode: ["read", "write"] : specifies if the file picker is opened to read a file/folder or to save a file
     * currentFilter: if a current filter needs to be applied [ex: .psd]
     * allFileFilters: list of filters that user can use to filter the view
     * inFileMode: true => allow file selection , false => allow directory selection
     * allowNewFileCreation:  flag to specify whether or not it should return URI(s) to item(s) that do not exist. i.e. a user can type a filename to a new file that doesn't yet exist in the file system.
     * allowMultipleSelections: allowMultipleSelections
     *rootDirectories: invoker of this function can mention a subset of the allowed root directories to show in the file picker
     *
     * return: none
     */

    showFilePicker:{
        writable:false,
        enumerable:true,
        value:function(callback, pickerMode, currentFilter, allFileFilters,inFileMode, allowNewFileCreation, allowMultipleSelections){

            var aModel = filePickerModelModule.FilePickerModel.create();

            var topLevelDirectories = null;
            var driveData = fileSystem.shellApiHandler.getDirectoryContents({uri:"", recursive:false, returnType:"all"});
            if(driveData.success){
                topLevelDirectories = (JSON.parse(driveData.content)).children;
            }else{
                var errorCause = "";
                if(driveData.status === null){
                    errorCause = "Service Unavailable"
                }else{
                    errorCause = driveData.status;
                }
                aModel.fatalError = " ** Unable to get files [Error: "+ errorCause +"]";
            }

            aModel.currentFilter = currentFilter;
            aModel.inFileMode = inFileMode;
            aModel.topLevelDirectories = topLevelDirectories;

            if(!!topLevelDirectories && !!topLevelDirectories[0]){
                aModel.currentRoot = topLevelDirectories[0].uri;
            }

            //populate the last opened folder first, if none then populate default root
            var sessionStorage = window.sessionStorage;
            var storedUri = null;

            if(pickerMode === "write"){
                storedUri = sessionStorage.getItem("lastSavedFolderURI");
            }else{
                storedUri = sessionStorage.getItem("lastOpenedFolderURI");
            }

            if(!!storedUri){
                aModel.currentRoot = unescape(storedUri);
            }

            aModel.fileFilters = allFileFilters;
            aModel.callback = callback;
            aModel.pickerMode = pickerMode;

            //dummy data - TODO:remove after testing
            //aModel.currentFilter = "*.html, *.png";
            //aModel.currentFilter = "*.jpg";
            aModel.currentFilter = "*.*";
            aModel.inFileMode = true;
            aModel.fileFilters = [".html, .htm", ".jpg, .jpeg, .png, .gif", ".js, .json", ".css", ".txt, .rtf", ".doc, .docx", ".pdf", ".avi, .mov, .mpeg, .ogg, .webm", "*.*"];
            //-end - dummy data

            //logic: get file content data onDemand from the REST api for the default or last opened root. Cache the data in page [in local cache ? dirty fs? ]. Filter on client side to reduce network calls.
            this.openFilePickerAsModal(callback, aModel);


            //to open this on another modal dialog, make it a popup instead above the modal dialog container layer

        }
    },

    openFilePickerAsModal:{
          writable:false,
        enumerable:true,
        value:function(callback, aModel){
            //render modal dialog
            var pickerNavContent = document.createElement("div");
            pickerNavContent.id = "filePicker";

            pickerNavContent.style.color = "#fff";

            //hack (elements needs to be on DOM to be drawn)
            document.getElementById('modalContainer').appendChild(pickerNavContent);

            var pickerNavChoices = Montage.create(pickerNavigatorReel);
            var initUri = aModel.currentRoot;
            pickerNavChoices.mainContentData = this.prepareContentList(initUri, aModel);
            pickerNavChoices.pickerModel = aModel;
            pickerNavChoices.element = pickerNavContent;

            //hack - remove after rendering and add in modal dialog
            document.getElementById('modalContainer').removeChild(pickerNavContent);

            var popup = Popup.create();
            popup.content = pickerNavChoices;
            popup.modal = true;
            popup.show();

            pickerNavChoices.popup = popup;//handle to be used for hiding the popup
        }
    },
    openFilePickerAsPopup:{
          writable:false,
        enumerable:true,
        value:function(){}
    },

    expandDirectory:{
        writable:false,
        enumerable:true,
        value: function(root, currentFilter, inFileMode){
            //populate children in dom
        }
    },

    refreshDirectoryCache:{
        writable:false,
        enumerable:true,
        value:function(directoryUri){
            if(directoryContentCache[directoryUri] !== null){
                directoryContentCache[directoryUri] = null; //invalidate the cached content
                //fetch fresh content
            }
        }
    },

    /**
     * queries the cache to build contents array. If not found queries the file system
     *
     * parameters:
     * folderUri
     * aModel: model instance per picker instance, containing
     */

    prepareContentList:{
        writable: false,
        enumerable:true,
        value:function(folderUri, aModel, fromCache, checkStaleness){
            var contentList = [],
                childrenArray = [];

            var folderContent = null;
            // query filesystem and populate cache
            if(((typeof fromCache !== "undefined") && (fromCache === false))
                || !this._directoryContentCache[folderUri]
                || !this._directoryContentCache[folderUri].children){
                //get data using IO api
                try{
                    var iodata = fileSystem.shellApiHandler.getDirectoryContents({uri:folderUri, recursive:false, returnType:"all"});
                    //console.log("IO:getDirectoryContents:Response:\n"+"uri="+folderUri+"\n status="+iodata.status+"\n content= "+iodata.content);
                    if(iodata.success && (iodata.status === 200) && (iodata.content !== null)){
                        folderContent = JSON.parse(iodata.content);
                    }
                }catch(e){
                    console.error("Error to IO uri: "+folderUri+"\n"+e.message);
                }

                if(!!folderContent){
                    //contentList = folderContent.children;//need to apply filters and mode
                    this.cacheContentForRandomAccess(folderUri, folderContent);
                }
            }
            //now from cache - apply filters and mode
            if((!!this._directoryContentCache[folderUri])
                    && (this._directoryContentCache[folderUri].type === "directory")
                    && (typeof this._directoryContentCache[folderUri].children !== "undefined")
                    && (this._directoryContentCache[folderUri].children !== null)){

                //console.log("$$$ this._directoryContentCache");
                //console.log(this._directoryContentCache);

                //check for directory staleness.... if stale query filesystem
                if((typeof checkStaleness === "undefined") || (checkStaleness === true)){
                    this.checkIfStale(folderUri);
                }

                childrenArray = this._directoryContentCache[folderUri].children;

                //prepare content array for folder uri
                childrenArray.forEach(function(item){
                    if(this._directoryContentCache[item]){
                        //apply mode and filtering here
                        if(aModel.inFileMode){// if in file selection mode, do filtering
                            if((this._directoryContentCache[item].type === "directory") || !aModel.currentFilter){//no filetering
                                contentList.push(this._directoryContentCache[item]);
                            }
                            else if(aModel.currentFilter){
                                if(this.applyFilter(this._directoryContentCache[item].name, aModel.currentFilter)){
                                    contentList.push(this._directoryContentCache[item]);
                                }
                            }
                        }else{// if in folder selection mode
                            if(this._directoryContentCache[item].type === "directory"){
                                contentList.push(this._directoryContentCache[item]);
                            }
                        }
                    }
                }, this);
            }
            else if((typeof this._directoryContentCache[folderUri] !== 'undefined') && (this._directoryContentCache[folderUri].type === "file")){//if the uri is for a file

                //check for directory staleness.... if stale query filesystem
                if((typeof checkStaleness === "undefined") || (checkStaleness === true)){
                    this.checkIfStale(folderUri);
                }

                contentList.push(this._directoryContentCache[folderUri]);
            }
            //end - from cache

            return contentList;
        }
    },

    /**
     * populates/updates cache for a uri
     */
    cacheContentForRandomAccess:{
            writable:false,
            enumerable:true,
            value: function(directoryUri, directoryContents){

                var that = this;
                //assumption: directoryContents will have only its direct files and subfolders
                //uri is the unique identifier


                //check if the directoryUri exists in cache
                //if not add uri content object, prepare children's uri array,then add/update objects for children
                if(!this._directoryContentCache[directoryUri]){//uri not in cache... so add it
                    //add uri content object
                    this._directoryContentCache[directoryUri] = {"type":directoryContents.type,"name":directoryContents.name,"uri":directoryUri};
                    if(!!directoryContents.size){
                        this._directoryContentCache[directoryUri].size = directoryContents.size;
                    }
                    if(!!directoryContents.creationDate){
                        this._directoryContentCache[directoryUri].creationDate = directoryContents.creationDate;
                    }
                    if(!!directoryContents.modifiedDate){
                        this._directoryContentCache[directoryUri].modifiedDate = directoryContents.modifiedDate;
                    }

                    //store the current queried time for refreshing cache logic
                    this._directoryContentCache[directoryUri].queriedTimeStamp = (new Date()).getTime();

                    if(!!directoryContents.children && directoryContents.children.length > 0){
                        this._directoryContentCache[directoryUri].children = [];

                        //add the uri to this._directoryContentCache[directoryUri].children, and add the child's description objects
                        directoryContents.children.forEach(function(obj){
                            //add uri to parent's children list
                            that._directoryContentCache[directoryUri].children.push(obj.uri);
                            //add the child object
                            that._directoryContentCache[obj.uri] = obj;

                            //store the current queried time for refreshing cache logic
                            that._directoryContentCache[obj.uri].queriedTimeStamp = (new Date()).getTime();

                        } ,this);
                    }
                }else{//uri in cache... so update it AND its children
                    this._directoryContentCache[directoryUri].type = directoryContents.type;
                    this._directoryContentCache[directoryUri].name = directoryContents.name;
                    if(!!directoryContents.size){
                        this._directoryContentCache[directoryUri].size = directoryContents.size;
                    }
                    if(!!directoryContents.creationDate){
                        this._directoryContentCache[directoryUri].creationDate = directoryContents.creationDate;
                    }
                    if(!!directoryContents.modifiedDate){
                        this._directoryContentCache[directoryUri].modifiedDate = directoryContents.modifiedDate;
                    }

                    //store the current queried time for refreshing cache logic
                    this._directoryContentCache[directoryUri].queriedTimeStamp = (new Date()).getTime();

                    if(!!directoryContents.children && directoryContents.children.length > 0){

                        // logic to clear off objects from cache if they no longer exist in the filesystem
                        //better logic - use isUpdatedFlag for a folder .. then compare modified date

                        //hack for now - clear up the old children and add new ones
                        var tempArr = this._directoryContentCache[directoryUri].children;
                        if( !!tempArr && Array.isArray(tempArr) && tempArr.length>0){
                           tempArr.forEach(function(uriString){
                               if(!!that._directoryContentCache[uriString]){
                                    delete that._directoryContentCache[uriString];
                               }
                           });
                        }

                        this._directoryContentCache[directoryUri].children = [];

                        //add the uri to this._directoryContentCache[directoryUri].children, and add the child's description objects
                        directoryContents.children.forEach(function(obj){
                            //add uri to parent's children list
                            that._directoryContentCache[directoryUri].children.push(obj.uri);
                            //add the child object
                            that._directoryContentCache[obj.uri] = obj;
                            //store the current queried time for refreshing cache logic
                            that._directoryContentCache[obj.uri].queriedTimeStamp = (new Date()).getTime();
                        } ,this);
                    }else{
                        this._directoryContentCache[directoryUri].children = [];
                    }
                }

                //console.log("$$$ "+directoryUri+" modifiedDate = "+this._directoryContentCache[directoryUri].modifiedDate);
                //console.log("$$$ "+directoryUri+" queriedTimeStamp = "+this._directoryContentCache[directoryUri].queriedTimeStamp);
            }
    },

    applyFilter:{
        writable: false,
        enumerable:true,
        value:function(fileName , filters){

            if(filters.indexOf("*.*") !== -1){return true;}

            //console.log(""+fileName);
            var filtersArr = filters.split(",");
            var passed = false;
            for(var i=0; i< filtersArr.length; i++){
                filtersArr[i] = filtersArr[i].trim();
                //console.log(filtersArr[i]);
                var fileType = filtersArr[i].substring(filtersArr[i].indexOf(".") );
                //console.log(""+fileType);

                //ignore uppercase
                fileName = fileName.toLowerCase();
                fileType = fileType.toLowerCase();

                if(fileName.indexOf(fileType, fileName.length - fileType.length) !== -1){//ends with file type
                    passed = true;
                    break;
                }
            }
            return passed;
        }
    },

    /**
     * Stale Time (ms) for each resource
     * Logic: the last queried time for a resource is compared to stale time. If stale, then file system is queried
     */
    cacheStaleTime:{
        writable: false,
        enumerable: false,
        value: 5000
    },

    checkIfStale: {
        writable: false,
        enumerable: true,
        value: function(folderUri){
            var wasStale = false;
            var folderContent = null;
            //check for directory staleness.... if stale query filesystem
            if((new Date()).getTime() > (this._directoryContentCache[folderUri].queriedTimeStamp + this.cacheStaleTime)){
                try{
                    var ifModifiedResponse = fileSystem.shellApiHandler.isDirectoryModified({uri:folderUri, recursive:false, returnType:"all"}, this._directoryContentCache[folderUri].queriedTimeStamp);
                    //console.log("ifModifiedResponse");
                    //console.log(ifModifiedResponse);
                }catch(e){
                    console.error("Error to IO uri with isDirectoryModified: "+folderUri+"\n"+e.message);
                }
                if(ifModifiedResponse && ifModifiedResponse.status === 304){
                    //do nothing since the uri has not changed
                }else if(ifModifiedResponse && (ifModifiedResponse.status === 200)){
                    wasStale = true;
                    //uri has changed. so update cache
                    try{
                        var iodata = fileSystem.shellApiHandler.getDirectoryContents({uri:folderUri, recursive:false, returnType:"all"});
                        //console.log("IO:getDirectoryContents:Response:\n"+"uri="+folderUri+"\n status="+iodata.status+"\n content= "+iodata.content);
                        if(iodata.success && (iodata.status === 200) && (iodata.content !== null)){
                            folderContent = JSON.parse(iodata.content);
                        }
                    }catch(e){
                        console.error("Error to IO uri: "+folderUri+"\n"+e.message);
                    }

                    if(!!folderContent){
                        this.cacheContentForRandomAccess(folderUri, folderContent);
                    }
                }
            }

            return wasStale;
        }
    },

    /**
     * This will store the directory content per session
     * check session storage for this
     */
    _directoryContentCache:{
        writable:true,
        enumerable:false,
        value:{}
    },

    clearCache:{
        writable:false,
        enumerable: true,
        value: function(){
            this._directoryContentCache = {};
        }
    }
});