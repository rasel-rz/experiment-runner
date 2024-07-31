# experiment-runner
Develop and run web experiments locally!

Run `npm i` to install dependencies.

To start, run `npm start`. For dev mode, run `npm run dev`.

To select a variation or create a new one, run `npm run select`.

The following script should be added to your site to run the experiment. You can do that using different extension like [TamperMonkey](https://www.tampermonkey.net/) or [User JS & CSS](https://tenrabbits.github.io/user-js-css-docs/).

```
!(() => {
    const path = "http://localhost:3001/variation";
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = path + ".css";
    const script = document.createElement("script");
    script.src = path + ".js";
    document.head.append(style, script);
})();
```