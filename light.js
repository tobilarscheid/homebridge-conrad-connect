var util = require('./util.js')
var request = require('request');

module.exports.builder = {
    createAccessory: function (device, UUIDGen, Accessory, Service) {
        var newAccessory = util.createAccessory(device, UUIDGen, Accessory);

        newAccessory.addService(Service.Lightbulb, device.name)

        newAccessory.context.characteristics = device.metadata.properties.map(c => c.name);

        return newAccessory;
    },
    configureCharacteristics: function (accessory, platform, Service, Characteristic) {
        var service = accessory.getService(Service.Lightbulb)
        accessory.context.characteristics.forEach(c => {
            switch (c) {
                case "on_off":
                    util.getOrAddCharacteristic(service, Characteristic.On)
                        .on('set', module.exports.onOff.bind({ platform: platform, accessory: accessory }));
                    break;
                case "brightness":
                    util.getOrAddCharacteristic(service, Characteristic.Brightness)
                        .on('set', module.exports.brightness.bind({ platform: platform, accessory: accessory }));
                    break;
                case "color":
                    break;
                default:
                    platform.log(`Accessory ${accessory.context.id} has unknown characteristic ${c} - ignoring!`);
            }
        })
    }
}

module.exports.onOff = function (value, callback) {
    var platform = this.platform;
    var accessory = this.accessory;

    platform.log(`setting value to ${value} for device ${accessory.context.idFromConrad}`);
    request.post(platform.config.postUrl, {
        json: {
            action: "actuate",
            device: accessory.context.idFromConrad,
            property: "on_off",
            value: value
        },
        headers: {
            'Authorization': `Bearer ${platform.config.bearerToken}`
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
}

module.exports.brightness = function (value, callback) {
    var platform = this.platform;
    var accessory = this.accessory;

    platform.log(`setting value to ${value} ${value / 100 * 255} for device ${accessory.context.idFromConrad}`);
    request.post(platform.config.postUrl, {
        json: {
            action: "actuate",
            device: accessory.context.idFromConrad,
            property: "brightness",
            value: value / 100 * 255
        },
        headers: {
            'Authorization': `Bearer ${platform.config.bearerToken}`
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
}