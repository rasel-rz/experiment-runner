# experiment-runner
Develop and run web experiments locally!

### Installation
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