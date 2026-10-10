import { describe, expect, it } from "@jest/globals";
import {
  ActiveTask,
  applyTaskEvent,
  bindTask,
  failTask,
  settleFromTasks,
  startTask,
  statusForKind,
} from "../activeTasks";

const started = (): ActiveTask[] => startTask([], "ref", "Replyer");
const bound = () => bindTask(started(), "ref", { id: "t1", isDone: false, latestEventKind: "QUEUED" });
const statusOf = (tasks: ActiveTask[]) => tasks[0].status;

describe("the replyer pill", () => {
  it("settles on every terminal kind", () => {
    expect(statusForKind("COMPLETED")).toBe("DONE");
    expect(statusForKind("CANCELLED")).toBe("CANCELLED");
    expect(statusForKind("INTERRUPTED")).toBe("CANCELLED");
    expect(statusForKind("FAILED")).toBe("ERROR");
    expect(statusForKind("CRITICAL")).toBe("ERROR");
    expect(statusForKind("LOST")).toBe("ERROR");
    expect(statusForKind("PROGRESS")).toBe("RUNNING");
    expect(statusForKind("CANCELLING")).toBe("RUNNING");
  });

  it("starts pending and runs once its task is known", () => {
    expect(statusOf(started())).toBe("PENDING");
    expect(bound()[0]).toMatchObject({ id: "t1", status: "RUNNING" });
  });

  it("follows progress, then settles", () => {
    let tasks = applyTaskEvent(bound(), { task: "t1", kind: "PROGRESS", progress: 40, message: "Thinking" });
    expect(tasks[0]).toMatchObject({ status: "RUNNING", progress: 40, message: "Thinking" });
    tasks = applyTaskEvent(tasks, { task: "t1", kind: "COMPLETED" });
    expect(tasks[0]).toMatchObject({ status: "DONE", progress: 40, message: "Thinking" });
  });

  it("ignores events of other tasks, and events before it knows its task", () => {
    expect(applyTaskEvent(bound(), { task: "t2", kind: "FAILED" })[0].status).toBe("RUNNING");
    expect(applyTaskEvent(started(), { task: "", kind: "FAILED" })[0].status).toBe("PENDING");
  });

  it("never goes back once settled", () => {
    const done = applyTaskEvent(bound(), { task: "t1", kind: "COMPLETED" });
    expect(statusOf(applyTaskEvent(done, { task: "t1", kind: "LOG" }))).toBe("DONE");
    expect(statusOf(bindTask(done, "ref", { id: "t1", isDone: false, latestEventKind: "QUEUED" }))).toBe("DONE");
    expect(statusOf(failTask(done, "ref", "late"))).toBe("DONE");
  });

  it("settles on binding when the task already ended", () => {
    expect(statusOf(bindTask(started(), "ref", { id: "t1", isDone: true, latestEventKind: "COMPLETED" }))).toBe("DONE");
    expect(statusOf(bindTask(started(), "ref", { id: "t1", isDone: true, latestEventKind: "PROGRESS" }))).toBe("DONE");
    expect(statusOf(bindTask(started(), "ref", { id: "t1", isDone: false, latestEventKind: "FAILED" }))).toBe("ERROR");
  });

  it("fails with the reason when the assign is refused", () => {
    expect(failTask(started(), "ref", "No agent")[0]).toMatchObject({ status: "ERROR", message: "No agent" });
  });

  it("settles from the tasks themselves, and only then makes a new array", () => {
    const tasks = bound();
    expect(settleFromTasks(tasks, [{ id: "t1", isDone: false, latestEventKind: "PROGRESS" }])).toBe(tasks);
    expect(settleFromTasks(tasks, [{ id: "other", isDone: true, latestEventKind: "COMPLETED" }])).toBe(tasks);
    expect(statusOf(settleFromTasks(tasks, [{ id: "t1", isDone: true, latestEventKind: "COMPLETED" }]))).toBe("DONE");
  });
});
