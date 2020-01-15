import * as d3 from "d3";
import axios from "axios";

type StepStatus = "done" | "notDone" | "dormant";

interface GitCommit {
    hash: string;
    message: string;
}

interface Build {
    id: number;
    status: string;
}

export interface PipelineStatus {
    appCommit: StepStatus;
    ci: StepStatus;
    infraCommit: StepStatus;
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

const getLatestCommit = async (url: string): Promise<GitCommit> => {
    const response = await axios.get(`${url}/commits`);
    const latestCommit = response.data[0];
    return {
        hash: latestCommit.sha,
        message: latestCommit.message
    };
};

const getAppCommit = async () => {
    return getLatestCommit("https://api.github.com/repos/verifa/gitops-demo");
};

const getInfraCommit = async () => {
    return getLatestCommit(
        "https://api.github.com/repos/verifa/gitops-demo-infra"
    );
};

const getBuild = async (): Promise<Build> => {
    const response = await axios.get(
        "https://circleci.com/api/v1.1/project/gh/verifa/gitops-demo?limit=1"
    );

    const lastBuild = response.data[0];

    const status = lastBuild["status"];
    const buildNum = lastBuild["build_num"];

    // TODO: What happens if the build is running but not complete?

    return {
        id: buildNum,
        status: status
    };
};

export const getPipelineData = async (
    lastState?: PipelineStatus
): Promise<PipelineStatus> => {
    // TODO: Make branch to inspect configurable?

    if (lastState === undefined) {
        const [appCommit, infraCommit, build] = await Promise.all([
            getAppCommit(),
            getInfraCommit(),
            getBuild()
        ]);

        return {
            appCommit: "dormant",
            ci: "dormant",
            infraCommit: "dormant",
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

    if (newState.appCommit != "done") {
        const latestCommit = await getAppCommit();
        if (latestCommit.hash !== newState.appRepo.starting.hash) {
            newState.appCommit = "done";
            newState.infraCommit = "notDone";
            newState.ci = "notDone";

            newState.appRepo.current = latestCommit;
        }
    }

    if (newState.appCommit != "dormant") {
        if (newState.ci != "done") {
            const latestBuild = await getBuild();

            if (
                latestBuild.id != newState.ciBuild.current.id &&
                latestBuild.status == "success"
            ) {
                newState.ci = "done";
            }
        }

        if (newState.ci == "done" && newState.infraCommit != "done") {
            const latestInfra = await getInfraCommit();

            if (latestInfra.hash !== newState.infraRepo.starting.hash) {
                newState.infraCommit = "done";

                newState.infraRepo.current = latestInfra;
            }
        }
    }

    return newState;
};

const wrap = (text: any, width: number) => {
    text.each(function() {
        // @ts-ignore
        let text = d3.select(this),
            words = text
                .text()
                .split(/\s+/)
                .reverse(),
            word,
            line: string[] = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
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

export const updatePipelineVis = (data: PipelineStatus) => {
    const formattedData = [
        { label: "App repo commit", status: data.appCommit },
        { label: "CI build", status: data.ci },
        { label: "Infra repo commit", status: data.infraCommit }
    ];

    const pipelineWidth = 1000;
    const circleRadius = 60;

    const wrapWidth = 100;

    const colourMap = new Map<StepStatus, string>([
        ["done", "green"],
        ["notDone", "red"],
        ["dormant", "grey"]
    ]);

    const dormantTransparency = 0.2;

    d3.select("#pipeline")
        .selectAll("g")
        .data(formattedData)
        .join(
            enter => {
                enter
                    .append("g")
                    .filter((_, i) => i < formattedData.length - 1)
                    .append("line")
                    .attr("x1", 0)
                    .attr("y1", circleRadius / 2)
                    .attr(
                        "x2",
                        (pipelineWidth - circleRadius * 2) /
                            (formattedData.length - 1)
                    )
                    .attr("y2", circleRadius / 2)
                    .attr("stroke", d => colourMap.get(d.status)!)
                    .attr("stroke-width", 25);

                enter
                    .selectAll("g")
                    .attr(
                        "transform",
                        (_, i) =>
                            `translate(${(i / (formattedData.length - 1)) *
                                (pipelineWidth - circleRadius * 2) +
                                circleRadius}, ${circleRadius / 2})`
                    )
                    .append("circle")
                    .attr("fill", "#262e41")
                    .attr("r", circleRadius)
                    .attr("cy", 30);

                enter
                    .selectAll("g")
                    .attr(
                        "transform",
                        (_, i) =>
                            `translate(${(i / (formattedData.length - 1)) *
                                (pipelineWidth - circleRadius * 2) +
                                circleRadius}, ${circleRadius / 2})`
                    )
                    .append("circle")
                    .attr("fill", (d: any) => colourMap.get(d.status)!)
                    .attr("opacity", (d: any) =>
                        d.status == "dormant" ? dormantTransparency : 1
                    )
                    .attr("r", circleRadius)
                    .attr("cy", 30);

                enter
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

                return enter;
            },
            update =>
                update
                    .select("circle")
                    .attr("fill", d => colourMap.get(d.status)!)
                    .attr("opacity", d =>
                        d.status == "dormant" ? dormantTransparency : 1
                    )
        );
};
