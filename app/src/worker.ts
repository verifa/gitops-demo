const ctx: Worker = self as any;

let shouldStop = false;

const nextState = (state: number[][]): number[][] => {
    // TODO: Add actual algorithm
    let array: number[][] = [];

    for (let i = 0; i < state.length; ++i) {
        array.push([] as number[]);

        for (let j = 0; j < state[i].length; ++j) {
            // Flip state for now
            if (state[i][j]) {
                array[i].push(0);
            } else {
                array[i].push(1);
            }
        }
    }

    return array;
};

const mainLoop = (state: number[][]) => {
    const minTimeBetweenFrames = 1000;

    while (!shouldStop) {
        let lastUpdate = Date.now();

        state = nextState(state);

        ctx.postMessage({ type: "newState", state: state });

        // Wait until we are allowed to update again
        while (Date.now() < lastUpdate + minTimeBetweenFrames) {}
    }
};

// Respond to message from parent thread
ctx.addEventListener("message", event => {
    if (event.data.type == "start") {
        console.log("Starting work");
        mainLoop(event.data.state);
    } else if (event.data.type == "stop") {
        console.log("Stopping work");
        shouldStop = false;
    }
});
