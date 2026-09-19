const response = require("../../config/response");
const { ERROR_CODES } = require("../../shared/contracts/apiContract");

describe("response contract", () => {
  const createRes = () => {
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    return res;
  };

  it("adds stable code for validation errors", () => {
    const res = createRes();
    response.errorResponse(
      res,
      [{ path: "field", msg: "error" }],
      "Validation Error",
      400,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("maps status code to security specific code", () => {
    const res = createRes();
    response.errorResponse(res, { msg: "Denied" }, "Forbidden", 403);

    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe(ERROR_CODES.FORBIDDEN);
  });
});
