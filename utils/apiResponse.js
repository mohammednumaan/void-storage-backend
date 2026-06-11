const apiResponse = (req, res, next) => {
  res.success = (data = null, message = "Success", statusCode = 200) => {
    const body = { success: true, message };
    if (data !== null && data !== undefined) {
      body.data = data;
    }
    return res.status(statusCode).json(body);
  };

  res.fail = (message = "Request failed", statusCode = 400, errors = []) => {
    const body = { success: false, message };
    if (errors?.length > 0) {
      body.errors = errors;
    }
    return res.status(statusCode).json(body);
  };

  next();
};

const isApiRoute = (req) =>
  req.originalUrl.startsWith("/users") ||
  req.originalUrl.startsWith("/file-system");

module.exports = { apiResponse, isApiRoute };
