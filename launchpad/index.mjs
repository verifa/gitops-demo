import { writeFile, readFileSync } from "fs";
import Launchpad from "launchpad-mini";
import { default as words } from "random-words";
import { spawnSync, exec } from "child_process";

const args = process.argv.slice(2);

const outputFileName = args[0];
const doGitCommit = args[1] === "true";

console.log(`Will write output to ${outputFileName}`);
console.log(`Will ${doGitCommit ? "" : "not "}do git commits`);

const pad = new Launchpad();
const keys = new Map();

const gridFromKeys = keys => {
    return Array.from(keys.values()).map(el => [el.x, el.y]);
};

const writeConfig = keys => {
    const config = JSON.parse(readFileSync(outputFileName, "utf8"));

    config.config.initialAlive = gridFromKeys(keys);

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
        exec("git config user.email launchpad@verifa.io");
        exec('git config user.name "John Launchpad"');

        // const out = spawnSync("git", cmd., { shell: true });
        exec(cmd, (err, stdout, stderr) => {
            console.log(err);
            console.log(stdout);
            console.log(stderr);
        });
        // console.log(out.stderr.toString());
        // console.log(out.stdout.toString());
        // console.log(`Ran command: git ${cmd.join(" ")}`);
        console.log(`Ran command: ${cmd}`);
    } else {
        console.log(`Would have run command: ${cmd}`);
    }
};

const commit = () => {
    const commitMessage = words({
        exactly: 3,
        join: " "
    });
    // const commitCommand = ["commit", "-a", "-m", `"${commitMessage}"`];
    const commitCommand = `git commit -a -m "${commitMessage}"`;

    runGitCommand(commitCommand);

    // const pushCommand = ["push"];
    const pushCommand = "git push";

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
