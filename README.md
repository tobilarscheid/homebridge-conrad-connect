# homebridge-conrad-connect

This plugin makes all devices in your conradconnect.de account available in homekit on your iOS device. Currently restricted to lamps.

--> BILD

## Setup

1. Install `homebridge-conrad-connect` like you would install any other homebridge plugin:

```shell
npm install -g homebridge-conrad-connect
```

2. Go to conrad connect, install the homebridge-connector (LINK) service and click configure to retrieve `API url` and `bearer token`. These values are needed so homebridge can access your conrad connect account.

BILD?

3. Enter the values you just retrieved into your `config.json`, following the format given in [`config-sample.json`](config-sample.json):

```json
 "platforms": [
        {
            "platform": "conrad-connect-platform",
            "name": "conrad-connect",
            "bearerToken": "TOKEN-YOU-JUST-RETRIEVED",
            "postUrl": "URL-YOU-JUST-RETRIEVED"
        }
    ]
```
