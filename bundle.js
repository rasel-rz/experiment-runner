!(() => {
    function injectStyle(src) {
        if (!src) return console.log("No style source provided");
        document.querySelectorAll("#exp-runner-style").forEach((el) => el.remove());
        const style = document.createElement("link");
        style.rel = "stylesheet";
        style.id = "exp-runner-style";
        style.href = src;
        document.head.append(style);
    }

    const path = "http://localhost:{{server_port}}/variation";
    const script = document.createElement("script");
    script.src = path + ".js";
    document.head.append(script);
    injectStyle(path + ".css");
    const socket = new WebSocket("ws://localhost:{{ws_port}}");
    socket.addEventListener("message", (res) => {
        const data = JSON.parse(res.data);
        if (data.event !== "change") return;
        if (!data.filename) return;
        if (data.filename.match(/\.scss$/i)) return injectStyle(path + ".css");
        window.location.reload();
    });
})();