const SpeedEditor = require('./SpeedEditor');
var se = new SpeedEditor();

// 27: "Timeline",
// 		28: "Shuttle",
// 		29: "Jog",
se.on("keydown", (data) => {
    console.log("Keydown:", data);
    switch (data.keyName) {
        case "Shuttle":
            se.setJogMode(SpeedEditor.jogMode.relative);
            se.setLight(true, SpeedEditor.leds.shtl);
            se.setLight(false, SpeedEditor.leds.jog, SpeedEditor.leds.scrl);
            break;
        case "Jog":
            se.setJogMode(SpeedEditor.jogMode.absoluteContinuous);
            se.setLight(true, SpeedEditor.leds.jog);
            se.setLight(false, SpeedEditor.leds.shtl, SpeedEditor.leds.scrl);
            break;
        case "Scroll":
            se.setJogMode(SpeedEditor.jogMode.raw);
            se.setLight(true, SpeedEditor.leds.scrl);
            se.setLight(false, SpeedEditor.leds.shtl, SpeedEditor.leds.jog);
            break;
        default:
            break;
    }
    // if (data.keyName === "Timeline") {

    // } else 
    // const led = se.getLight(data.keyCode);
    // se.setLight(!led, data.keyCode);
});

se.setLight(true, SpeedEditor.leds.jog);
se.on("jog", (data) => {
    console.log("Jog:", data);
});

