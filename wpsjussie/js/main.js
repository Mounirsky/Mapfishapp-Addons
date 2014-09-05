Ext.namespace("GEOR.Addons");

GEOR.Addons.wpsjussie = function(map, options) {
    this.map = map;
    this.options = options;
    this.control = null;
    this.item = null;
    this.window = null;
};

GEOR.Addons.wpsjussie.prototype = {
    win: null,
    item: null,
    show_help: null,
    win_help: null,
    WPS_config: null,
    layerStore: null,
    drawPolygon:null,
    ButtonToolDraw: null,

    /**
     * Property: wpsInitialized
     * occurs when the wps describeProcess returns a response
     * boolean.
     */
    wpsInitialized: false,
    
    defaultIMG: "",

    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        var lang = OpenLayers.Lang.getCode();
        wps_URL = this.options.wps_URL;
        wps_Identifier = this.options.wps_Identifier;
        layerStore = Ext.getCmp("mappanel").layers;
        Execute_Wps = this.Execute_Wpsjussie;
        onError = this.onError;
        onExecuted = this.onExecuted;
        my_map = this.map;

        drawPolygon = new OpenLayers.Layer.Vector("ROI",{
                displayInLayerSwitcher: false,
            });

        my_map.addLayers([drawPolygon])

        if (this.wpsInitialized === false) {
            this.describeProcess(wps_URL, wps_Identifier);
        };
        mask_loader = new Ext.LoadMask(Ext.getBody(), {
                msg: OpenLayers.i18n("Processing ...")
            });

        this.item = new Ext.menu.Item({
            text: record.get("title")[lang] || record.get("title")["en"],
            qtip: record.get("description")[lang] || record.get("description")["en"],
            iconCls: 'process_icon',
            handler: this.showWindow,
            scope: this
        });

        return this.item;
    },


    createWindow: function() {

        var addComboxFieldItemsWCS = function()  {
            layer_liste_WCS = [];
            var empty = true ;
            layerStore.each (function (record) {
                var layer = record.get('layer');
                var queryable = record.get('queryable');
                // var type = record.get('type');
                var hasEquivalentWCS = record.hasEquivalentWCS()
                if (queryable && hasEquivalentWCS) {
                    empty = false;

                    var ObjectRecordType = Ext.data.Record.create(['text', 'value']);
                    var rec = new ObjectRecordType({ text: layer.name, value:record })
                    
                    var liste = [rec.data.text, rec.data.value];
                    layer_liste_WCS.push(liste)
                }
            }) ;
            if (empty)  {
                var ObjectRecordType = Ext.data.Record.create(['text', 'value']);
                var rec = new ObjectRecordType({ text: "No based WCS layer !", value:"" })
                
                var liste = [rec.data.text, rec.data.value];
                layer_liste_WCS.push(liste)
                disabled: true

            }
        };
        addComboxFieldItemsWCS();

        var addComboxFieldItemsWFS = function()  {
            layer_liste_WFS = [];
            var empty = true ;
            layerStore.each (function (record) {
                var layer = record.get('layer');
                var queryable = record.get('queryable');
                // var type = record.get('type'); // return str
                var hasEquivalentWFS = record.hasEquivalentWFS()
                if (queryable && hasEquivalentWFS) {
                    empty = false;

                    var ObjectRecordType = Ext.data.Record.create(['text', 'value']);
                    var rec = new ObjectRecordType({ text: layer.name, value:record })
                    
                    var liste = [rec.data.text, rec.data.value];

                    layer_liste_WFS.push(liste)
                }
            }) ;
            if (empty)  {
                var ObjectRecordType = Ext.data.Record.create(['text', 'value']);
                var rec = new ObjectRecordType({ text: "No based WFS layers !", value:"" })
                
                var liste = [rec.data.text, rec.data.value];
                layer_liste_WCS.push(liste)
                disabled: true
            }
        };
        addComboxFieldItemsWFS();

        var FIELD_WIDTH = 220,
            base = {
                forceSelection: true,
                editable: true,
                allowBlank: true,
                triggerAction: 'all',
                mode: 'local',
                labelSeparator: OpenLayers.i18n("labelSeparator"),
                valueField: 'value',
                displayField: 'text',
                labelWidth: 300
        };

        ImageField = new Ext.form.ComboBox(Ext.apply({
            name: "Image_ref",
            fieldLabel: OpenLayers.i18n("Spot Image Input (Required)"),
            // fieldLabel: WPS_config.img.title, // From WPS Server
            emptyText: OpenLayers.i18n("Select your Image"),
            width: FIELD_WIDTH,
            store: new Ext.data.SimpleStore({
                        fields: ['text','value'],
                        data: layer_liste_WCS
                        }),
        }, base));

        ZoneField = new Ext.form.ComboBox(Ext.apply({
            name: "Zone_ref",
            fieldLabel: OpenLayers.i18n("Clip Area (Optionel)"),
            // fieldLabel: WPS_config.img.title, // From WPS Server
            emptyText: OpenLayers.i18n("Select your Clip Zone"),
            width: FIELD_WIDTH,
            store: new Ext.data.SimpleStore({
                fields: ['text','value'],
                data: layer_liste_WFS
                })
        }, base));

        angleField = new Ext.form.NumberField({
            fieldLabel: OpenLayers.i18n("Angle Degrees (SAM)"),
            // fieldLabel: WPS_config.angle.title, // From WPS Server
            name: "angle",
            width: 30,
            maxValue: 90,
            minValue: 0,
            allowBlank: false,
            labelSeparator: OpenLayers.i18n("labelSeparator"),
            value: this.options.default_angle,
            allowDecimals: true,
            decimalPrecision: 2
        });

        ClustersField = new Ext.form.ComboBox(Ext.apply({
            name: "Nclusters",
            fieldLabel: OpenLayers.i18n("Number of clusters (ISODATA)"),
            // fieldLabel: WPS_config.Nclass.title, // From WPS Server
            value: this.options.default_Nclass,
            width: 40,
            store: new Ext.data.SimpleStore({
                fields: ['value', 'text'],
                data: this.options.Nclass_data
            })
        }, base));

        emailField = new Ext.form.TextField({
            name: "email",
            vtype: "email",
            vtypeText: OpenLayers.i18n('This field should be filled in by your e-mail address'),
            emptyText: "user@domain.com",
            allowBlank: false,
            width: FIELD_WIDTH,
            labelSeparator: OpenLayers.i18n("labelSeparator"),
            value: GEOR.config.USEREMAIL || "",
            fieldLabel: OpenLayers.i18n("Enter your Email (Required)"),
            // fieldLabel: WPS_config.email.title, // From WPS Server
            value: this.options.default_email
        });
        return new Ext.Window({
            title: OpenLayers.i18n("addon_wpsjussie_title"),
            closable: true,
            resizable: false,
            shadow: false,
            closeAction: 'hide',
            region: "center", //"north","south","east","west"
            width: 440,
            height: 190,
            iconCls: 'wind_icon',
            plain: true,
            layout: 'border',
            buttonAlign: 'left',
            layout: 'fit',
            listeners: {
                show: function() {
                    this.el.setStyle('left', '');
                    this.el.setStyle('top', '');
                }
            },
            items: [{
                region: 'center',
                xtype: 'tabpanel',
                activeTab: 0,   
                width: 50,
                height:20,
                items: [{ // we will declare 3 tabs
                    title: OpenLayers.i18n('Datas Inputs'),
                    closable:false,
                    iconCls: 'input_icon',
                    active: true,
                    items:[{
                        xtype: 'form',
                        autoWidth: true,
                        labelWidth: 175,
                        bodyStyle: "padding:10px;",
                        items: [
                            ImageField,
                            ZoneField,
                            emailField
                        ]                        
                    }]
                },{
                    title: OpenLayers.i18n('Draw Ground truth'),
                    closable:false,
                    activate: true,
                    iconCls: 'jussie_icon',
                    bodyStyle: "padding:10px 50px 10px;",
                    items:[
                        new Ext.Button(new GeoExt.Action({                        
                            iconCls: 'draw_icon',
                            autoWidth: true,
                            height:30,
                            // width: 150,
                            text: OpenLayers.i18n("Draw ROI"),
                            map: this.map,
                            toggleGroup: "map",
                            allowDepress: false,
                            disabled: false,
                            // tooltip: "",
                            control: this.createWPSControl(OpenLayers.Handler.Polygon)
                        })),

                        {xtype: 'spacer', height: 10},

                        new Ext.Button({  
                            iconCls: 'delete_icon',
                            autoWidth: true,
                            height:30,
                            text: OpenLayers.i18n("Clear ROI"),
                            handler: function() {
                                var ROI_features = drawPolygon.features;
                                drawPolygon.removeFeatures(ROI_features)
                            },
                            scope: this
                        }),
                    ]
                },{
                    title: OpenLayers.i18n("Settings"),
                    closable:false,
                    activate: true,
                    iconCls: 'param_icon',
                    items:[{
                        xtype: 'form',
                        autoWidth: true,
                        labelWidth: 180,
                        padding:10,
                        bodyStyle: "padding:10px;",
                        items: [
                            angleField,
                            ClustersField,
                        ]                        
                    }]
                }]    
            }],

            fbar: ['->', {
                text: OpenLayers.i18n("Close"),

                iconCls: 'close_icon',
                height:25,
                handler: function() {
                    this.win.hide();
                },
                scope: this
            },  {
                text: OpenLayers.i18n("Help"),
                iconCls: 'help_win_icon',
                height:25,
                width: 35,
                handler: function () {
                           window.open("http://geowww.agrocampus-ouest.fr/web/");
                        }
            },  
            // {
            //     text: OpenLayers.i18n("Refresh"),
            //     handler: function () {
            //                 // addComboxFieldItemsWCS(),
            //                 // addComboxFieldItemsWFS()

            //                 addComboxFieldItemsWCS();
            //                 // console.log(layer_liste_WCS)

            //                 ImageField.store = new Ext.data.SimpleStore({
            //                     fields: ['text','value'],
            //                     data: layer_liste_WCS
            //                     });

            //                 console.log(ImageField.store.totalLength)
            //             },
            //             scope: this
            // }, 
            {
                text: OpenLayers.i18n("Execute without ROI"),
                tooltip: "",
                iconCls: "preceed_icon",
                height:25,
                handler: function() {
                    this.Execute_without_ROI (ImageField.getValue(), ZoneField.getValue());
                },
                scope: this
            },
            {
                text: OpenLayers.i18n("Execute with ROI"),
                tooltip: "",
                iconCls: 'ok_icon',
                height:25,
                autoWidth: true,
                handler: function() {
                    this.Execute_with_ROI (ImageField.getValue(), ZoneField.getValue())
                },
                scope: this
            }],
            
        });
    },

    /**
     * Method: onCheckchange
     * Callback on checkbox state changed
     */
    onCheckchange: function() {
        this.win.show();
        this.win.alignTo(
            Ext.get(this.map.div),
            "t-t",
            [-270, 390],
            true
        );
    },

    /**
     * Method: convertToGML
     * Convertit un feature au format GML
     * Parameters:
     * feature - {OpenLayers.Feature.Vector}
     */
    convertToGML:function (feature) {
        var gmlPoy = new OpenLayers.Format.GML();
        var inGML = gmlPoy.write(feature).replace(/<\?xml.[^>]*>/, "");
        return inGML;
    },

    /**
     * Method: createWPSControl
     * Crée un control drawFeature de type ligne
     * Parameters:
     * handlerType - {OpenLayers.Handler.Path}, map - {OpenLayers.Map} The map instance.
     */
    createWPSControl: function (handlerType) {
        var drawPolygoneCtrl = new OpenLayers.Control.DrawFeature(drawPolygon, handlerType, {
                featureAdded: function (e) {
                    drawPolygoneCtrl.deactivate();
                }
            }
        );
        return drawPolygoneCtrl;
    },

    Execute_without_ROI: function(record_wcs, record_wfs){

        if (record_wcs !== "" && record_wfs === ""){

            var url_wcs_in = record_wcs.data.WCS_URL;
            var layer_wcs_in = record_wcs.data.WCS_typeName;
            
            Execute_Wps(url_wcs_in, layer_wcs_in);
        }
        else if (record_wcs !== "" && record_wfs !== "") {            

            var url_wcs_in = record_wcs.data.WCS_URL;
            var layer_wcs_in = record_wcs.data.WCS_typeName;
            var url_wfs_in = record_wfs.data.WFS_URL;
            var layer_wfs_in = record_wfs.data.WFS_typeName;

            Execute_Wps(url_wcs_in, layer_wcs_in, url_wfs_in, layer_wfs_in);

        }else{
            GEOR.util.errorDialog({
                title: "Inputs Erorr",
                msg: OpenLayers.i18n("Please select at least an Image !"),
            });            
        }

        if (!this.win) {
            this.win = this.createWindow();
        }
        this.win.hide();
    },

    Execute_with_ROI: function (record_wcs,record_wfs) {

        var ROI_features = drawPolygon.features;

        console.log("ROI_features_length = "+ ROI_features.length)

        var proj_srs = drawPolygon.projection;

        var proj_dst = new OpenLayers.Projection("EPSG:2154"); // Projection de l'image à traiter (Lambert 93)

        for (var i = 0; i < ROI_features.length; i++) {
            ROI_features[i].id = "1";
            ROI_features[i].attributes = {
                CLASSE: "jussie"
            };
            ROI_features[i].geometry.transform(proj_srs, proj_dst);
        }

        var ROI_gml = this.convertToGML(ROI_features);

        if (record_wcs !== "" && record_wfs === "" && ROI_features.length > 0){
            var url_wcs_in = record_wcs.data.WCS_URL;
            var layer_wcs_in = record_wcs.data.WCS_typeName;

            Execute_Wps(url_wcs_in, layer_wcs_in, ROI_gml);
        }
        else if (record_wcs !== "" && record_wfs !== "" && ROI_features.length > 0) {            
            var url_wcs_in = record_wcs.data.WCS_URL;
            var layer_wcs_in = record_wcs.data.WCS_typeName;
            var url_wfs_in = record_wfs.data.WFS_URL;
            var layer_wfs_in = record_wfs.data.WFS_typeName;

            Execute_Wps(url_wcs_in, layer_wcs_in, url_wfs_in, layer_wfs_in, ROI_gml);

        }else{
            GEOR.util.errorDialog({
                title: "Inputs Erorr",
                msg: OpenLayers.i18n("Please select at least an Image and/or Draw an ROI !"),
            });            
        }

        if (!this.win) {
            this.win = this.createWindow();
        }
        this.win.hide();
    },

    /**
     * Method: describeProcess
     *
     * Parameters:
     * String url, String identifier du process WPS.
     */
    describeProcess: function (url, identifier) {
        var onDescribeP = this.onDescribeProcess;

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

        var img = findDataInputsByIdentifier(process.dataInputs,"namespace_wcs");

        var enableIMG = [];
        var defaultIMG = this.defaultIMG;
        var dataimg = [];
        for (var obj in img.literalData.allowedValues) {
            if (img.literalData.allowedValues.hasOwnProperty(obj)) {
                if (enableIMG.length < 1 || enableIMG.indexOf(obj) > -1) { // enableIMG defined in GEOR_custom.js or not
                    dataimg.push([obj]);
                }
            }
        }

        if (defaultIMG === null) { // defaultIMG defined in GEOR_custom.js or not
                 defaultIMG = (img.literalData.defaultValue)?img.literalData.defaultValue:"geouest:spot_2012-30-09_up-l";
        }

        var angle_in = findDataInputsByIdentifier(process.dataInputs,"Angle spectral");
        var Nclass_in = findDataInputsByIdentifier(process.dataInputs,"Nombre de classes");
        var email = findDataInputsByIdentifier(process.dataInputs,"E-Mail");

        WPS_config = {
     
            img: {
                value: defaultIMG,
                title: img.title,
                allowedValues: dataimg
            },
            angle: {
                value: (angle_in.literalData.defaultValue)?angle_in.literalData.defaultValue:1,
                title: angle_in.title,                
            },
            Nclass: {
                value: (Nclass_in.literalData.defaultValue)?Nclass_in.literalData.defaultValue:3,
                title: Nclass_in.title,                
            },
            email: {
                value: (email.literalData.defaultValue)?email.literalData.defaultValue:"",
                title: email.title,                
            },      
        };
        this.wpsInitialized = true;
    },

    Execute_Wpsjussie: function(){

        GEOR.util.infoDialog({
            msg: OpenLayers.i18n("You can waite until the end of the process or Leave and check the result on your email later.")
        });

        // mask_loader.show();

        var anglein =  (angleField.getValue())?angleField.getValue():WPS_config.angle.value;
        var Nclassin =  (ClustersField.getValue())?ClustersField.getValue():WPS_config.Nclass.value;
        var emailin =  (emailField.getValue())?emailField.getValue():WPS_config.email.value;

        var angle_in = {
            identifier: "Angle spectral",
            data: {literalData: {value: anglein}}
        };
        var Nclass_in = {
            identifier: "Nombre de classes",
            data: {literalData: {value: Nclassin}}
        };
        var email_in = {
            identifier: "E-Mail",
            data: {literalData: {value: emailin}}
        };
        

    var inputs;
        var urlWCSIn = {
            identifier:"url_wcs",
            data: {literalData: {value: Execute_Wps.arguments[0]}}                
        };
        var layerWCSIn = {
            identifier:"namespace_wcs",
            data: {literalData: {value: Execute_Wps.arguments[1]}} 
        };
        if (Execute_Wps.arguments.length == 2) { // reference to WCS & WFS input       
            console.log("inputs avec "+Execute_Wps.arguments.length+" args")
            inputs = [urlWCSIn, layerWCSIn, angle_in, Nclass_in, email_in];
        }
        else if (Execute_Wps.arguments.length == 4){
           console.log("inputs avec "+Execute_Wps.arguments.length+" args")
            var urlWFSIn = {
            identifier:"url_wfs_RH",
            data: {literalData: {value: Execute_Wps.arguments[2]}}                
            };
            var layerWFSIn = {
                identifier:"namespace_wfs_RH",
                data: {literalData: {value: Execute_Wps.arguments[3]}}              
            };

            inputs = [urlWCSIn, layerWCSIn, urlWFSIn, layerWFSIn, angle_in, Nclass_in, email_in];

        }else if (Execute_Wps.arguments.length == 3){
           console.log("inputs avec "+Execute_Wps.arguments.length+" args")
            var gmlIn = {
                identifier: "ROI_Jussie",
                data: {complexData: {value: Execute_Wps.arguments[2]}}
            };
           
        inputs = [gmlIn, urlWCSIn, layerWCSIn, angle_in, Nclass_in, email_in];

        }else if (Execute_Wps.arguments.length == 5){
           console.log("inputs avec "+Execute_Wps.arguments.length+" args")
            var urlWFSIn = {
                identifier:"url_wfs_RH",
                data: {literalData: {value: Execute_Wps.arguments[2]}}                
            };
            var layerWFSIn = {
                identifier:"namespace_wfs_RH",
                data: {literalData: {value: Execute_Wps.arguments[3]}}              
            };
            var gmlIn = {
                identifier: "ROI_Jussie",
                data: {complexData: {value: Execute_Wps.arguments[4]}}
            };

            inputs = [gmlIn, urlWCSIn, layerWCSIn, urlWFSIn, layerWFSIn, angle_in, Nclass_in, email_in];

        }else{
            console.log ("ECHEC in Execute_Wps with "+Execute_Wps.arguments.length+" arguments") ;
            return;
        }

        var wpsFormat = new OpenLayers.Format.WPSExecute();
        var xmlString = wpsFormat.write({
            identifier: wps_Identifier,
            dataInputs: inputs, 
            responseForm: {
                responseDocument: {
                    storeExecuteResponse: true,
                    lineage: false,
                    status: false,
                    outputs: [{
                        asReference: false,
                        identifier: "url"
                    },{
                        asReference: false,
                        identifier: "layer"
                    },{
                        asReference: false,
                        identifier: "text_out"
                    }]
                }
            }
        });

        OpenLayers.Request.POST({
            url: wps_URL,
            data: xmlString,
            success: onExecuted,
            failure: onError
        });  

    },

    /**
     * Method: onError
     *
     */
    onError: function (process) {
        mask_loader.hide();

        GEOR.util.infoDialog({
            msg: "Echec dans l'execution du processus !<br>\n" + "Raison : " + process.exception.text
        });
    },

    onExecuted: function (resp) {
        mask_loader.hide();

        var zoomToLayerRecExtent = function(rec) {
            var map = rec.get('layer').map,
                mapSRS = map.getProjection(),
                zoomed = false,
                bb = rec.get('bbox');     
            for (var key in bb) {
                if (!bb.hasOwnProperty(key)) {
                    continue;
                }
                if (key === mapSRS) {
                    map.zoomToExtent(
                        OpenLayers.Bounds.fromArray(bb[key].bbox)
                    );
                    zoomed = true;
                    break;
                }
            }
            if (!zoomed) {
                var llbbox = OpenLayers.Bounds.fromArray(
                    rec.get('llbbox')
                );
                llbbox.transform(
                    new OpenLayers.Projection('EPSG:4326'),
                    map.getProjectionObject()
                );
                map.zoomToExtent(llbbox);
            }
        };

        var getStatusExecute = function (dom) {
            var test = (dom[0].firstElementChild || dom[0].firstChild);
            return (test.nodeName == "wps:ProcessSucceeded") ? "success" : "fail";
        };

        var wpsNS = "http://www.opengis.net/wps/1.0.0";
        var owsNS = "http://www.opengis.net/ows/1.1";
        var format = new OpenLayers.Format.XML();
        var dom = format.read(resp.responseText);
        var domStatus = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom, "http://www.opengis.net/wps/1.0.0", "Status");
        if (getStatusExecute(domStatus) === "success") {

            var layerUrl = null;
            var layerName = null;
            var resp_text = null;

            var procOutputsDom = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(dom,wpsNS,"ProcessOutputs");
            var outputs = null;
            if (procOutputsDom.length) {
                outputs = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(procOutputsDom[0],wpsNS,"Output");
            }
            for (var i = 0; i < outputs.length; i++) {
                var identifier = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(outputs[i],owsNS, "Identifier")[0].firstChild.nodeValue;
                var literalData = OpenLayers.Format.XML.prototype.getElementsByTagNameNS(outputs[i],wpsNS,  "LiteralData");
                
                if (identifier == "text_out"){
                    if(literalData.length > 0) {
                        resp_text=literalData[0].firstChild.nodeValue;
                    }
                }
                if (identifier == "url"){
                    if(literalData.length > 0) {
                        layerUrl=literalData[0].firstChild.nodeValue;
                    }
                }
                if (identifier == "layer"){
                    if(literalData.length > 0) {
                        layerName=literalData[0].firstChild.nodeValue;
                    }
                }          
            }
            if (layerUrl !== null && layerName !== null)   {

                GEOR.waiter.show();
                var wmsdyn = new OpenLayers.Layer.WMS(
                    "Dynamic layer",
                    layerUrl,
                    {layers: layerName,
                     transparent: true
                    },
                    {singletile: true,
                     transitionEffect: 'resize'
                    }
                );
                var c = GEOR.util.createRecordType();
                var layerRecord = new c({layer: wmsdyn, name: layerName, type: "WMS"});
                var clone = layerRecord.clone ();

                GEOR.ows.hydrateLayerRecord(clone, {
                    success: function(){
                        clone.get("layer").setName(clone.get ("title"));
                        layerStore.addSorted(clone);
                        zoomToLayerRecExtent(clone);
                        GEOR.waiter.hide();
                    },
                    failure: function() {
                        GEOR.util.errorDialog({
                            msg: "Impossible d'obtenir les informations de la couche !"

                        });
                    GEOR.waiter.hide();
                    },
                    scope: this
                }) ;
            }
            if (resp_text !== null)   {
                GEOR.util.infoDialog({
                    msg: resp_text
                });
            }
            else{
                GEOR.util.infoDialog({
                    msg: "Aucun calcul réalisé !"
                });

            }

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
    }
};
