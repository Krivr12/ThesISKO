import rateLimiter from "../server/middlewares/rateLimiter.js";

test("Blocks user after exceeding daily limit", async () => {
  const req = { ip: "127.0.0.1", body: { requester: { email: "test@test.com" } } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  for (let i = 0; i < 11; i++) rateLimiter(req, res, next);
  expect(res.status).toHaveBeenCalledWith(429);
});
