// Downloads the anonymous chat samples people shared (admin only) so they can be reviewed, labelled and used to retrain.
// Usage: node tools/talk/pull.mjs   (needs ../../.agents/helper-admin.json with an admin login)
// Writes tools/talk/pulled.jsonl. Each line: { x, prev, act (what the model thought), conf, via, unsure }.
// To train on a sample, copy the line into tools/talk/real.jsonl with "y" set to the correct act, then run train.mjs.
// Samples with via:"chip" came from a tapped suggestion, so their act is a reliable label already.
import fs from "fs";
const cred = JSON.parse(fs.readFileSync(new URL("../../../.agents/helper-admin.json", import.meta.url), "utf8"));
const login = await fetch(cred.site + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: cred.username, password: cred.password }) }).then(r => r.json());
const res = await fetch(cred.site + "/api/admin-talk", { headers: { Authorization: "Bearer " + login.token } }).then(r => r.json());
fs.writeFileSync(new URL("./pulled.jsonl", import.meta.url), res.items.map(i => JSON.stringify(i)).join("\n") + "\n");
console.log("saved", res.items.length, "of", res.count, "samples");
