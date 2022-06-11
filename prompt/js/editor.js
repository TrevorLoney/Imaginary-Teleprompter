/*
    Imaginary Teleprompter
    Copyright (C) 2015 Imaginary Sense Inc. and contributors

    This file is part of Imaginary Teleprompter.

    Imaginary Teleprompter is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Imaginary Teleprompter is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Imaginary Teleprompter.  If not, see <https://www.gnu.org/licenses/>.
*/

"use strict";
var debug = false;

(function() {
    // Use JavaScript Strict Mode.

    // Global objects
    var promptIt, updateIt, prompterWindow, frame, currentScript, canvas, canvasContext, slider, promptWidth,
        syncMethods = {"instance":0, "canvas":1, "follow":2};

    // Global variables
    var syncMethod = syncMethods.instance,
        forceSecondaryDisplay = false,
        domain, tic, instance = [false, false],
        htmldata, editorFocused = false;

    if ( syncMethod === syncMethods.canvas ) {
        forceSecondaryDisplay = true;
    }

    //SideBar
    var sidebar = new SIDEBAR();

    // Enums
    var command = Object.freeze({
        "incVelocity": 1,
        "decVelocity": 2,
        "iSync": 3,
        "sync": 4,
        "togglePlay": 5,
        "internalPlay": 6,
        "internalPause": 7,
        "play": 8,
        "pause": 9,
        "stopAll": 10,
        "incFont": 11,
        "decFont": 12,
        "anchor": 13,
        "close": 14,
        "restoreEditor": 15,
        "resetTimer":16,
        "nextAnchor":17,
        "previousAnchor":18,
        "fastForward":19,
        "rewind":20
    });

    function init() {
        // Set globals
        tic = false;

        // Set DOM javascript controls
        promptIt = document.getElementById("promptIt");
        updateIt = document.getElementById("updateIt");
        promptIt.onclick = submitTeleprompter;
        updateIt.onclick = updateTeleprompter;
        document.getElementById("prompterStyle").setAttribute("onchange", "setStyleEvent(value);");

        frame = document.getElementById("teleprompterframe");
        canvas = document.getElementById("telepromptercanvas");
        canvasContext = canvas.getContext('2d');
        // Set default style and option style
        //setStyle(document.getElementById("prompterStyle").value);
        // Set initial configuration to prompter style
        styleInit(document.getElementById("prompterStyle"));
        slider = [
            new Slider("#speed", {}),
            new Slider("#acceleration", {}),
            new Slider("#fontSize", {}),
            new Slider("#promptWidth", {})
        ];
        // Data binding for advanced options
        slider[0].on("change", function(input) {
            document.getElementById("speedValue").textContent = parseFloat(Math.round(input.newValue * 10) / 10).toFixed(1);
        });
        slider[1].on("change", function(input) {
            document.getElementById("accelerationValue").textContent = parseFloat(Math.round(input.newValue * 100) / 100).toFixed(2);
        });
        slider[2].on("change", function(input) {
            document.getElementById("fontSizeValue").textContent = input.newValue;
            updateFont(input.newValue);
        });
        slider[3].on("change", function(input) {
            document.getElementById("promptWidthValue").textContent = input.newValue;
            updateWidth(input.newValue);
        });
        // Set credits button
        document.getElementById("credits-link").onclick = credits;
        // Set domain to current domain.
        setDomain();

        // Initialize file management features.
        initScripts();
        //initImages();
        loadLastUseSettings();
    } // end init()

    function closeWindow() {
        var window = remote.getCurrentWindow();
        window.close();
    }

    // Resize canvas size
    function resizeCanvas(size) {
        if ( !(canvas.width===size[0] && canvas.height===size[1]) ) {
            canvas.width = size[0];
            canvas.height = size[1];
        }
    }

    function isADevVersion(version) {
        if(version.includes("rc") || version.includes("alpha") || version.includes("beta"))
            return true;
        return false;
    }

    //Apply migration by versions
    function applyMigration(version) {
        switch (version) {
            // "default" at top for unnacaunted developer versions. I didn't thought this was possible! xD
            default:
            // 2.2 or bellow
            case null:
            case "0":
            case "2.2.0":
                dataManager.getItem("IFTeleprompterSideBar",function(dataToMigrate) {
                    if (dataToMigrate) {
                        // Convert Data
                        dataToMigrate = JSON.parse(dataToMigrate);
                        if (dataToMigrate.length > 0) {
                            // Fix to not do more dirty work
                            dataToMigrate[0]["id"] = sidebar.createIDTag(dataToMigrate[0].name, true);
                            sidebar.getSaveMode().setItem(sidebar.getDataKey(), JSON.stringify(dataToMigrate));
                        }
                        // Continue with rest of the data
                        for (var i = 1; i < dataToMigrate.length; i++)
                            if (dataToMigrate[i].hasOwnProperty("name")) {
                                dataToMigrate[i]["id"] = sidebar.createIDTag(dataToMigrate[i].name);
                                sidebar.getSaveMode().setItem(sidebar.getDataKey(), JSON.stringify(dataToMigrate));
                            }
                    }
                }, 0, 0);
            case "2.3.0": // Nothing to do here, issues solved elsewhere.
            // Next itteration
            case "2.4.0":
            break;
        }
    }

    // Initialize postMessage event listener.
    addEventListener("message", listener, false);

    // Instance Editor
    if (typeof tinymce !== "undefined") {
        tinymce.init({
            selector: "div#prompt",
            inline: true, // The key to make apps without security loopholes.
            auto_focus: "prompt", // Focus to show controls..
            fixed_toolbar_container: "#toolbar",
            statusbar: true,
            elementpath: false, // Remove the path bar at the bottom.
            resize: true, // True means will be vertically resizable.
            theme: "modern", //dev: We should make a custom theme.
            skin: "imaginary",
            editor_css: "css/tinymce.css",
            plugins: "advlist anchor save charmap code colorpicker contextmenu directionality emoticons fullscreen hr image media lists nonbreaking paste print searchreplace spellchecker table textcolor wordcount imagetools insertdatetime",
            toolbar: ['anchor | save | undo redo | styleselect | bold italic underline strikethrough | superscript subscript | forecolor backcolor | bullist numlist | alignleft aligncenter alignright | charmap image | searchreplace fullscreen'],
            contextmenu: "copy cut paste pastetext | anchor | image charmap",
            menu: {
                file: {
                    title: 'File',
                    items: 'newdocument print'
                },
                edit: {
                    title: 'Edit',
                    items: 'undo redo | cut copy paste pastetext | selectall'
                },
                insert: {
                    title: 'Insert',
                    items: 'anchor insertdatetime | image media emoticons | hr charmap'
                },
                format: {
                    title: 'Format',
                    items: 'bold italic underline strikethrough | superscript subscript | formats | removeformat | ltr rtl'
                },
                table: {
                    title: 'Table',
                    items: 'inserttable tableprops deletetable | cell row column'
                },
                tools: {
                    title: 'Tools',
                    items: 'searchreplace spellchecker code'
                }
            },
            directionality: "ltr",
            setup: function(editor) {
                // Don't close editor when out of focus.
                editor.on("blur", function() {
                    editorFocused = false;
                    return false;
                });
                editor.on("focus", function() {
                    editorFocused = true;
                });
            },
            style_formats: [{
                title: 'Paragraph',
                block: 'p'
            }, {
                title: 'Heading 1',
                block: 'h1'
            }, {
                title: 'Heading 2',
                block: 'h2'
            }, {
                title: 'Heading 3',
                block: 'h3'
            }, {
                title: 'Heading 4',
                block: 'h4'
            }, ],
            //image_list: [
            //  {title: 'My image 1', value: 'http://www.tinymce.com/my1.gif'},
            //  {title: 'My image 2', value: 'http://www.moxiecode.com/my2.gif'}
            //],
            save_enablewhendirty: false,
            save_onsavecallback: save,
            nonbreaking_force_tab: true
        });
    }

    function save() {
        if (debug) console.log("Save pressed");
    }

    function setDomain() {
        // Get current domain from browser
        domain = document.domain;
        // If not running on a server, return catchall.
        if (domain.indexOf("http://") != 0 || domain.indexOf("https://") != 0 || domain.indexOf("localhost") != 0)
            domain = "*";
    }

    function getDomain() {
        return domain;
    }

    function launchIntoFullscreen(element) {
        var requestFullscreen = element.requestFullscreen || element.mozRequestFullScreen || element.webkitRequestFullscreen || element.msRequestFullscreen;
        if (requestFullscreen!==undefined)
            requestFullscreen.call(element);
    }

    function exitFullscreen() {
        var exitFullscreen = document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exitFullscreen!==undefined)
            exitFullscreen.call(document);
    }

    function toggleFullscreen() {
        var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement,
        elem;
        if (fullscreenElement)
            exitFullscreen();
        else {
            if (promptIt.onclick === submitTeleprompter)
                elem = document.getElementById("editorcontainer");
            else
                elem = document.documentElement;
            launchIntoFullscreen(elem);
        }
    }

    function togglePrompter() {
        if (promptIt.onclick === submitTeleprompter)
            submitTeleprompter();
        else
            restoreEditor();
    }

    function togglePromptIt() {
        if (promptIt.onclick === submitTeleprompter) {
            // Update button
            promptIt.textContent = "Close It...";
            promptIt.onclick = restoreEditor;
            // Hide stuff
            if (instance[0]) {
                document.getElementById("content").style.display = "none";
                document.getElementById("editorcontainer").style.display = "none";
                document.getElementById("footer").style.display = "none";
                // Show prompter instance
                document.getElementById("framecontainer").style.display = "block";
                if (instance[1] && syncMethod===syncMethods.canvas) {
                    canvas.style.display = "block";
                    frame.style.display = "none";
                }
                else {
                    frame.style.display = "block";
                    canvas.style.display = "none";
                }
                launchIntoFullscreen(document.documentElement);
            } else if (instance[1]) {
                updateIt.classList.remove("hidden");
            }
        } else {
            // Update button
            promptIt.innerHTML = "Prompt It!";
            promptIt.onclick = submitTeleprompter;
            // Restore editor
            if (instance[0]) {
                document.getElementById("content").style.display = "";
                document.getElementById("editorcontainer").style.display = "";
                document.getElementById("footer").style.display = "";
                // Hide prompter frame
                document.getElementById("framecontainer").style.display = "none";
                if (instance[1] && syncMethod===syncMethods.canvas)
                    canvas.style.display = "none";
                else
                    frame.style.display = "none";
                exitFullscreen();
            } else if (instance[1]) {
                updateIt.classList.add("hidden");
            }
        }
    }

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            htmldata = xmlhttp.responseText;
            internalCredits();
        }
    }

    function internalCredits() {
        // Set primary instance as active.
        instance[0] = true;
        instance[1] = false;

        // Toggle editor interface
        togglePromptIt();

        // Set data to send.
        var settings = '{ "data": {"secondary":0,"primary":1,"prompterStyle":2,"focusMode":3,"background":"#3CC","color":"#333","overlayBg":"#333","speed":"13","acceleration":"1.2","fontSize":"100","promptWidth":"84","timer":"false","voice":"false"}}',
            session = '{ "html":"' + encodeURIComponent(htmldata) + '" }';

        // Store data locally for prompter to use
        dataManager.setItem("IFTeleprompterSettings", settings, 1);
        dataManager.setItem("IFTeleprompterSession", session);

        // Update frame and focus on it.
        //frame.src = "teleprompter.html";
        frame.src = "monitor.html";
        frame.focus();

    }

    function credits() {
        // Get credits page.
        xmlhttp.open("GET", "credits.html", true);
        xmlhttp.send();
        toggleFullscreen();
    }

    function updatePrompterData( override ) {
        // Get html from editor
        if (typeof CKEDITOR !== "undefined")
            htmldata = CKEDITOR.instances.prompt.getData()
        else if (typeof tinymce !== "undefined")
            htmldata = tinymce.get("prompt").getContent();
        // Define possible values
        var primary, secondary, style, focusArea, speed, acceleration, fontSize, timer, voice;
        // Get form values
        if (override!==undefined && typeof override==='string' || override instanceof String)
            override = JSON.parse(override);
        // Set corresponding values.
        if (override!==undefined && override.primary!==undefined)
            primary = override.primary;
        else
            primary = document.getElementById("primary").value;
        if (override!==undefined && override.secondary!==undefined)
            secondary = override.secondary;
        else
            secondary = document.getElementById("secondary").value;
        if (override!==undefined && override.style!==undefined)
            style = override.style;
        else
            style = document.getElementById("prompterStyle").value;
        if (override!==undefined && override.focusArea!==undefined)
            focusArea = override.focusArea;
        else
            focusArea = document.getElementById("focus").value;
        if (override!==undefined && override.speed!==undefined)
            speed = override.speed;
        else
            speed = slider[0].getValue();
        if (override!==undefined && override.acceleration!==undefined)
            acceleration = override.acceleration;
        else
            acceleration = slider[1].getValue();
        if (override!==undefined && override.fontSize!==undefined)
            fontSize = override.fontSize;
        else
            fontSize = slider[2].getValue();
        if (override!==undefined && override.promptWidth!==undefined)
            promptWidth = override.promptWidth;
        else
            promptWidth = slider[3].getValue();
        if (override!==undefined && override.timer!==undefined)
            timer = override.timer;
        else {
            if ( document.getElementById("timer").children[0].classList.contains("btn-primary") )
                timer = true;
            else
                timer = false;
        }
        if (override!==undefined && override.voice!==undefined)
            voice = override.voice;
        else
            voice = false;
        // Merge all settings into one.
        var settings = '{ "data": {"primary":'+primary+',"secondary":'+secondary+',"prompterStyle":'+style+',"focusMode":'+focusArea+',"speed":'+speed+',"acceleration":'+acceleration+',"fontSize":'+fontSize+',"promptWidth":'+promptWidth+',"timer":'+timer+',"voice":'+voice+'}}',
        session = '{ "html":"' + encodeURIComponent(htmldata) + '" }';

        // Store data locally for prompter to use
        dataManager.setItem("IFTeleprompterSettings", settings, 1);
        // If we use sessionStorage we wont be able to update the contents.
        dataManager.setItem("IFTeleprompterSession", session, 1);
    }

    function restoreEditor(event) {
        if (promptIt.onclick === restoreEditor) {
            if (debug) console.log("Restoring editor.");
            // Request to close prompters:
            // Close frame.
            if (frame.src.indexOf("monitor.html") != -1)
                frame.contentWindow.postMessage({
                    'request': command.close
                }, getDomain());
            // Close window.
            if (prompterWindow)
                prompterWindow.postMessage({
                    'request': command.close
                }, getDomain());
            if (syncMethod === syncMethods.canvas)
                ipcRenderer.send('asynchronous-message', 'closeInstance');
            // Clear contents from frame
            frame.src = "about:blank";
            // Stops the event but continues executing current function.
            if (event && event.preventDefault)
                event.preventDefault();
            togglePromptIt();
        }
        if (event && event.preventDefault)
            event.preventDefault();
        return false;
    }

    // On "Prompt It!" clicked
    function submitTeleprompter(event) {
        if (debug) console.log("Submitting to prompter");

        // Stops the event but continues executing the code.
        if (!(event===undefined||event.preventDefault===undefined))
            event.preventDefault();

        var secondaryDisplay = null;
        
        updatePrompterData();

        // Determine whether to load "Primary".
        instance[0] = (document.getElementById("primary").value > 0) ? true : false; 
        // Determine whether to load "Secondary".
        instance[1] = (document.getElementById("secondary").value > 0) ? true : false; 

        if (instance[0]){
            frame.src = "monitor.html" + (debug ? "&debug=1" : "");
        }
        if (instance[1]){
            prompterWindow = window.open("teleprompter.html" + (debug ? "?debug=1" : ""), 'TelePrompter Output', 'height=' + screen.availHeight + ',width=' + screen.width + ',top=0,left=' + screen.width + ',fullscreen=1,status=0,location=0,menubar=0,toolbar=0');
        }
        
        // If an external prompt is openned, focus on it.        
        if (prompterWindow!=undefined && window.focus)
            // Adviced to launch as separate event on a delay.
            prompterWindow.focus();
        else
            frame.focus();

        if (!(instance[0] || instance[1]))
            window.alert("You must prompt at least to one display.");
        else
            togglePromptIt();
    }

    function openCanvasPrompter() {
        // Opening experimental prompter...
        if (debug) console.log("Opening experimental prompter.");
        ipcRenderer.send('asynchronous-message', 'openInstance');
    }

    function updateTeleprompter(event) {
        // Stops the event but continues executing the code.
        event.preventDefault();
        // Update data.
        updatePrompterData();
        if (debug) console.log("Updating prompter contents");
        // Request update on teleprompter other instance.
        listener({
            data: {
                request: command.updateContents
            }
        });
    }

    function toggleDebug() {
        toggleDebugMode();
    }

    function toc() {
        tic != tic;
    }

    function refresh() {
        location.reload();
    }

    function clearAllRequest() {
        if (confirm("You've pressed F6. Do you wish to perform a factory reset of Teleprompter? You will loose all saved scripts and custom styles.") ) {
            dataManager.clearAll();
            window.removeEventListener("beforeunload", updatePrompterData);
            refresh();
        }
    }

    function listener(event) {
        console.log(event);

        // If the event comes from the same domain...
        if (!event.domain || event.domain === getDomain()) {
            var message = event.data;
            // Special case. Restore editor message received.
            if (message.request === command.restoreEditor)
                restoreEditor();
            else {
                // If this isn't a instant sync command, follow normal procedure.
                if (!(message.request === command.iSync || message.request === command.sync)) {
                    // Tic toc mechanism symmetricaly distributes message request lag.
                    if (tic) {
                        // Redirect message to each prompter instance.
                        if (instance[1])
                            prompterWindow.postMessage(message, getDomain());
                        if (instance[0])
                            frame.contentWindow.postMessage(message, getDomain());
                    } else {
                        // Redirect message to each prompter instance.
                        if (instance[0])
                            frame.contentWindow.postMessage(message, getDomain());
                        if (instance[1])
                            prompterWindow.postMessage(message, getDomain());
                    }
                }
                // If requesting for sync, ensure both instances are open. Otherwise do nothing.
                else if (instance[0] && instance[1]) {
                    // Tic toc mechanism symmetricaly distributes message request lag.
                    if (tic) {
                        // Redirect message to each prompter instance.
                        if (instance[1])
                            prompterWindow.postMessage(message, getDomain());
                        if (instance[0])
                            frame.contentWindow.postMessage(message, getDomain());
                    } else {
                        // Redirect message to each prompter instance.
                        if (instance[0])
                            frame.contentWindow.postMessage(message, getDomain());
                        if (instance[1])
                            prompterWindow.postMessage(message, getDomain());
                    }
                }
                // Update tic-toc bit.
                setTimeout(toc, 10);
            }
        }
    }

    document.onkeydown = function(event) {
        // keyCode is announced to be deprecated but not all browsers support key as of 2016.
        if (event.key === undefined)
            event.key = event.keyCode;
        if (!editorFocused) {
            if (debug) console.log(event.key);
            switch (event.key) {
                // TELEPROMPTER COMMANDS
                case "s":
                case "S":
                case "ArrowDown":
                case 40: // Down
                case 68: // S
                listener({
                    data: {
                        request: command.incVelocity
                    }
                });
                break;
                    // prompterWindow.postMessage( message, getDomain())
                    case "w":
                    case "W":
                    case "ArrowUp":
                case 38: // Up
                case 87: // W
                listener({
                    data: {
                        request: command.decVelocity
                    }
                });
                break;
                case "d":
                case "D":
                case "ArrowRight":
                case 83: // S
                case 39: // Right
                listener({
                    data: {
                        request: command.incFont
                    }
                });
                break;
                case "a":
                case "A":
                case "ArrowLeft":
                case 37: // Left
                case 65: // A
                listener({
                    data: {
                        request: command.decFont
                    }
                });
                break;
                case " ":
                case "Space": // Spacebar
                case 32: // Spacebar
                listener({
                    data: {
                        request: command.togglePlay
                    }
                });
                break;
                case ".":
                case "Period": // Numpad dot
                case 110: // Numpad dot
                case 190: // Dot
                listener({
                    data: {
                        request: command.sync
                    }
                });
                break;
                case 8:
                case "Backspace":
                listener({
                    data: {
                        request: command.resetTimer
                    }
                });                    
                break;
                case 36:
                case "Home":
                listener({
                    data: {
                        request: command.previousAnchor
                    }
                });
                break;
                case 35:
                case "End":
                listener({
                    data: {
                        request: command.nextAnchor
                    }
                });
                break;
                case 34 :
                case "PageDown" :
                listener({
                    data: {
                        request: command.fastForward
                    }
                });
                break;
                case 33 :
                case "PageUp" :
                listener({
                    data: {
                        request: command.rewind
                    }
                });
                break;
                // EDITOR COMMANDS
                case 116:
                case "F5":
                if (debug)
                    refresh();
                else
                    console.log("Debug mode must be active to use 'F5' refresh in Electron. 'F10' enters and leaves debug mode.");
                break;
                case 117:
                case "F6":
                clearAllRequest();
                break;
                case 119:
                case "F8":
                togglePrompter();
                break;
                case 122:
                case "F11":
                event.preventDefault();
                toggleFullscreen();
                break;
                case 120:
                case "F10":
                toggleDebug();
                break;
                case 27: // ESC
                case "Escape":
                restoreEditor();
                closeModal();
                break;
                default:
                var key;
                // If key is not a string
                if (!isFunction(event.key.indexOf))
                    key = String.fromCharCode(event.key);
                else
                    key = event.key;
                //if ( key.indexOf("Key")===0 || key.indexOf("Digit")===0 )
                //      key = key.charAt(key.length-1);
                if (!is_int(key))
                    key = key.toLowerCase();
                if (debug) console.log(key);
                listener({
                    data: {
                        request: command.anchor,
                        data: key
                    }
                });
            }
        }
    };

    function closeModal() {
        if (window.location.hash.slice(1) === "openCustomStyles")
            closePromptStyles();
        else if (window.location.hash.slice(1) === "devWarning") {
            var version = function(thisVersion) {
                console.log(thisVersion);
                if (thisVersion === currentVersion)
                    window.location = "#close";
                else
                    window.close();
            };
            dataManager.getItem("IFTeleprompterVersion",version,1);
        }
        else
            window.location = "#close";
        document.getElementById("prompt").focus();
        var sideBar = document.querySelector("#wrapper");
        if (!sideBar.classList.contains("toggled"))
            sideBar.classList.toggle("toggled");
    }

    // Save last use settings
    window.addEventListener("beforeunload", updatePrompterData);

    function updateFont(value) {
        if (debug) console.log("Updating font.");
        document.getElementById("prompt").style.fontSize = "calc(5vw * "+(value/100)+")";
    }

    function updateWidth(value) {
        if (debug) console.log("Updating width.");
        const prompt = document.getElementById("prompt");
        prompt.style.width = value+"vw";
        prompt.style.left = "calc("+(50-value/2)+"vw - 14px)";
    }

    function loadLastUseSettings() {
        // Get last used settings.
        var settings = function ( lastSettings ) {
            if (lastSettings!==undefined && lastSettings!==null) {
                if (debug) console.log(lastSettings);
                lastSettings = JSON.parse(lastSettings);
                document.getElementById("primary").value = lastSettings.data.primary;
                document.getElementById("secondary").value = lastSettings.data.secondary;
                // document.getElementById("prompterStyle").value = lastSettings.data.prompterStyle;
                document.getElementById("focus").value = lastSettings.data.focusMode;
                // If no last used value, leave default values.
                if (!isNaN(lastSettings.data.speed))
                    slider[0].setValue(lastSettings.data.speed);
                else
                    lastSettings.data.speed = slider[0].getValue();
                if (!isNaN(lastSettings.data.acceleration))
                    slider[1].setValue(lastSettings.data.acceleration);
                else
                    lastSettings.data.acceleration = slider[1].getValue();
                if (!isNaN(lastSettings.data.fontSize))
                    slider[2].setValue(lastSettings.data.fontSize);
                else
                    lastSettings.data.fontSize = slider[2].getValue();
                if (!isNaN(lastSettings.data.promptWidth))
                    slider[3].setValue(lastSettings.data.promptWidth);
                else
                    lastSettings.data.promptWidth = slider[3].getValue();
                document.getElementById("speedValue").textContent = parseFloat(Math.round(lastSettings.data.speed * 10) / 10).toFixed(1);
                document.getElementById("accelerationValue").textContent = parseFloat(Math.round(lastSettings.data.acceleration * 100) / 100).toFixed(2);
                document.getElementById("fontSizeValue").textContent = lastSettings.data.fontSize;
                document.getElementById("promptWidthValue").textContent = lastSettings.data.promptWidth;
                updateFont(lastSettings.data.fontSize);
                updateWidth(lastSettings.data.promptWidth);
                // Set timer value
                var timer = document.getElementById("timer")
                if (lastSettings.data.timer) {
                    timer.children[0].classList.add("btn-primary");
                    timer.children[0].classList.remove("btn-default");
                    timer.children[1].classList.add('btn-default');
                    timer.children[1].classList.remove('btn-primary');
                }
                // Set voice value
                // var voice = document.getElementById("voice")
                // if (lastSettings.data.timer) {
                //     voice.children[0].classList.toggle("btn-primary");
                //     voice.children[0].classList.toggle("btn-default");
                //     voice.children[0].classList.innerHTML("Active");
                // }
            }
        };
        dataManager.getItem("IFTeleprompterSettings", settings, 1);
    }

    function isFunction(possibleFunction) {
        return typeof(possibleFunction) === typeof(Function)
    }

    function is_int(value) {
        if (parseFloat(value) == parseInt(value) && !isNaN(value))
            return true;
        else
            return false;
    }

    /*function insertAtCaret(el,text){
        var element = document.getElementById(el);
        var scrollPos = element.scrollTop;
        var strPos = 0;
        var br = ((element.selectionStart || element.selectionStart == '0') ? "ff" : (document.selection ? "ie" : "false"));
        if(br == "ie"){
            element.focus();
            var range = document.selection.createRange();
            range.moveStart('character',-element.value.length);
            strPos = range.text.length;
        }else if(br == "ff")
            strPos = element.selectionStart;

        var front = (element.value).substring(0,strPos);
        var back = (element.value).substring(strPos,element.value.length);
        element.value=front+text+back;
        strPos = strPos + text.length;

        if(br == "ie"){
            element.focus();
            var range = document.selection.createRange();
            range.moveStart('character',-element.value.length);
            range.moveStart('character',strPos);
            range.moveEnd('character',0);
            range.select();
        }else if(br == "ff"){
            element.selectionStart = strPos;
            element.selectionEnd = strPos;
            element.focus();
        }
        element.scrollTop = scrollPos;
    }*/

    function insertTextAtCursor(node) {
        var sel, range, html;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(node);
            }
        } else if (document.selection && document.selection.createRange) {
            document.selection.createRange().text = text;
        }
    }

    function b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++)
                byteNumbers[i] = slice.charCodeAt(i);

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        var blob = new Blob(byteArrays, {
            type: contentType
        });
        return blob;
    }

    /*function initImages() {
        var imagesNode = document.getElementById("images");
        if (imagesNode) {
            var li = document.createElement("li");
            var div = document.createElement("div");
            var span2 = document.createElement("span");
            span2.id = "addMode";
            span2.classList.add("glyphicon");
            span2.classList.add("glyphicon-plus");
            div.appendChild(span2);

            var p = document.createElement("p");
            p.id = "textBlock";
            p.style.display = "inline";
            p.setAttribute("contentEditable", false);
            p.appendChild(document.createTextNode(" Add Image"))
            div.appendChild(p);

            li.onclick = function(e) {
                e.stopImmediatePropagation();
                this.querySelector("#uploadImage").click();
            };

            li.appendChild(div);

            var _createObjectURL = window.URL.createObjectURL;
            Object.defineProperty(window.URL, 'createObjectURL', {
                set: function(value) {
                    _createObjectURL = value;
                },
                get: function() {
                    return _createObjectURL;
                }
            });
            var _URL = window.URL;
            Object.defineProperty(window, 'URL', {
                set: function(value) {
                    _URL = value;
                },
                get: function() {
                    return _URL;
                }
            });

            var input = document.createElement("input");
            input.id = "uploadImage";
            input.type = "file";
            input.style.display = "none";
            input.onchange = function(e) {

                var file = this.parentNode.querySelector('input[type=file]').files[0];
                var reader = new FileReader();

                reader.onloadend = function() {
                    //console.log("Name: "+file.name+" Re: "+reader.result);
                    var img = document.createElement("img");

                    //navigator.saveOrOpenBlob = navigator.saveOrOpenBlob || navigator.msSaveOrOpenBlob || navigator.mozSaveOrOpenBlob || navigator.webkitSaveOrOpenBlob;
                    //navigator.saveOrOpenBlob(file, 'msSaveBlob_testFile.txt');

                    img.src = reader.result//_createObjectURL(file);
                    document.getElementById('prompt').focus();
                    insertTextAtCursor(img);
                    document.querySelector("#wrapper").classList.toggle("toggled");
                    document.getElementById("uploadImage").value = "";

                    if (debug) console.log(img);
                }

                if (file) {
                    reader.readAsDataURL(file); //reads the data as a URL
                }

            };
            li.appendChild(input);
            imagesNode.appendChild(li);
        }
    }*/

    function addQRConnection(ip) {
        var wrapper = document.querySelector("#wrapper");
        var sidebarWrapper = wrapper.querySelector("#sidebar-wrapper");

        var div = document.createElement("div");
        div.id = "sidebar-connect";
        
        var p = document.createElement("p");
        var text = document.createTextNode('Please use Web Connect on Teleprompter App to use the Remote Control');
        p.appendChild(text);
        div.appendChild(p);
        var image = document.createElement("img");
        image.src = ""
        var defaults = {
            // render method: 'canvas', 'image' or 'div'
            render: 'image',

            // version range somewhere in 1 .. 40
            minVersion: 6,
            maxVersion: 40,

            // error correction level: 'L', 'M', 'Q' or 'H'
            ecLevel: 'H',

            // offset in pixel if drawn onto existing canvas
            left: 0,
            top: 0,

            // size in pixel
            size: 400,

            // code color or image element
            fill: '#6D5599',

            // background color or image element, null for transparent background
            background: null,

            // content
            text: 'http://' + ip + ':3000/',

            // corner radius relative to module width: 0.0 .. 0.5
            radius: 0.5,

            // quiet zone in modules
            quiet: 1,

            // modes
            // 0: normal
            // 1: label strip
            // 2: label box
            // 3: image strip
            // 4: image box
            mode: 4,

            mSize: 0.3,
            mPosX: 0.5,
            mPosY: 0.5,

            label: 'no label',
            fontname: 'sans',
            fontcolor: '#000',

            image: image
        };

        var s = new qrcodeGen(defaults);
        s.style.width = 75+ '%';
        s.style.marginLeft = 12.5 + '%';
        s.style.backgroundColor = '#fff';
        div.appendChild(s);

        sidebarWrapper.insertBefore(div, sidebarWrapper.childNodes[0]);
    }

    // Teleprompter Scripts File Manager
    function initScripts() {
        //initialize SideBar
        var sid = sidebar.on('scripts',{
            "name":"Files",
            "elementName":"Script",
            "newElementName":"Untitled",
            "dataKey":"IFTeleprompterSideBar",
            "preloadData":[{
                "name": "Instructions",
                "data": '<h3>Welcome to Imaginary Teleprompter!</h3><p>Are you ready to tell a story?</p><br><p>"Teleprompter" is the most complete, free software, professional teleprompter for anyone to use. Click on "Prompt It!" whenever you\'re ready and control the speed with the arrow keys.</p><br><h3>Here are some of our features:</h3><ol><li>Control the speed and text-size with the \'Up\' and \'Down\' arrow keys, the \'W\' and \'S\' keys or the mouse wheel. You may press \'Spacebar\' to pause at anytime.</li><li>Move half a screen backwards or forwards by pressing the \'PageUp\' and \'PageDown\' keys.</li><li>Dynamically change the font-size by pressing \'Left\' and \'Right\' or the \'A\' and \'D\' keys.</li><li>Flip modes allow <em>mirroring</em> the prompter in every possible way.</li><li>You can use one or two instances. Mirror one, monitor on the other one.</li><li><a id="5" name="5">Set almost any key as a <em>marker</em> and instantly jump to any part of the script. Try pressing \'5\' now!</a></li><li>Different focus areas allow you to easily use Teleprompter with a webcam, a tablet, or professional teleprompter equipment.</li><li>Time your segments with the built in <em>timer</em>. Press \'Backspace\' to reset the timer.</li><li><a name data-cke-saved-name src="#">You can also set nameless <em>markers</em> and move accross them using the Home and End buttons.</a></li><li>Tweak the <em>Speed</em>, <em>Acceleration Curve</em> and <em>Font Size</em> settings to fit your hosts\' needs.</li><li>Press \'F11\' to enter and leave fullscreen.You may fullscreen the text editor for greater concentration.</li><li>The Rich Text Editor, derived from the highly customizable CKeditor, gives unlimited possibilities on what you can prompt.</li><ul><!-- <li>Add emoticons to indicate feelings and expressions to your hosts.</li>--><li>You may generate and display mathematical equations using the integrated CodeCogs equation editor.<br><table border="1" cellpadding="1" cellspacing="1"><tbody><tr><td>&nbsp;</td><td><img alt="\bg_white \huge \sum_{heta+\Pi }^{80} sin(heta)" src="https://latex.codecogs.com/gif.latex?%5Cdpi%7B300%7D%20%5Cbg_white%20%5Chuge%20%5Csum_%7B%5CTheta&amp;plus;%5CPi%20%7D%5E%7B80%7D%20sin%28%5CTheta%29" /></td><td>&nbsp;</td></tr></tbody></table></li><li>Insert images from the web or copy and paste them into the prompter.<img alt="Picture: Arecibo Sky" src="img/arecibo-sky.jpg"></li> </ul><li>There are various <em>Prompter Styles</em> to choose from. You may also create your own.</li><!-- <li>Download our mobile app, <em>Teleprompter X</em>, to remote control Teleprompter instalations.</li> --><li>Run the "External prompter" on a second screen, add new contents into the editor, then "Update" your prompter in realtime without having to halt your script.</li><li>Teleprompter works across screens with different resolutions and aspect ratios.</li><li>Using calculus and relative measurement units, Teleprompter is built to age gracefully. Speed and contents remain consistent from your smallest screen up to 4k devices and beyond.</li><li>Animations are hardware accelerated for a smooth scroll. A quad-core computer with dedicated graphics and, at least, 2GB RAM is recommended for optimal results.</li><li>Teleprompter doesn\'t stretch a lower quality copy of your prompt for monitoring, instead it renders each instance individually at the highest quality possible. You should lower your resolution to increase performance on lower end machines.</li><li>Text can be pasted from other word processors such as Libre Office Writer&trade; and Microsoft Word&reg;.</li><li>All data is managed locally. We retain no user data.</li><li>Use the standalone installation for greater performance and automatic fullscreen prompting.</li><li>The standalone version comes for Linux, OS X, Microsoft Windows and Free BSD.</li><li>Close prompts and return to the editor by pressing \'ESC\'.</li></ol><hr><h4>How to use anchor shortcuts:</h4><ol><li>Select a keyword or line you want to jump to on your text in the editor.</li><li>Click on the <strong>Flag Icon</strong> on the editor\'s tool bar.</li><li>A box named "Anchor Properties" should have appeared. Type any single key of your choice and click \'Ok\'.<br>Note preassigned keys, such as WASD and Spacebar will be ignored.</li><li>Repeat as many times as you wish.</li><li>When prompting, press on the shortcut key to jump into the desired location.</li></ol><p>###</p>',
                "editable": false
            }],

        });

       function save() {
            if (sid.currentElement != 0) {
                var scriptsData = sid.getElements();
                scriptsData[sid.currentElement]["data"] = document.getElementById("prompt").innerHTML;
                sid.getSaveMode().setItem(sid.getDataKey(), JSON.stringify(scriptsData));
            }
        }

        sid.selectedElement = function(element) {
            var scriptsData = sid.getElements();
            if (scriptsData[sid.currentElement].hasOwnProperty('data'))
                document.getElementById("prompt").innerHTML = scriptsData[sid.currentElement]['data'];
            else
                document.getElementById("prompt").innerHTML = "";
            document.querySelector("#wrapper").classList.toggle("toggled");
        }

        sid.addElementEnded = function(element) {
            if (debug) console.log(element);
            sid.selectedElement(element);
        }

        sid.setEvent('input','prompt',function() {
            save();
        });

        CKEDITOR.on('instanceReady', function(event) {
            var editor = event.editor,
            scriptsData = sid.getElements();
            if (scriptsData[sid.currentElement].hasOwnProperty('data'))
                document.getElementById("prompt").innerHTML = scriptsData[sid.currentElement]['data'];
            else
                document.getElementById("prompt").innerHTML = "";

            editor.on('dialogDefinition', function(event) {
                save();
            });

            editor.on('change', function(event) {
                save();
            });

            editor.on('paste', function(event) {
                // event.data.type
                // save();
            });

            editor.on('key', function(event) {
                if (event.key === undefined)
                    event.key = event.data.keyCode;
                if (debug) console.log(event.key);
                if (sid.instructionsAreLoaded() && -1===[1114129,1114177,1114179,1114121,5570578,1114337,4456466,2228240,91,225,27,112,113,114,115,116,117,118,119,120,121,122,123,45,20,33,34,35,36,37,38,39,40].indexOf(event.key)) {
                    window.location = '#sidebarAddElement';
                    document.getElementById("inputName").focus();
                } else if (event.key===122 || event.key==="F11") {
                    toggleFullscreen();
                } else if (event.key===119 || event.key==="F8") {
                    togglePrompter();
                }
                return true;
            });

            editor.on('focus', function() {
                editorFocused = true;
                if (debug) console.log('Editor focused.');
                // save();
            });

            editor.on('blur', function() {
                editorFocused = false;
                if (debug) console.log('Editor out of focus.');
                save();
            });
        });

        var menuToggle = document.querySelector("#menu-toggle");
        menuToggle.onclick = function(event) {
            event.preventDefault();
            document.querySelector("#wrapper").classList.toggle("toggled");
            save();
        };
    }

    // Initialize objects after DOM is loaded
    if (document.readyState === "interactive" || document.readyState === "complete")
        // Call init if the DOM (interactive) or document (complete) is ready.
        init();              
    else
        // Set init as a listener for the DOMContentLoaded event.
        document.addEventListener("DOMContentLoaded", init);

    // Toogle control
    $('.btn-toggle').click(function() {
        $(this).find('.btn').toggleClass('active');  
        
        if ($(this).find('.btn-primary').length>0) {
            $(this).find('.btn').toggleClass('btn-primary');
        }
        if ($(this).find('.btn-danger').length>0) {
            $(this).find('.btn').toggleClass('btn-danger');
        }
        if ($(this).find('.btn-success').length>0) {
            $(this).find('.btn').toggleClass('btn-success');
        }
        if ($(this).find('.btn-info').length>0) {
            $(this).find('.btn').toggleClass('btn-info');
        }
        
        $(this).find('.btn').toggleClass('btn-default');
           
    });
    $('form').submit(function(){
        return false;
    });
}());

// Global functions, to be accessed from Electron's main process.
function enterDebug() {
    debug = true;
    console.log("Entering debug mode.");    function updateFont() {
        prompt.style.fontSize = fontSize+'em' ;
        overlayFocus.style.fontSize = fontSize+'em' ;
        onResize();
    }
}
function exitDebug() {
    debug = false;
    console.log("Leaving debug mode.");
}
function toggleDebugMode() {
    if (debug) 
        exitDebug();
    else
        enterDebug();
}
// On change Prompter Style
function setStyleEvent(prompterStyle) {
    if (setStyle) {
        if (debug) console.log(prompterStyle);
        setStyle(prompterStyle);
    }
}
