import * as d3 from "d3";
import MyWorker = require("worker-loader?name=dist/[name].js!./worker");

const nRows = 40;
const nCols = 40;
const visWidth = 1000;
const visHeight = 1000;

const cellSize = visHeight / nRows;

const worker = new MyWorker();

const initialState = () => {
    let array: number[][] = [];

    const pAlive = 0.15;

    for (let i = 0; i < nRows; ++i) {
        array.push([] as number[]);

        for (let j = 0; j < nCols; ++j) {
            if (Math.random() < pAlive) {
                array[i].push(1);
            } else {
                array[i].push(0);
            }
        }
    }

    // Add a glider so something happens
    array[0][0] = 1;
    array[2][0] = 1;
    array[1][1] = 1;
    array[2][1] = 1;
    array[1][2] = 1;

    return array;
};

const render = (state: number[][]) => {
    const root = d3.select("#visRoot").select("svg");
    const transition = root.transition().duration(100);

    let rows = root
        .selectAll(".row")
        .data(state)
        .join(enter =>
            enter
                .append("g")
                .classed("row", true)
                .attr(
                    "transform",
                    (d: number[], i: number) => `translate(0, ${i * cellSize})`
                )
        );

    // TODO: Can we do an update "flash" with two transitions?

    let cells = rows
        .selectAll(".cell")
        .data(d => d)
        .join(
            enter =>
                enter
                    .append("rect")
                    .classed("cell", true)
                    .attr("width", cellSize)
                    .attr("height", cellSize)
                    .attr("fill", (d: number) => (d ? "red" : "black"))
                    .attr("stroke", "white")
                    .attr("stroke-width", 5)
                    .attr("x", (d: number, i: number) => i * cellSize),
            update =>
                update.call(update =>
                    update
                        .transition(transition)
                        .attr("fill", (d: number) => (d ? "red" : "black"))
                )
        );
};

const init = () => {
    d3.select("#visRoot")
        .append("svg")
        .attr("width", visWidth)
        .attr("height", visHeight);

    let state = initialState();

    // Initial render
    render(state);

    worker.onmessage = (ev: MessageEvent) => {
        if (ev.data.type == "newState") {
            console.log("Rendering a new state");

            render(ev.data.state);
        }
    };

    worker.postMessage({ type: "start", state: state });
};

document.addEventListener("DOMContentLoaded", init);
