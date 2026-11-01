import test from "node:test";
import assert from "node:assert/strict";
import {
  codeFromLink,
  errorMessage,
  newProfileFields,
  secureStorageAdapter,
  validateProfile,
} from "../src/lib/core.js";

test("only the registered authentication deep link supplies a bounded code", () => {
  assert.equal(
    codeFromLink("mlezicare://auth?code=example-code"),
    "example-code",
  );
  for (const url of [
    "https://evil.test/auth?code=example",
    "mlezicare://evil?code=example",
    "mlezicare://auth/other?code=example",
    "mlezicare://user:password@auth?code=example",
    "not a URL",
    "mlezicare://auth",
    `mlezicare://auth?code=${"x".repeat(2049)}`,
  ])
    assert.equal(codeFromLink(url), null);
});
test("identity uploads and explicit comparison consent are required for new caregivers", () => {
  const fields = {
    ...newProfileFields({}),
    name: "Example Caregiver",
    phone: "+254700000000",
    service_types: ["live_in"],
  };
  const images = { photo: {}, national_id: {}, selfie: {} };
  assert.match(validateProfile(fields, {}, true, true), /photo/);
  assert.match(validateProfile(fields, images, true, false), /permission/);
  assert.equal(validateProfile(fields, images, true, true), null);
  assert.equal(validateProfile(fields, {}, false, false), null);
  assert.match(
    validateProfile(
      { ...fields, service_category: "other" },
      images,
      true,
      true,
    ),
    /Describe/,
  );
  assert.match(
    validateProfile(
      { ...fields, expected_pay_min: "1000", expected_pay_max: "500" },
      images,
      true,
      true,
    ),
    /Minimum pay/,
  );
});
test("authentication storage delegates all persistence and deletion to SecureStore", async () => {
  const values = new Map(),
    events = [];
  const adapter = secureStorageAdapter({
    async getItemAsync(k) {
      events.push("read");
      return values.get(k) ?? null;
    },
    async setItemAsync(k, v) {
      events.push("write");
      values.set(k, v);
    },
    async deleteItemAsync(k) {
      events.push("delete");
      values.delete(k);
    },
  });
  await adapter.setItem("session", "test-placeholder");
  assert.equal(await adapter.getItem("session"), "test-placeholder");
  await adapter.removeItem("session");
  assert.equal(await adapter.getItem("session"), null);
  assert.deepEqual(events, ["write", "read", "delete", "read"]);
});
test("authentication errors are helpful without exposing arbitrary internal errors", () => {
  assert.match(errorMessage(new Error("InvalidSecret")), /incorrect/);
  assert.match(errorMessage(new Error("network fetch failed")), /internet/);
  assert.equal(
    errorMessage(new Error("private internal detail")),
    "Unable to complete this request. Please try again.",
  );
  assert.equal(
    errorMessage({ data: "Choose a supported image." }),
    "Choose a supported image.",
  );
});
