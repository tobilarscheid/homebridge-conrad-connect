var http = require('http');
var request = require('request');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function (homebridge) {
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
  if (api) {
    // Save the API object as plugin needs to register new accessory via this object
    this.api = api;

    // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories.
    // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
    // Or start discover new accessories.
    this.api.on('didFinishLaunching', function () {
      platform.log("DidFinishLaunching");
      log("ConradConnect Init");
      setInterval(function () {
        var url = platform.config.postUrl;
        request.post(platform.config.postUrl, {
          json: {
            bearerToken: platform.config.bearerToken,
            body: {
              action: "get"
            }
          }
        }, (error, res, body) => {
          if (error) {
            platform.log(error)
            platform.log(`statusCode: ${res.statusCode}`)
            platform.log(body)
          }
          var devices = JSON.parse(body);
          devices.forEach(device => {
            platform.addAccessory(device)
          });
        })
      }, 30000, platform);
    }.bind(this));
  } else {
    log("ConradConnect Init");
    setInterval(this.getDevices, 1000, platform);
  }
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

  accessory.on('identify', function (paired, callback) {
    platform.log(accessory.displayName, "Identify!");
    callback();
  });

  if (accessory.getService(Service.Lightbulb)) {
    accessory.getService(Service.Lightbulb)
    .getCharacteristic(Characteristic.On)
    .on('set', function (value, callback) {
      request.post(platform.config.postUrl, {
        json: {
          bearerToken: platform.config.bearerToken,
          body: {
            action: "actuate",
            device: newAccessory.context.idFromConrad,
            property: "on_off",
            value: value
          }
        }
      }, (error, res, body) => {
        if (error) {
          platform.log(error)
          platform.log(`statusCode: ${res.statusCode}`)
          platform.log(body)
          return
        }
      });
      callback();
    });
  }

  this.accessoriesList.push(accessory);
}

ConradConnect.prototype.getDevices = function (platform) {
  // platform.log(platform.config.postUrl);
  // var url = platform.config.postUrl;
  // request(url, function (error, response, body) {
  //   platform.log('error:', error); // Print the error if one occurred
  //   platform.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  //   var devices = JSON.parse(body)
  //   platform.log(devices)

  // });
  var devices = JSON.parse('[{"id":"5c408558aa0c13f2c5debcfa","name":"Light1","metadata":{"id":"wiz.light","types":["lamp"],"properties":[{"name":"on_off","type":"Boolean","readable":true,"writable":true},{"name":"brightness","type":"Number","unit":"percent","readable":false,"writable":true},{"name":"color","type":"String","unit":"hexRGB","readable":false,"writable":true}],"events":[]}},{"id":"5c4070a3aa0c13f2c5debcf9","name":"LockOffice","metadata":{"id":"nuki.lock","types":["doorlock"],"properties":[{"name":"locked","type":"Boolean","readable":false,"writable":true}],"events":[]}},{"id":"5c4b36675dfa2be825e7707c","name":"Fenster-undTürkontakt","metadata":{"id":"homematic.eQ3.WindowSensor","types":["contactSensor"],"properties":[],"events":[{"name":"stateChange","value":{"type":"Enum","enumValues":["open","closed"]}}]}}]');

  devices.forEach(device => {
    platform.addAccessory(device)
  });
}

// Sample function to show how developer can add accessory dynamically from outside event
ConradConnect.prototype.addAccessory = function (device) {
  var platform = this;
  var uuid;

  uuid = UUIDGen.generate(device.name);

  var newAccessory = new Accessory(device.name, uuid);
  newAccessory.on('identify', function (paired, callback) {
    platform.log(newAccessory.displayName, "Identify!");
    callback();
  });
  // Plugin can save context on accessory to help restore accessory in configureAccessory()
  newAccessory.context.idFromConrad = device.id

  var existing = false;
  this.accessoriesList.forEach(existingDevice => {
    if (existingDevice.context.idFromConrad == newAccessory.context.idFromConrad) {
      existing = true;
    }
  })
  if (existing) {
    return;
  }

  // Make sure you provided a name for service, otherwise it may not visible in some HomeKit apps
  newAccessory.addService(Service.Lightbulb, device.name)
    .getCharacteristic(Characteristic.On)
    .on('set', function (value, callback) {
      request.post(platform.config.postUrl, {
        json: {
          bearerToken: platform.config.bearerToken,
          body: {
            action: "actuate",
            device: newAccessory.context.idFromConrad,
            property: "on_off",
            value: value
          }
        }
      }, (error, res, body) => {
        if (error) {
          platform.log(error)
          platform.log(`statusCode: ${res.statusCode}`)
          platform.log(body)
          return
        }
      });
      callback();
    });

  this.accessoriesList.push(newAccessory);
  this.api.registerPlatformAccessories("homebridge-conrad-connect", "ConradConnect", [newAccessory]);
}

// Sample function to show how developer can remove accessory dynamically from outside event
ConradConnect.prototype.removeAccessory = function () {
  this.log("Remove Accessory");
  this.api.unregisterPlatformAccessories("homebridge-conrad-connect", "ConradConnect", this.accessoriesList);

  this.accessoriesList = [];
}