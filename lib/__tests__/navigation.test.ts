import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { router } from "expo-router";
import { replacePage, setPageOnShow, showPage } from "../navigation";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: jest.fn(() => true),
    back: jest.fn(),
  },
}));

describe("showing a page", () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(router.replace).mockClear();
    jest.mocked(router.dismissAll).mockClear();
    setPageOnShow("/");
  });

  it("is a step in the history, so back returns to the page left", () => {
    showPage("/mail");
    expect(router.push).toHaveBeenCalledWith("/mail");
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.dismissAll).not.toHaveBeenCalled();
  });

  it("does nothing for the page already on show, however its query is spelled", () => {
    setPageOnShow("/bank?view=spending&filterLabel=A");
    showPage("/bank?filterLabel=A&view=spending");
    expect(router.push).not.toHaveBeenCalled();
    showPage("/bank?view=income");
    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it("leaves no way back to a page that is gone", () => {
    replacePage("/alpaka");
    expect(router.dismissAll).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/alpaka");
    expect(router.push).not.toHaveBeenCalled();
  });
});
