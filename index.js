var http = require('http');
var request = require('request');
var light = require('./light.js');
var plug = require('./plug.js');
var thermostat = require('./thermostat.js');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
  console.log("homebridge API version: " + homebridge.version);

  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  // For platform plugin to be considered as dynamic platform plugin,
  // registerPlatform(pluginName, platformName, constructor, dynamic), dynamic must be true
  homebridge.registerPlatform("homebridge-conrad-connect", "conrad-connect-platform", ConradConnect, true);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function ConradConnect(log, config, api) {
  var platform = this;
  this.log = log;
  this.config = config;
  this.accessoriesList = [];
  this.api = api;

  if (api) {
    // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
    // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
    // Or start discover new accessories.
    this.api.on('didFinishLaunching', function () {
      platform.log("DidFinishLaunching");
      log("ConradConnect Init");
      setInterval(this.fetchDevices.bind(this), 1000)
    }.bind(this));
  } else {
    log("ConradConnect Init");
    setInterval(this.fetchDevices.bind(this), 1000)
  }

}

ConradConnect.prototype.fetchDevices = function () {
  var platform = this;

  var url = platform.config.postUrl;
  request.post(platform.config.postUrl, {
    json: {
      action: "get"
    },
    headers: {
      'Authorization': `Bearer ${platform.config.bearerToken}`
    }
  }, (error, res, body) => {
    if (error) {
      platform.log(error)
      platform.log(`statusCode: ${res.statusCode}`)
      platform.log(body)
      return;
    }
    var devices = body.result;

    devices.forEach(device => {
      platform.addAccessory(device)
    });

    var deletedAccessories = platform.accessoriesList.filter(
      localAccessory =>
        devices.findIndex(fetchedAccessory =>
          fetchedAccessory.id == localAccessory.context.idFromConrad)
        == -1
    ); //device in local cache is not in fetched list from server

    platform.removeAccessories(deletedAccessories);
  });

  // var devices = JSON.parse('[{"id":"5c408558aa0c13f2c5debcfa","name":"Light1","metadata":{"id":"wiz.light","types":["lamp"],"properties":[{"name":"on_off","type":"Boolean","readable":true,"writable":true},{"name":"brightness","type":"Number","unit":"percent","readable":false,"writable":true},{"name":"color","type":"String","unit":"hexRGB","readable":false,"writable":true}],"events":[]}},{"id":"5c4070a3aa0c13f2c5debcf9","name":"LockOffice","metadata":{"id":"nuki.lock","types":["doorlock"],"properties":[{"name":"locked","type":"Boolean","readable":false,"writable":true}],"events":[]}},{"id":"5c4b36675dfa2be825e7707c","name":"Fenster-undTürkontakt","metadata":{"id":"homematic.eQ3.WindowSensor","types":["contactSensor"],"properties":[],"events":[{"name":"stateChange","value":{"type":"Enum","enumValues":["open","closed"]}}]}}]');

  // devices.forEach(device => {
  //   platform.addAccessory(device)
  // });

  // var deletedAccessories = platform.accessoriesList.filter(
  //   localAccessory =>
  //     devices.findIndex(fetchedAccessory =>
  //       fetchedAccessory.id == localAccessory.context.idFromConrad)
  //     == -1
  // ); //device in local cache is not in fetched list from server

  // platform.removeAccessories(deletedAccessories);
}

ConradConnect.prototype.accessories = function (callback) {
  callback(this.accessoriesList);
}

// Function invoked when homebridge tries to restore cached accessory.
// Developer can configure accessory at here (like setup event handler).
// Update current value.
ConradConnect.prototype.configureAccessory = function (accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;

  // Set the accessory to reachable if plugin can currently process the accessory,
  // otherwise set to false and update the reachability later by invoking 
  // accessory.updateReachability()
  accessory.reachable = true;

  this.getAccessoryBuilder(accessory.context.type).configureCharacteristics(accessory);

  this.accessoriesList.push(accessory);
}

ConradConnect.prototype.addAccessory = function (device) {
  var platform = this;

  var existing = false;
  this.accessoriesList.forEach(existingDevice => {
    if (existingDevice.context.idFromConrad == device.id) {
      existing = true;
    }
  })
  if (existing) {
    return;
  }

  var builder = this.getAccessoryBuilder(device.metadata.types.join(''))

  var newAccessory = builder.createAccessory(device)
  builder.configureCharacteristics(newAccessory)

  this.accessoriesList.push(newAccessory);
  this.api.registerPlatformAccessories("homebridge-conrad-connect", "conrad-connect-platform", [newAccessory]);
}

ConradConnect.prototype.getAccessoryBuilder = function (accessoryType) {
  var platform = this;

  switch (accessoryType) {
    case "lamp":
      return light.builder(Accessory, Service, Characteristic, UUIDGen, platform);
    case "thermostat":
      return thermostat.builder(Accessory, Service, Characteristic, UUIDGen, platform);
    case "plug":
      return plug.builder(Accessory, Service, Characteristic, UUIDGen, platform);
    default:
      platform.log(`Ignoring unknown accessory type ${accessoryType}`);
  }
}

ConradConnect.prototype.removeAccessories = function (accessories) {
  accessories.forEach(accessory => {
    this.api.unregisterPlatformAccessories("homebridge-conrad-connect", "conrad-connect-platform", [accessory]);
    this.accessoriesList.splice(this.accessoriesList.indexOf(accessory), 1);
  });
}