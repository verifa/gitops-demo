import * as d3 from "d3";
import MyWorker = require("worker-loader?name=dist/[name].js!./worker");

const nRows = 50;
const nCols = 50;
const visWidth = 900;
const visHeight = 900;

const cellSize = visHeight / nRows;

const worker = new MyWorker();

const initialState = () => {
    let array: number[][] = [];

    const pAlive = 0.01;

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

    return array;
};

const render = (state: number[][]) => {
    const root = d3.select("#visRoot").select("svg");

    const rows = root.selectAll("g").data(state);

    rows.exit().remove();

    rows.enter()
        .append("g")
        .attr(
            "transform",
            (d: number[], i: number) => `translate(0, ${i * cellSize})`
        );

    const cols = rows.selectAll("rect").data((d: number[]) => d);

    cols.exit().remove();
    cols.enter()
        .append("rect")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", (d: number) => (d ? "red" : "black"))
        .attr("stroke", "white")
        .attr("stroke-width", 5)
        .attr("x", (d: number, i: number) => i * cellSize);

    cols.transition()
        .duration(500)
        .attr("fill", (d: number) => (d ? "red" : "black"));
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
