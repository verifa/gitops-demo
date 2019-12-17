import * as d3 from "d3";

const nRows = 50;
const nCols = 50;
const visWidth = 900;
const visHeight = 900;

const cellSize = visHeight / nRows;

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

const render = (
    root: d3.Selection<SVGSVGElement, any, any, any>,
    state: number[][]
) => {
    root.selectAll("g")
        .data(state) // rows
        .enter()
        .append("g")
        .attr(
            "transform",
            (d: number[], i: number) => `translate(0, ${i * cellSize})`
        )
        .selectAll("rect")
        .data((d: number[]) => d) // cols
        .enter()
        .append("rect")
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", (d: number) => (d ? "red" : "black"))
        .attr("stroke", "white")
        .attr("stroke-width", 5)
        .attr("x", (d: number, i: number) => i * cellSize);
};

const init = () => {
    const root = d3.select("#visRoot");

    const svg = root
        .append("svg")
        .attr("width", visWidth)
        .attr("height", visHeight);

    let state = initialState();

    render(svg, state);
};

document.addEventListener("DOMContentLoaded", init);
