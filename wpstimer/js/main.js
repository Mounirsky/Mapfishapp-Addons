Ext.namespace("GEOR.Addons");

GEOR.Addons.wpstimer = function(map, options) {
    this.map = map;
    this.options = options;
    //this.toolbar = null;
};

GEOR.Addons.wpstimer.prototype = {
    win: null,
    item: null,
    timeField: null,
    wps_Config: null,
    WPS_URL: null,
    WPS_identifier: null,
    show_help: null,
    win_help: null,

    /**
     * Property: wpsInitialized
     * occurs when the wps describeProcess returns a response
     * boolean.
     */
    wpsInitialized: false,

    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        var lang = OpenLayers.Lang.getCode();
        // this.toolbar  = (this.options.toolbarplacement === "bottom") ? Ext.getCmp("mappanel").bottomToolbar : (this.options.toolbarplacement === "top") ? Ext.getCmp("mappanel").topToolbar : null; 
        WPS_URL = this.options.WPS_URL;
        WPS_identifier = this.options.WPS_identifier;

        if (this.wpsInitialized === false) {
            this.describeProcess(WPS_URL, WPS_identifier);
        };

        mask_loader = new Ext.LoadMask(Ext.getBody(), {
                msg: OpenLayers.i18n("Processing ..."),
            });
        
        this.item = new Ext.menu.Item({
            text: record.get("title")[lang],
            qtip: record.get("description")[lang],
            iconCls: 'process_time_icon',
            handler: this.showWindow,
            scope: this
        });
        return this.item;
    },

    createWindow: function() {

        var temps = wps_Config.delay.value;

        this.timeField = new Ext.form.NumberField({
            // fieldLabel: OpenLayers.i18n("Processing time (s)"),
            fieldLabel: wps_Config.delay.title,
            name: "time",
            width: 40,
            maxValue: 298,
            minValue: 1,
            allowBlank: false,
            labelSeparator: OpenLayers.i18n("labelSeparator"),
            // value: this.options.default_time,
            value: temps,
            allowDecimals: true,
            decimalPrecision: 2
        });

        return new Ext.Window({
            title: OpenLayers.i18n("addon_wpstimer_title"),
            closable: true,
            closeAction: 'hide',
            region: "center", //"north","south","east","west"
            width: 270,
            height: 110,
            // autoWidth: true,
            // autoHeight: true,
            iconCls: 'windo_icon',
            plain: true,
            layout: 'border',
            buttonAlign: 'left',
            region: 'center',
            layout: 'fit',
            items: [{
                xtype: 'form',
                autoWidth: true,
                labelWidth: 180,
                bodyStyle: "padding:10px;",
                items: [
                    this.timeField
                ],
            }],

            fbar: ['->', {
                text: OpenLayers.i18n("Close"),
                handler: function() {
                    this.win.hide();
                },
                scope: this
            }, {
                text: OpenLayers.i18n("Help"),
                handler: this.show_help_Window,
                scope: this
            }, {
                text: OpenLayers.i18n("Execute"),
                handler: this.ExecuteWpsTimer,
                scope: this
            }],           
        });
    },

    creat_help_window: function(){
        var help_win= new Ext.Window({
            title: OpenLayers.i18n("help_window_title"),
            closable: true,
            closeAction: 'hide',
            region: "west", //"north","south","east","west"
            width: 600,
            height: 600,
            // autoWidth: true,
            // autoHeight: true,
            iconCls: 'help_icon',
            plain: true,
            layout: 'border',
            buttonAlign: 'left',
            region: 'center',
            layout: 'fit',
            items: [{
                xtype: 'window',
                height: 200,
                width: 200,
                autoShow: true,
                constrainHeader: true,
                html: 'Content'
            }],
            fbar: ['->', {
                text: OpenLayers.i18n("Close"),
                handler: function() {
                    this.win_help.hide();
                },
                scope: this
                }],           
        });
        return help_win;
    },

    show_help_Window: function() {
    if (!this.win_help) {
        this.win_help = this.creat_help_window();
        }
    this.win_help.show();
    },
    /**
     * Method: describeProcess
     *
     * Parameters:
     * String url, String identifier du process WPS.
     */
    describeProcess: function (url, identifier) {
        var onDescribeP = this.onDescribeProcess;
        // console.log (onDescribeP)
        // console.log ("onDescribeP ="+onDescribeP);
        
        OpenLayers.Request.GET({
            url: url,
            params: {
                "SERVICE": "WPS",
                "VERSION": "1.0.0",
                "REQUEST": "DescribeProcess",
                "IDENTIFIER": identifier
            },
            success: function(response) {
                var wpsProcess = new OpenLayers.Format.WPSDescribeProcess().read(response.responseText).processDescriptions[identifier];
                // console.log ("wpsProcess = "+wpsProcess)
                // console.log("wpsProcess.dataInputs = "+wpsProcess.dataInputs)
                onDescribeP(wpsProcess);
            },
            failure: function() {
                GEOR.util.errorDialog({
                    msg: OpenLayers.i18n('Server unavailable')
                });
            }
        });
    },

    /**
     * Method: onDescribeProcess
     * Callback executed when the describeProcess response
     * is received.
     *
     * Parameters:
     * response - XML response
     */
    onDescribeProcess: function (process) {

        findDataInputsByIdentifier = function (datainputs, identifier) {
            var datainput, i;

            for (i = 0; i < datainputs.length; i++) {
                if (datainputs[i].identifier === identifier) {
                    datainput = datainputs[i];
                    break;
                }
            }
            return datainput;
        };
        // console.log ("findDataInputsByIdentifier ="+findDataInputsByIdentifier);

        var delay = findDataInputsByIdentifier(process.dataInputs,"delay");

        // console.log ("this.findDataInputsByIdentifier ="+this.findDataInputsByIdentifier);
        // console.log ("delay ="+delay);

        wps_Config = {
     
            delay: {
                value: (delay.literalData.defaultValue)?delay.literalData.defaultValue:5,
                title: delay.title
            }
        };
        this.wpsInitialized = true;
    },    

    ExecuteWpsTimer: function() {

        mask_loader.show();

        var temps =  (this.timeField.getValue())?this.timeField.getValue():wps_Config.delay.value;
        
        var inputs = [{
            identifier: "delay",
            data: {literalData: {value: temps}}
        }];

        // console.log(inputs)

        // var inputs;
        // if (arguments.length == 2)  { 
        //     var time_in = {
        //         identifier: "delay",
        //         data: {literalData: {value: temps}}
        //     };
        //     inputs = [time_in];
        // }else {
        // console.log ("ECHEC in executeWPS with "+arguments.length+" arguments") ;
        // return ;
        // }
    
        var wpsFormat = new OpenLayers.Format.WPSExecute();
        var xmlString = wpsFormat.write({
            identifier: WPS_identifier,
            dataInputs: inputs, 
            responseForm: {
                responseDocument: {
                    storeExecuteResponse: true,
                    lineage: false,
                    status: false,
                    outputs: [{
                        asReference: false,
                        identifier: "temps"
                    }]
                }
            }
        });
        OpenLayers.Request.POST({
            url: WPS_URL,
            data: xmlString,
            success: this.onExecuted,
            failure: this.onError
        });

    },

    onError: function (process) {
    mask_loader.hide();
        GEOR.util.infoDialog({
            msg: "Echec dans l'execution du processus !<br>\n" + "Raison : " + process.exception.text
        });
    },

    onExecuted: function (resp) {
        mask_loader.hide();

        var getStatusExecute = function (dom) {
            var test = (dom[0].firstElementChild || dom[0].firstChild);
            // console.log(test)
            return (test.nodeName == "wps:ProcessSucceeded") ? "success" : "fail";
        };

        var wpsNS = "http://www.opengis.net/wps/1.0.0";
        var owsNS = "http://www.opengis.net/ows/1.1";
        var format = new OpenLayers.Format.XML();
        var dom = format.read(resp.responseText);
        var domStatus = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom, "http://www.opengis.net/wps/1.0.0", "Status");
        if (getStatusExecute(domStatus) === "success") {

            var timer_test = null;
            // var layerUrl = null;
            // var layerName = null;
            var procOutputsDom = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom,wpsNS,"ProcessOutputs");
            var outputs = null;
            if (procOutputsDom.length) {
                outputs = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(procOutputsDom[0],wpsNS,"Output");
            }
            for (var i = 0; i < outputs.length; i++) {
                var identifier = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(outputs[i],owsNS,"Identifier")[0].firstChild.nodeValue;
                var literalData = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(outputs[i],wpsNS, "LiteralData");
                if (identifier == "temps"){
                    if(literalData.length > 0) {
                        timer_test=literalData[0].firstChild.nodeValue;
                    }
                }
            }
            if (timer_test !== null)   {
                GEOR.util.infoDialog({
                    msg: timer_test
                });
                // alert(timer_test)
            };
        }
    },
    

    showWindow: function() {
        if (!this.win) {
            this.win = this.createWindow();
        }
        this.win.show();
    },

    destroy: function() {
        this.win.hide();
        this.map = null;
        /*temp = this.toolbar.items.get('button-wpstimer');
        this.toolbar.remove(temp); //remove temp (first item) from displayQty(toolbar)
        this.toolbar.remove(this.toolbar.items.items[this.options.position]);*/
    }
};

/*    creat_help_window: function(){
        var helpPage = new Ext.Window({
            title: OpenLayers.i18n("help_window_title"),
            closable: true,
            closeAction: 'hide',
            region: "west", //"north","south","east","west"
            width: 500,
            height: 500,
            // autoWidth: true,
            // autoHeight: true,
            iconCls: 'windo_icon',
            plain: true,
            layout: 'border',
            buttonAlign: 'left',
            region: 'center',
            layout: 'fit',
            items: [{
                xtype: 'window',
                height: 200,
                width: 200,
                autoShow: true,
                constrainHeader: true,
                html: 'Content'
            }],
            fbar: ['->', {
                text: OpenLayers.i18n("Close"),
                handler: function() {
                    this.win.hide();
                },
                scope: this
                }],           
        });
        return helpPage
    },

    show_help_Window: function() {
    if (!this.win) {
        this.win = this.creat_help_window();
        }
    this.win.show();
    },*/



        /*
        var menuitems = new Ext.menu.Item({
        text: record.get("title")[lang] || record.get("title")["en"],
        qtip: record.get("description")[lang] || record.get("description")["en"],
        hidden:(this.options.showintoolmenu ===true)? false: true,
        listeners:{
            "afterrender": function( thisMenuItem ) { 
                Ext.QuickTips.register({
                    target: thisMenuItem.getEl().getAttribute("id"),
                    title: thisMenuItem.initialConfig.text
                });
            }
        },
        menu: wps_window,
        iconCls: 'process_time_icon'
        });
        if (this.toolbar !== null) {
            var menuButton = {
                id: 'button-wpstimer',
                iconCls: 'process_time_icon',
                tooltip: record.get("description")[lang] || record.get("description")["en"],
                menu: wps_window
            };
            this.toolbar.insert(parseInt(this.options.position,12),menuButton);
            this.toolbar.insert(parseInt(this.options.position,12),"-");
            // this.toolbar.insert(parseInt(this.options.position),{xtype: 'tbspacer', width: 50});
            this.toolbar.doLayout();
        }
        this.item = menuitems;
        return menuitems;
        */

/*    doExtract: function(okLayers) {
        
        var spec = {
            "emails": [this.emailField.getValue()],
            "globalProperties": {
                "projection": this.srsField.getValue(),
                "resolution": parseInt(this.resField.getValue())/100,
                "rasterFormat": this.rasterFormatField.getValue(),
                "vectorFormat": this.vectorFormatField.getValue(),
                "bbox": {
                    "srs": this.map.getProjection(),
                    "value": bbox.toArray()
                }
            },
            "layers": okLayers
        };
        GEOR.waiter.show();
        Ext.Ajax.request({
            url: this.options.serviceURL,
            success: function(response) {
                if (response.responseText &&
                    response.responseText.indexOf('<success>true</success>') > 0) {
                    this.win.hide();
                    GEOR.util.infoDialog({
                        msg: OpenLayers.i18n('The extraction request succeeded, check your email.')
                    });
                } else {
                    GEOR.util.errorDialog({
                        msg: OpenLayers.i18n('The extraction request failed.')
                    });
                }
            },
            failure: function(response) {
                GEOR.util.errorDialog({
                    msg: OpenLayers.i18n('The extraction request failed.')
                });
            },
            jsonData: this.jsonFormat.write(spec),
            scope: this
        });
    },*/