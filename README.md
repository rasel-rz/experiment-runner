# experiment-runner
Develop and run web experiments locally!

## Installation
Run `npm i` to install dependencies.

To start, run `npm start`. For dev mode, run `npm run dev`.

To select a variation or create a new one, run `npm run select`.

The following script should be added to your site to run the experiment. You can do that using different extension like [TamperMonkey](https://www.tampermonkey.net/) or [User JS & CSS](https://tenrabbits.github.io/user-js-css-docs/).

```
!(() => {
    const script = document.createElement("script");
    script.src = "http://localhost:3001/experiment-runner.js";
    document.head.append(script);
})();
```
That's the basic of it!!

## Testing across multiple devices on your network
To make the script available to your local network (so that you can test on different devices connected to your local network),
we will need to enable HTTPS on our server. Then save a [Bookmarklet](https://en.wikipedia.org/wiki/Bookmarklet) on our devices that doesn't have developer console i.e. mobile/tablet etc.

### Enabling SSL
To do that, you can use the environment variable `PROTOCOL` like the following:
```
PROTOCOL=https
```
Then you will have to generate SSL Certificates and decrypt them so that the server can use them. You can do that using the following commands.
```
openssl req -x509 -newkey rsa:2048 -keyout keytmp.pem -out cert.pem -days 365
```
This will create encrypted keys and certificates in your project directory. Then run the following command to decrypt the key.
```
openssl rsa -in keytmp.pem -out key.pem
```
Now you can run the project using `npm start` and you'll have SSL enabled server listening on defined port. Don't forget to update the script on  [TamperMonkey](https://www.tampermonkey.net/) or [User JS & CSS](https://tenrabbits.github.io/user-js-css-docs/) like the following:
```
!(() => {
    const script = document.createElement("script");
    script.src = "https://localhost:3001/experiment-runner.js";
    document.head.append(script);
})();
```

### Creating the Bookmarklet
Before we start, we need to find out which IPv4 Address we are connected to on our local network. You can find it by running the following command on console.
```
ipconfig
```
It will be similar to `192.168.0.101`.

Now replace the IPv4 address with your own on the following code and save it as Bookmark on your browser.
```
javascript:(function(){const e=document.createElement("script");e.src="https://192.168.0.101:3001/experiment-test.js",e.onload=function(){alert("Experiment runner loaded!")},document.head.append(e)})();
```

To test your code on mobile devices, go to your website, then open the address bar on your browser, search for the name of your bookmarklet and click on it. That will run the code on your mobile devices and if the run is successful, you should get an alert like the following.
```
Experiment runner loaded!
```
If you don't have the alert, it's most probably that the browser doesn't know the SSL certificates we generated. To bypass that, visit the following links (replace the IPv4 with your own) and proceed ingoring the browser warning.
```
https://192.168.0.101
https://192.168.0.101/experiment-test.js
https://192.168.0.101/variation.js
https://192.168.0.101/variation.css
```
Reload the page and now running the Bookmarklet should run the code. Thanks.
