/* 
 * Copyright (c) 2014 by GeoBolivia 
 * Author: Davis Mendoza Paco <davis.men.pa@gmail.com, dmendoza@geo.gob.bo> 
 *
 */
Ext.namespace("GEOR.Addons");

GEOR.Addons.GeoCrono = function(map, options) {
    this.map = map;
    this.options = options;
    this.control = null;
    this.item = null;
};

// If required, may extend or compose with Ext.util.Observable
GEOR.Addons.GeoCrono.prototype = {
    layersWms: null,
    wmsPanel: null,
    cbboxStart: null,
    cbboxEnd: null,
    interval: null,
    counter: null,
    delay: 2000,
    layerStart: null,
    layerEnd: null,
    /**
     * Method: init
     *
     * Parameters:
     * record - {Ext.data.record} a record with the addon parameters
     */
    init: function(record) {
        options = this.options;

        var lang = OpenLayers.Lang.getCode();
        this.item = new Ext.menu.Item({
            text: record.get("title")[lang],
            iconCls: 'icon',
            qtip: record.get("description")[lang],
            handler: this.showWindow,
            scope: this
        });
        cbboxStart = this.createComboBox('cbboxStart',OpenLayers.i18n('Start'));
        cbboxEnd = this.createComboBox('cbboxEnd',OpenLayers.i18n('End'))

        return this.item;
    },
    /**
     * Method: destroy
     * Called by GEOR_tools when deselecting this addon
     */
    destroy: function() {
        this.control && this.control.destroy();
        this.control = null;
        this.map = null;
    },
    showWindow: function() {
        var me = this;
        if (!this.win) {
            this.win = new Ext.Window({
                title: OpenLayers.i18n('GeoCrono'),
                width: 750,
                height: 160,
                resizable: true,
                iconCls: 'icon',
                closeAction: 'hide',
                plain: false,
                layout: 'border',
                items: [{
                    region: 'north',
                    height: 40,
                    items: [this.createFormNorth()]
                }, {
                    region: 'center',
                    items: [this.createFormCenter()]
                }],
                listeners:{
                    'close':function(win){
                    },'hide':function(win){
                        me.removeLayers();
                    }
                }
            });
        }
        this.win.show();
    },
    removeLayers: function(){
        this.stop();
        for (var i = 0; i < this.layersWms.length; i++) {
            var l = this.layersWms;
            var id = l[i][0];
            var layerC = this.map.getLayer(id);
            if (layerC != null) {
                this.map.removeLayer(layerC);
            }
        }
    },
    /*****/
    createFormNorth: function() {
        var me = this;
        var form = new Ext.FormPanel({
            labelAlign: 'right',
            labelWidth: 'auto',
            width: '100%',
            frame: true,
            bodyStyle: 'padding:5px 5px 0',
            items: [{
                layout: 'column',
                items: [ {
                    columnWidth: .05,
                    layout: 'form',
                    items: [{
                        xtype: 'button',
                        iconCls: 'start-icon',
                        scope: this,
                        handler: function() {
                            me.start();
                        }
                     }] 
                }, {
                    columnWidth: .05,
                    layout: 'form',
                    items: [{
                        xtype: 'button',
                        iconCls: 'stop-icon',
                        scope: this,
                        handler: function() {
                            me.stop();
                        }
                    }]
                }, {
                    columnWidth: .3,
                    layout: 'form',
                    items: [this.createComoBoxDelay(me)]
                }, {
                    columnWidth: .3,
                    layout: 'form',
                    items: [cbboxStart]
                }, {
                    columnWidth: .3,
                    layout: 'form',
                    items: [cbboxEnd]
                }]
            }]
        });
        return form;
    },
    createComoBoxDelay: function(me){
        var store=[];
        store.push([2000, OpenLayers.i18n('Slow')]);
        store.push([1500, OpenLayers.i18n('Normal')]);
        store.push([600, OpenLayers.i18n('Fast')]);
        var combo = new Ext.form.ComboBox({
            id: "cbboxDelay",
            store: new Ext.data.ArrayStore({
                fields: ['delay', 'name'],
                data: store
            }),
            displayField: 'name',
            editable: false,
            mode: 'local',
            triggerAction: 'all',
            fieldLabel: OpenLayers.i18n('Delay'),
            value: OpenLayers.i18n('Slow'),
            width: 70,
            onSelect: function(record) {
                me.delay = record.data.delay;
                this.setValue(record.data.name);
                this.collapse();
            }
        });
        return combo;
    },
    createComboBox: function(id, field) {
        var me = this;
        var combo = new Ext.form.ComboBox({
            id: id,
            displayField: 'layer',
            editable: false,
            mode: 'local',
            triggerAction: 'all',
            fieldLabel: field,
            emptyText: OpenLayers.i18n('Select a layer'),
            width: 100,
            onSelect: function(record) {
                var abbr = record.data.abbr;
                if(this.id == "cbboxStart"){
                    me.layerStart = abbr;
                } else if(this.id == "cbboxEnd") {
                    me.layerEnd = abbr;
                }
                this.setValue(abbr);
                this.collapse();
            }
        });
        return combo;
    },
    start: function(){
        console.info("Start Animation ");
        var items = Ext.getCmp('radioGroup').items;
        var delay = this.delay;
        if (items != null) {
            items = items.items;
            if(this.layerStart != null && this.layerEnd != null){
                var is = this.indexOf(items, this.layerStart);
                var ie = this.indexOf(items, this.layerEnd);
                if(ie > is){
                    items = items.slice(is, 1 + ie);
                    this.interval = setInterval(this.update, delay, this, items);
                } else {
                    GEOR.util.errorDialog({
                        msg: OpenLayers.i18n('La capa fin debe ser superio a la de inicio')
                    });
                }
            }else{
                this.interval = setInterval(this.update, delay, this, items);
            }
        }
    },
    update: function(me, items) {
        if (me.counter == null)
            me.counter = 0;
        else {
            if (me.counter >= items.length)
                me.counter = 0;
            else
                me.counter++;
        }
        var item = items[me.counter];
        if (item != null) {
            item.setValue(true);
        }
    },
    stop: function() {
        console.info("Stop Animation");
        clearInterval(this.interval);
    },
    indexOf: function(items, name){
        var pos = -1;
        for(var i=0; i< items.length; i++){
            var item = items[i];
            if(item.inputValue == name){
                pos = i;
                break;
            }
        }
        return pos;
    },
    /*****/

    createFormCenter: function() {
        var form = new Ext.FormPanel({
            labelAlign: 'left',
            width: '100%',
            frame: true,
            bodyStyle: 'padding:5px 5px 0',
            items: []
        });
        this.getLayersWms(form, this);
        return form;
    },
    getLayersWms: function(form, comp) {
        var mm = comp;
        var url = this.options.urlWmsCapabilities;
        OpenLayers.Request.GET({
            url: url,
            params: {
                SERVICE: "WMS",
                VERSION: "1.3.0",
                REQUEST: "GetCapabilities"
            },
            success: function(request) {
                var rbItems = [];
                var format = new OpenLayers.Format.WMSCapabilities({
                    version: "1.3.0"
                });
                var doc = request.responseXML;
                if (!doc || !doc.documentElement) {
                    doc = request.responseText;
                }
                var capabilities = format.read(doc);
                var layers = capabilities.capability.layers;

                var url = mm.options.urlWmsCapabilities;
                if (mm.layersWms == null) {
                    mm.layersWms = [];
                }
                var storage = [];
                //layers wms
                for (var i = 0; i < layers.length; i++) {
                    if (layers[i].name && layers[i].name != "") {
                        var title = layers[i].title;
                        var name = layers[i].name;
                        storage.push([name,title]);
                        rbItems.push({
                            boxLabel: mm.subString(title, 7),
                            inputValue: name
                        });
                        if(i == 0){
                            rbItems[0].checked=true;
                        }
                        var layer = new OpenLayers.Layer.WMS(name, url, {
                            singleTile: false,
                            layers: name,
                            transparent: true,
                        }, {
                            displayInLayerSwitcher: false
                        });
                        mm.layersWms.push([layer.id, name, layer]);
                    }
                }
                var rbg = new Ext.form.RadioGroup({
                    id: 'radioGroup',
                    columns: 6,
                    vertical: true,
                    fieldLabel: OpenLayers.i18n('Day'),
                    defaults: {xtype: "radio", name: "rb-horiz2"},
                    items: [],
                    listeners: {
                        change: function(radiogroup, radio) {
                            mm.changeRadioButton(radio);
                        }
                    }
                });

                rbg.items = rbItems;
                form.add(rbg);
                //add combobox
                var cbboxStart = Ext.getCmp('cbboxStart');
                cbboxStart.store= new Ext.data.ArrayStore({
                    fields: ['abbr', 'layer'],
                    data: storage
                });
                var cbboxEnd = Ext.getCmp('cbboxEnd');
                cbboxEnd.store= new Ext.data.ArrayStore({
                    fields: ['abbr', 'layer'],
                    data: storage
                });
                form.doLayout();
            },
            failure: function() {
                GEOR.util.errorDialog({
                    msg: OpenLayers.i18n('Server unavailable')
                });
            }
        });
    },
    objToString: function(obj) {
        var str = '';
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                str += p + ':' + obj[p] + '\n';
            }
        }
        return str;
    },
    changeRadioButton: function(radio) {
        for (var i = 0; i < this.layersWms.length; i++) {
            var l = this.layersWms;
            var id = l[i][0];
            var name = l[i][1];
            var layer = l[i][2];

            if (radio.inputValue == name) {
                var layerC = this.map.getLayer(id);
                if (layerC == null) {
                    this.map.addLayer(layer);
                } else {
                    layerC.setVisibility(true);
                }
            } else {
                var layerC = this.map.getLayer(id);
                if (layerC != null) {
                    layerC.setVisibility(false);
                }
            }
        }
    },
    subString: function(str, n) {
        if (str.length > n)
            return str.substring(0, n);
        return str;
    }
};
