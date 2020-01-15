import { writeFile } from "fs";
import Launchpad from "launchpad-mini";
import { default as words } from "random-words";
import { spawnSync } from "child_process";

const args = process.argv.slice(2);

const outputFileName = args[0];
const doGitCommit = args[1] === "true";

console.log(`Will write output to ${outputFileName}`);
console.log(`Will ${doGitCommit ? "" : "not "}do git commits`);

const pad = new Launchpad();
const keys = new Map();
const aliveColour = "#262f42";

const gridFromKeys = keys => {
    return Array.from(keys.values()).map(el => [el.x, el.y]);
};

const writeConfig = keys => {
    const config = JSON.parse(fs.readFileSync(outputFileName, "utf8"));

    Object.assign(config, {
        config: {
            colours: {
                alive: aliveColour,
                dead: "#fefefe"
            },
            initialAlive: gridFromKeys(keys)
        }
    });

    writeFile(outputFileName, JSON.stringify(config, null, 4), err => {
        if (err) {
            return console.log(err);
        }
        console.log("Wrote config");
        commit();
        reset();
    });
};

const runGitCommand = cmd => {
    if (doGitCommit) {
        spawnSync("git", cmd);
        console.log(`Ran command: git ${cmd.join(" ")}`);
    } else {
        console.log(`Would have run command: git ${cmd.join(" ")}`);
    }
};

const commit = () => {
    const commitMessage = words({
        exactly: 3,
        join: " "
    });
    const commitCommand = ["commit", "-a", "-m", `"${commitMessage}"`];

    runGitCommand(commitCommand);

    const pushCommand = ["push"];

    runGitCommand(pushCommand);
};

const reset = () => {
    pad.reset(pad.off); // Turn everything off

    pad.col(pad.green, [0, 8]);
    pad.col(pad.red, [1, 8]);

    pad.col(pad.amber, [8, 8]);

    keys.clear();
};

pad.connect().then(() => {
    reset();

    pad.on("key", k => {
        if (k.pressed) {
            if (k.x == 8) {
                // scene buttons
            } else if (k.y == 8) {
                // top row
                if (k.x == 0) {
                    writeConfig(keys);
                } else if (k.x == 1) {
                    reset();
                }
            } else {
                if (keys.has(k.id)) {
                    keys.delete(k.id);
                    pad.col(pad.off, k);
                } else {
                    keys.set(k.id, k);
                    pad.col(pad.amber, k);
                }
            }
        }
    });
});
