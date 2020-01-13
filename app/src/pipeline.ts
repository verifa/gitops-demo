import * as d3 from "d3";

interface PipelineStatus {
    appCommit: boolean;
    ciFinished: boolean;
    infraCommit: boolean;
}

export const getPipelineData = () => {
    // TODO: Get all data we need to determine pipeline status
    // TODO: Get commit from app repo
    // TODO: Get CI status from circle CI
    // TODO: Get infra repo commit

    return {
        appCommit: Math.random() < 0.5 ? true : false,
        ciFinished: true,
        infraCommit: false
    };
};

function wrap(text: any, width: any) {
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
}

export const updatePipelineVis = (data: PipelineStatus) => {
    const formattedData = [
        { label: "App repo commit", status: data.appCommit },
        { label: "CI build", status: data.ciFinished },
        { label: "Infra repo commit", status: data.infraCommit }
    ];

    const pipelineWidth = 500;
    const circleRadius = 60;

    const wrapWidth = 100;

    d3.select("#pipeline")
        .selectAll("g")
        .data(formattedData)
        .join(
            enter => {
                enter
                    .append("g")
                    .attr(
                        "transform",
                        (_, i) =>
                            `translate(${(i / formattedData.length) *
                                pipelineWidth}, ${circleRadius / 2})`
                    )
                    .append("circle")
                    .attr("fill", d => (d.status ? "red" : "green"))
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
                    .text((d: any) => d.label)
                    .call(wrap, wrapWidth);

                return enter;
            },

            update =>
                update
                    .select("circle")
                    .attr("fill", d => (d.status ? "red" : "green"))
        );
};
