import * as d3 from "d3";
import MyWorker = require("worker-loader?name=dist/[name].js!./worker");
import { loadConfig, Config } from "./config";
import { updatePipelineVis, getPipelineData, PipelineStatus } from "./pipeline";
import { visHeight, visWidth, nRows, nCols } from "./constants";

const cellSize = {
    width: visWidth / nCols,
    height: visHeight / nRows
};

const worker = new MyWorker();

const initialState = (aliveIndices: number[][]) => {
    let array: number[][] = [];

    const configLowerCorner = {
        x: 15,
        y: 20
    };

    for (let i = 0; i < nRows; ++i) {
        array.push([] as number[]);

        for (let j = 0; j < nCols; ++j) {
            array[i].push(0);
        }
    }

    for (let livingIndex of aliveIndices) {
        array[configLowerCorner.y - livingIndex[1]][
            configLowerCorner.x + livingIndex[0]
        ] = 1;
    }

    return array;
};

const render = (state: number[][], config: Config) => {
    const root = d3.select("#visRoot").select("svg");
    const transition = root.transition().duration(250);

    let rows = root
        .selectAll(".row")
        .data(state)
        .join(enter =>
            enter
                .append("g")
                .classed("row", true)
                .attr(
                    "transform",
                    (d: number[], i: number) =>
                        `translate(0, ${i * cellSize.height})`
                )
        );

    const baseColour = config.colours.dead;
    const liveColour = config.colours.alive;

    rows.selectAll(".cell")
        .data(d => d)
        .join(
            enter =>
                enter
                    .append("rect")
                    .classed("cell", true)
                    .attr("width", cellSize.width)
                    .attr("height", cellSize.height)
                    .attr("fill", (d: number) => (d ? liveColour : baseColour))
                    .attr("stroke", baseColour)
                    .attr("stroke-width", 5)
                    .attr("x", (d: number, i: number) => i * cellSize.width),
            update =>
                update.call(update =>
                    update
                        .transition(transition)
                        .attr("fill", (d: number) =>
                            d ? liveColour : baseColour
                        )
                )
        );
};

const setTimer = (count: number) => {
    d3.select("#visRoot")
        .select("svg")
        .transition()
        .duration(750)
        .tween(
            "attr.opacity",
            () =>
                function setter(t: number) {
                    // @ts-ignore
                    this.setAttribute(
                        "fill-opacity",
                        1 - Math.sin(t * Math.PI)
                    );
                }
        );
};

const init = () => {
    const mainVis = d3
        .select("#visRoot")
        .append("svg")
        .attr("width", visWidth)
        .attr("height", visHeight);

    // Add a border
    const borderOffset = 10;
    mainVis
        .append("rect")
        .attr("x", -borderOffset)
        .attr("y", -borderOffset)
        .attr("height", visHeight + borderOffset * 2)
        .attr("width", visWidth + borderOffset * 2)
        .attr("stroke", "#000000")
        .attr("fill", "none");

    d3.select("#topPanel")
        .append("svg")
        .attr("height", 125)
        .append("text")
        .attr("x", "50%")
        .attr("y", "50%")
        .attr("font-size", "36pt")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("id", "countDown")
        .attr("fill", "#000000");

    d3.select("#topPanel")
        .select("svg")
        .attr("width", visWidth)
        .append("g")
        .attr("id", "pipeline");

    let pipelineStatus: PipelineStatus | undefined = undefined;

    loadConfig().then(config => {
        let state = initialState(config.initialAlive);

        worker.onmessage = (ev: MessageEvent) => {
            if (ev.data.type == "newState") {
                console.log("Rendering a new state");

                render(ev.data.state, config);
            }
        };

        const refreshCheckTimeout = 2000;

        const checkShouldRefresh = async () => {
            // Never reload if config connection failed
            if (!config.connected) return false;

            // Check if config has changed
            loadConfig().then(latestConfig => {
                if (JSON.stringify(config) !== JSON.stringify(latestConfig)) {
                    // Config has changed, must refresh
                    console.log("Config changed, refreshing...");
                    window.location.reload();
                }
            });

            setTimeout(checkShouldRefresh, refreshCheckTimeout);
        };

        setTimeout(checkShouldRefresh, refreshCheckTimeout);

        const slowPipelineUpdate = 1000;
        const fastPipelineUpdate = 500;

        const updatePipeline = () => {
            getPipelineData(config, pipelineStatus).then(
                (data: PipelineStatus) => {
                    updatePipelineVis(data);
                    pipelineStatus = data;

                    const pipelineUpdateTimeout =
                        pipelineStatus.steps.appCommit == "dormant"
                            ? slowPipelineUpdate
                            : fastPipelineUpdate;

                    setTimeout(updatePipeline, pipelineUpdateTimeout);
                }
            );
        };

        updatePipeline();

        // Initial render
        render(state, config);

        const initialDelay = 5000;

        const countDown = (count: number, final: () => void | null) => {
            setTimer(count / 1000);

            if (count > 0) {
                count = count - 1000;
                setTimeout(() => countDown(count, final), 1000);
            } else {
                if (final) final();
            }
        };

        countDown(initialDelay, () => {
            worker.postMessage({ type: "start", state: state });
        });
    });
};

document.addEventListener("DOMContentLoaded", init);
