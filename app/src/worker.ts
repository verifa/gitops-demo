const ctx: Worker = self as any;

let shouldStop = false;

const nextState = (state: number[][]): number[][] => {
    let array: number[][] = [];

    const countLiveNeighbours = (i: number, j: number) => {
        let count = 0;

        for (let iOffset of [-1, 0, 1]) {
            let i2 = i + iOffset;

            // Wrap rows
            if (i2 < 0) {
                i2 += state.length;
            } else if (i2 >= state.length) {
                i2 -= state.length;
            }

            for (let jOffset of [-1, 0, 1]) {
                if (iOffset == 0 && jOffset == 0) {
                    continue;
                }

                let j2 = j + jOffset;

                // Wrap cols
                if (j2 < 0) {
                    j2 += state[i2].length;
                } else if (j2 >= state[i2].length) {
                    j2 -= state.length;
                }

                count += state[i2][j2];
            }
        }

        return count;
    };

    for (let i = 0; i < state.length; ++i) {
        array.push([] as number[]);

        for (let j = 0; j < state[i].length; ++j) {
            const liveNeighbours = countLiveNeighbours(i, j);

            if (state[i][j]) {
                if (liveNeighbours == 2 || liveNeighbours == 3) {
                    array[i].push(1);
                } else {
                    array[i].push(0);
                }
            } else {
                if (liveNeighbours == 3) {
                    array[i].push(1);
                } else {
                    array[i].push(0);
                }
            }
        }
    }

    return array;
};

const mainLoop = async (state: number[][]) => {
    const minTimeBetweenFrames = 500;

    while (!shouldStop) {
        let lastUpdate = Date.now();

        state = nextState(state);

        ctx.postMessage({ type: "newState", state: state });

        // Wait until we are allowed to update again
        while (Date.now() < lastUpdate + minTimeBetweenFrames) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
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
