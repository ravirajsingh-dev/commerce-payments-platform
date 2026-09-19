const {
  PASSWORD_MIN_LENGTH,
  PASSWORD_ALLOWED_REGEX,
} = require("../../shared/constants/passwordPolicy");

describe("password policy", () => {
  it("enforces minimum length 8", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it("accepts valid password characters and length", () => {
    expect(PASSWORD_ALLOWED_REGEX.test("StrongPwd1!")).toBe(true);
  });

  it("rejects too short password", () => {
    expect(PASSWORD_ALLOWED_REGEX.test("A1!a")).toBe(false);
  });

  it("rejects disallowed characters", () => {
    expect(PASSWORD_ALLOWED_REGEX.test("Invalid पासword1!")).toBe(false);
  });
});
