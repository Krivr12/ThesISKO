import { validateRequest } from "../server/middlewares/requestValidator.js";

test("Rejects missing email in request", () => {
  const req = { body: { requester: {}, userType: "student" } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  validateRequest(req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
});
