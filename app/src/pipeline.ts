import * as d3 from "d3";
import axios from "axios";
import { visWidth } from "./constants";
import { Config } from "./config";

type StepStatus = "done" | "notDone" | "dormant" | "inProgress";

interface GitCommit {
    hash: string;
    message: string;
}

interface Build {
    id: number;
    status: string;
}

export interface PipelineStatus {
    steps: {
        appCommit: StepStatus;
        ci: StepStatus;
        infraCommit: StepStatus;
    };
    appRepo: {
        starting: GitCommit;
        current: GitCommit;
    };
    infraRepo: {
        starting: GitCommit;
        current: GitCommit;
    };
    ciBuild: {
        starting: Build;
        current: Build;
    };
}

const getLatestCommit = async (
    url: string,
    branch = "master"
): Promise<GitCommit> => {
    const response = await axios.get(`${url}/commits`, {
        params: {
            sha: branch
        }
    });
    const latestCommit = response.data[0];
    return {
        hash: latestCommit.sha,
        message: latestCommit.message
    };
};

const getAppCommit = async (branch: string): Promise<GitCommit> => {
    return getLatestCommit(
        "https://api.github.com/repos/verifa/gitops-demo",
        branch
    );
};

const getInfraCommit = async (branch: string): Promise<GitCommit> => {
    return getLatestCommit(
        "https://api.github.com/repos/verifa/gitops-demo-infra",
        branch
    );
};

const getBuild = async (): Promise<Build> => {
    const response = await axios.get(
        "https://circleci.com/api/v1.1/project/gh/verifa/gitops-demo?limit=5"
    );

    let status = "";
    let buildNum = -1;

    for (const job of response.data) {
        if (job["workflows"]["jobName"] === "deploy") {
            status = job["status"];
            buildNum = job["build_num"];
            break;
        }
    }

    return {
        id: buildNum,
        status: status
    };
};

export const getPipelineData = async (
    config: Config,
    lastState?: PipelineStatus
): Promise<PipelineStatus> => {
    if (lastState === undefined) {
        const [appCommit, infraCommit, build] = await Promise.all([
            getAppCommit(config.appBranch),
            getInfraCommit(config.infraBranch),
            getBuild()
        ]);

        console.log("Initialising pipeline state");

        return {
            steps: {
                appCommit: "dormant",
                ci: "dormant",
                infraCommit: "dormant"
            },
            appRepo: {
                starting: appCommit,
                current: appCommit
            },
            infraRepo: {
                starting: infraCommit,
                current: infraCommit
            },
            ciBuild: {
                starting: build,
                current: build
            }
        };
    }

    const newState = Object.assign({}, lastState);

    if (newState.steps.appCommit != "done") {
        const latestCommit = await getAppCommit(config.appBranch);

        console.log("Got latest app commit");

        if (latestCommit.hash !== newState.appRepo.starting.hash) {
            console.log(`Found new app commit: ${latestCommit.hash}`);

            newState.steps.appCommit = "done";
            newState.steps.infraCommit = "notDone";
            newState.steps.ci = "notDone";

            newState.appRepo.current = latestCommit;
        }
    }

    if (newState.steps.appCommit != "dormant") {
        if (newState.steps.ci != "done") {
            const latestBuild = await getBuild();

            console.log("Got latest ci build");

            if (status === "queued" || status === "running") {
                status = "inProgress";
            } else if (status === "failed") {
                status = "done";
            }

            if (latestBuild.id != newState.ciBuild.current.id) {
                if (
                    latestBuild.status === "success" ||
                    latestBuild.status === "failed"
                ) {
                    newState.steps.ci = "done";
                } else if (
                    latestBuild.status === "queued" ||
                    latestBuild.status === "running"
                ) {
                    newState.steps.ci = "inProgress";
                }
            }
        }

        if (
            newState.steps.ci == "done" &&
            newState.steps.infraCommit != "done"
        ) {
            const latestInfra = await getInfraCommit(config.infraBranch);

            console.log("Got latest infra commit");

            if (latestInfra.hash !== newState.infraRepo.starting.hash) {
                newState.steps.infraCommit = "done";

                newState.infraRepo.current = latestInfra;
            }
        }
    }

    return newState;
};

const wrap = (text: any, width: number): void => {
    text.each(function() {
        // @ts-ignore
        const text = d3.select(this),
            words = text
                .text()
                .split(/\s+/)
                .reverse(),
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy"));

        let word,
            lineNumber = 0,
            line: string[] = [],
            tspan = text
                .text(null)
                .append("tspan")
                .attr("x", 0)
                .attr("y", y)
                .attr("dy", dy + "em");

        while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node()!.getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text
                    .append("tspan")
                    .attr("x", 0)
                    .attr("y", y)
                    .attr("dy", ++lineNumber * lineHeight + dy + "em")
                    .text(word);
            }
        }
    });
};

export const updatePipelineVis = (data: PipelineStatus): void => {
    const formattedData = [
        {
            label: "App repo commit",
            status: data.steps.appCommit,
            message: data.appRepo.current.hash
        },
        {
            label: "CI build",
            status: data.steps.ci,
            message: data.ciBuild.current.id.toString()
        },
        {
            label: "Infra repo commit",
            status: data.steps.infraCommit,
            message: data.infraRepo.current.hash
        }
    ];

    const pipelineWidth = visWidth;
    const circleRadius = 60;

    const wrapWidth = 100;

    const colourMap = new Map<StepStatus, string>([
        ["done", "green"],
        ["notDone", "red"],
        ["dormant", "grey"],
        ["inProgress", "orange"]
    ]);

    const dormantTransparency = 0.2;

    const pipeline = d3
        .select("#pipeline")
        .selectAll("g")
        .data(formattedData);

    const pipelineEnter = pipeline.enter();

    pipelineEnter
        .append("g")
        .attr(
            "transform",
            (_, i) =>
                `translate(${(i / (formattedData.length - 1)) *
                    (pipelineWidth - circleRadius * 2) +
                    circleRadius}, ${circleRadius / 2})`
        )
        .filter((_, i) => i < formattedData.length - 1)
        .append("line")
        .attr("x1", 0)
        .attr("y1", circleRadius / 2)
        .attr(
            "x2",
            (pipelineWidth - circleRadius * 2) / (formattedData.length - 1)
        )
        .attr("y2", circleRadius / 2)
        .attr("stroke", d => colourMap.get(d.status)!)
        .attr("stroke-width", 25);

    pipelineEnter
        .selectAll("g")
        .append("circle")
        .classed("backingCircle", true)
        .attr("fill", "#262e41")
        .attr("r", circleRadius)
        .attr("cy", 30);

    pipelineEnter
        .selectAll("g")
        .append("circle")
        .classed("statusCircle", true)
        .attr("fill", (d: any) => colourMap.get(d.status)!)
        .attr("opacity", (d: any) =>
            d.status == "dormant" ? dormantTransparency : 1
        )
        .attr("r", circleRadius)
        .attr("cy", 30);

    pipelineEnter
        .selectAll("g")
        .append("text")
        .attr("dy", 0)
        .attr("y", 20)
        .attr("font-size", "16pt")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("opacity", (d: any) =>
            d.status == "dormant" ? dormantTransparency : 1
        )
        .text((d: any) => d.label)
        .call(wrap, wrapWidth);

    // TODO: Remove triplicate circles

    pipelineEnter
        .selectAll("g")
        .append("text")
        .attr("dy", 0)
        .attr("y", circleRadius * 1.9)
        .attr("font-size", "12pt")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "white")
        .text((d: any) => d.message);

    pipeline
        .select(".statusCircle")
        .transition()
        .duration(750)
        .attr("fill", d => colourMap.get(d.status)!)
        .attr("opacity", (d: any) =>
            d.status == "dormant" ? dormantTransparency : 1
        );

    pipeline
        .select("text")
        .attr("opacity", (d: any) =>
            d.status == "dormant" ? dormantTransparency : 1
        );

    pipeline
        .select("line")
        .transition()
        .duration(750)
        .attr("stroke", d => colourMap.get(d.status)!);
};
