var request = require('request');

module.exports.createAccessory = function (device, UUIDGen, Accessory) {
    uuid = UUIDGen.generate(device.name);
    var newAccessory = new Accessory(device.name, uuid);
    newAccessory.context.idFromConrad = device.id
    newAccessory.context.type = device.metadata.types[0];
    newAccessory.context.characteristics = device.metadata.properties;
    return newAccessory;
}

module.exports.getOrAddCharacteristic = function(service, characteristic) {
    var result = service.getCharacteristic(characteristic);
    if (result == null) {
        result = service.addCharacteristic(characteristic);
    }
    return result;
}

module.exports.getStatus = function (callback) {
    var platform = this.platform;
    var accessory = this.accessory;
    var property = this.property;

    platform.log(`getting value for device ${accessory.context.idFromConrad}`);
    request.post(platform.config.postUrl, {
        json: {
            action: "status",
            device: accessory.context.idFromConrad,
            property: property
        },
        headers: {
            'Authorization': `Bearer ${platform.config.bearerToken}`
        }
    }, (error, res, body) => {
        if (error || !body.result || !body.result.value) {
            platform.log(error)
            platform.log(`statusCode: ${res.statusCode}`)
            platform.log(body)
            callback(error);
            return;
        }
        callback(null, body.result.value);
    });
}